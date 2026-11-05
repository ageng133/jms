package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/internal/delivery/http/middleware"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/jms-uts/backend/gateway/internal/usecase"
	"github.com/jms-uts/backend/gateway/pkg/response"
)

type SubmissionHandler struct {
	usecase        usecase.SubmissionUsecase
	storageClient  domain.StorageClient
	maxUploadBytes int64
}

func NewSubmissionHandler(usecase usecase.SubmissionUsecase, storageClient domain.StorageClient, maxUploadBytes int64) *SubmissionHandler {
	if maxUploadBytes <= 0 {
		maxUploadBytes = 50 << 20 // 50 MB
	}
	return &SubmissionHandler{usecase: usecase, storageClient: storageClient, maxUploadBytes: maxUploadBytes}
}

// actorFrom builds the authenticated actor set by the auth middleware.
func actorFrom(c *gin.Context) usecase.Actor {
	userID, _ := c.Get(middleware.ContextUserIDKey)
	role, _ := c.Get(middleware.ContextRoleKey)
	actor := usecase.Actor{}
	if id, ok := userID.(uuid.UUID); ok {
		actor.UserID = id
	}
	if r, ok := role.(domain.Role); ok {
		actor.Role = r
	}
	return actor
}

// writeUsecaseError maps domain sentinel errors to HTTP status codes.
func writeUsecaseError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		response.NotFound(c, "Resource not found")
	case errors.Is(err, domain.ErrForbidden):
		response.Forbidden(c, "You do not have access to this resource")
	case errors.Is(err, domain.ErrInvalidInput):
		response.BadRequest(c, err.Error(), "")
	default:
		response.InternalError(c, err.Error())
	}
}

type CreateDraftRequest struct {
	Title    string   `json:"title" binding:"required"`
	Abstract string   `json:"abstract" binding:"required"`
	Keywords []string `json:"keywords" binding:"required"`
}

type PresignRequest struct {
	Filename string          `json:"filename" binding:"required"`
	FileType domain.FileType `json:"file_type" binding:"required,oneof=PDF DOCX LATEX_ZIP"`
	FileRole string          `json:"file_role"` // "MANUSCRIPT" or "TEMPLATE"
}

type FileMetaRequest struct {
	FileType         domain.FileType `json:"file_type" binding:"required,oneof=PDF DOCX LATEX_ZIP"`
	S3Key            string          `json:"s3_key" binding:"required"`
	OriginalFilename string          `json:"original_filename" binding:"required"`
	FileSizeBytes    int64           `json:"file_size_bytes" binding:"required,gt=0"`
	FileRole         string          `json:"file_role"`
}

type ConfirmRequest struct {
	// Backward compatibility single-file fields
	FileType         domain.FileType `json:"file_type"`
	S3Key            string          `json:"s3_key"`
	OriginalFilename string          `json:"original_filename"`
	FileSizeBytes    int64           `json:"file_size_bytes"`
	// Dual-file support
	DraftFile    *FileMetaRequest `json:"draft_file"`
	TemplateFile *FileMetaRequest `json:"template_file"`
	// Built-in layout used when no template PDF is uploaded (default: ieee)
	TemplatePreset string `json:"template_preset"`
}

func (h *SubmissionHandler) CreateDraft(c *gin.Context) {
	authorID := c.MustGet(middleware.ContextUserIDKey).(uuid.UUID)

	var req CreateDraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid draft submission payload", err.Error())
		return
	}

	manuscript, err := h.usecase.CreateDraftManuscript(c.Request.Context(), authorID, req.Title, req.Abstract, req.Keywords)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, manuscript)
}

func (h *SubmissionHandler) GetManuscript(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(c, "Invalid manuscript UUID", err.Error())
		return
	}

	manuscript, err := h.usecase.GetManuscript(c.Request.Context(), actorFrom(c), id)
	if err != nil {
		writeUsecaseError(c, err)
		return
	}

	response.Success(c, http.StatusOK, manuscript)
}

func (h *SubmissionHandler) ListManuscripts(c *gin.Context) {
	role := c.MustGet(middleware.ContextRoleKey).(domain.Role)
	userID := c.MustGet(middleware.ContextUserIDKey).(uuid.UUID)

	if role == domain.RoleEditor || role == domain.RoleAdmin {
		list, err := h.usecase.ListAllManuscripts(c.Request.Context())
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}
		response.Success(c, http.StatusOK, list)
		return
	}

	list, err := h.usecase.ListManuscriptsByAuthor(c.Request.Context(), userID)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	response.Success(c, http.StatusOK, list)
}

// Step 1: Client requests presigned upload URL
func (h *SubmissionHandler) RequestUploadURL(c *gin.Context) {
	idStr := c.Param("id")
	manuscriptID, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(c, "Invalid manuscript UUID", err.Error())
		return
	}

	var req PresignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid presign payload", err.Error())
		return
	}

	result, err := h.usecase.RequestUploadURL(c.Request.Context(), actorFrom(c), manuscriptID, req.Filename, req.FileType, req.FileRole)
	if err != nil {
		writeUsecaseError(c, err)
		return
	}

	response.Success(c, http.StatusOK, result)
}

// Step 2 & 3: Client confirms upload -> Gateway commits DB and pushes to Redis queue:ai_audit
func (h *SubmissionHandler) ConfirmSubmission(c *gin.Context) {
	idStr := c.Param("id")
	manuscriptID, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(c, "Invalid manuscript UUID", err.Error())
		return
	}

	var req ConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid confirmation payload", err.Error())
		return
	}

	var draftDTO *usecase.FileUploadMetaDTO
	if req.DraftFile != nil {
		draftDTO = &usecase.FileUploadMetaDTO{
			FileType:         req.DraftFile.FileType,
			S3Key:            req.DraftFile.S3Key,
			OriginalFilename: req.DraftFile.OriginalFilename,
			FileSizeBytes:    req.DraftFile.FileSizeBytes,
			FileRole:         req.DraftFile.FileRole,
		}
	}

	var templateDTO *usecase.FileUploadMetaDTO
	if req.TemplateFile != nil {
		templateDTO = &usecase.FileUploadMetaDTO{
			FileType:         req.TemplateFile.FileType,
			S3Key:            req.TemplateFile.S3Key,
			OriginalFilename: req.TemplateFile.OriginalFilename,
			FileSizeBytes:    req.TemplateFile.FileSizeBytes,
			FileRole:         domain.FileRoleTemplate,
		}
	}

	dto := usecase.ConfirmSubmissionDTO{
		ManuscriptID:     manuscriptID,
		FileType:         req.FileType,
		S3Key:            req.S3Key,
		OriginalFilename: req.OriginalFilename,
		FileSizeBytes:    req.FileSizeBytes,
		DraftFile:        draftDTO,
		TemplateFile:     templateDTO,
		TemplatePreset:   req.TemplatePreset,
	}

	result, err := h.usecase.ConfirmSubmission(c.Request.Context(), actorFrom(c), dto)
	if err != nil {
		writeUsecaseError(c, err)
		return
	}

	response.Success(c, http.StatusAccepted, result)
}

// ListTemplatePresets returns the built-in journal layouts (Template Vault).
func (h *SubmissionHandler) ListTemplatePresets(c *gin.Context) {
	response.Success(c, http.StatusOK, gin.H{
		"default_id": domain.DefaultTemplatePresetID,
		"presets":    domain.TemplatePresets(),
	})
}

// GetAuditReport returns an audit by audit ID or manuscript ID (latest audit).
// The body is the stored audit plus fields used by the comparison UI:
// original_pdf_s3_key, fixed_layout (only when the reshape step really ran),
// ai_engine and ai_mode (derived from the engine that produced the report).
func (h *SubmissionHandler) GetAuditReport(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid audit or manuscript UUID", err.Error())
		return
	}

	audit, err := h.usecase.GetAuditReport(c.Request.Context(), actorFrom(c), targetID)
	if err != nil {
		writeUsecaseError(c, err)
		return
	}

	raw, err := json.Marshal(audit)
	if err != nil {
		response.InternalError(c, "Failed to encode audit")
		return
	}
	payload := map[string]any{}
	_ = json.Unmarshal(raw, &payload)
	payload["audit_id"] = audit.ID.String()

	if file, ferr := h.usecase.GetManuscriptFile(c.Request.Context(), audit.ManuscriptFileID); ferr == nil && file != nil {
		payload["original_pdf_s3_key"] = file.S3Key
	}

	if len(audit.TemplateSpecs) > 0 {
		var specs struct {
			FixedLayout json.RawMessage `json:"fixed_layout"`
		}
		if json.Unmarshal(audit.TemplateSpecs, &specs) == nil && len(specs.FixedLayout) > 0 && string(specs.FixedLayout) != "null" {
			payload["fixed_layout"] = specs.FixedLayout
		}
	}

	engine := ""
	if audit.Engine != nil {
		engine = *audit.Engine
	}
	switch {
	case strings.HasPrefix(engine, "gemini"):
		payload["ai_engine"] = "Google Gemini (" + strings.TrimPrefix(engine, "gemini:") + ")"
		payload["ai_mode"] = "LIVE_GEMINI_AI"
	case engine != "":
		payload["ai_engine"] = "PyMuPDF Geometry Engine"
		payload["ai_mode"] = "PYMUPDF_WORKER"
	}

	response.Success(c, http.StatusOK, payload)
}

type UpdateStatusRequest struct {
	Status domain.ManuscriptStatus `json:"status" binding:"required"`
}

func (h *SubmissionHandler) UpdateStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(c, "Invalid manuscript UUID", err.Error())
		return
	}

	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid status payload", err.Error())
		return
	}

	if err := h.usecase.UpdateManuscriptStatus(c.Request.Context(), id, req.Status); err != nil {
		writeUsecaseError(c, err)
		return
	}

	response.Success(c, http.StatusOK, gin.H{"id": id, "status": req.Status})
}

// Direct upload to Box.com (or local Box cache).
// Only the manuscript owner may upload, only under raw/{manuscript_id}/,
// with a size cap and a PDF signature check for .pdf keys.
func (h *SubmissionHandler) DirectFileUpload(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		key = c.PostForm("key")
	}
	if key == "" {
		response.BadRequest(c, "Missing file key query parameter", "")
		return
	}

	if err := h.usecase.AuthorizeFileAccess(c.Request.Context(), actorFrom(c), key, true); err != nil {
		writeUsecaseError(c, err)
		return
	}

	// Hard cap on the request body (+1 MB slack for multipart framing).
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, h.maxUploadBytes+(1<<20))

	var fileData []byte
	var err error

	// 1. Try reading from multipart file
	if strings.HasPrefix(c.ContentType(), "multipart/") {
		fileHeader, fileErr := c.FormFile("file")
		if fileErr != nil {
			response.BadRequest(c, "Invalid multipart upload", fileErr.Error())
			return
		}
		src, openErr := fileHeader.Open()
		if openErr != nil {
			response.BadRequest(c, "Failed to read uploaded file", openErr.Error())
			return
		}
		defer src.Close()
		fileData, err = io.ReadAll(io.LimitReader(src, h.maxUploadBytes+1))
	} else {
		// 2. Otherwise read raw request body (PUT direct stream)
		fileData, err = io.ReadAll(c.Request.Body)
	}

	if err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			response.Error(c, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE",
				fmt.Sprintf("File exceeds the %d MB upload limit", h.maxUploadBytes>>20), "")
			return
		}
		response.BadRequest(c, "Failed to read upload body", err.Error())
		return
	}
	if int64(len(fileData)) > h.maxUploadBytes {
		response.Error(c, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE",
			fmt.Sprintf("File exceeds the %d MB upload limit", h.maxUploadBytes>>20), "")
		return
	}
	if len(fileData) == 0 {
		response.BadRequest(c, "Empty file payload", "")
		return
	}
	if strings.EqualFold(filepath.Ext(key), ".pdf") && !bytes.HasPrefix(fileData, []byte("%PDF-")) {
		response.BadRequest(c, "Uploaded file is not a valid PDF document", "")
		return
	}

	if err := h.storageClient.SaveFile(c.Request.Context(), key, fileData); err != nil {
		response.InternalError(c, "Failed to save file to Box storage: "+err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{
		"message": "File uploaded successfully to Box storage",
		"key":     key,
		"bytes":   len(fileData),
	})
}

// Direct file download from Box storage (owner or editorial staff only).
func (h *SubmissionHandler) DirectFileDownload(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		response.BadRequest(c, "Missing file key query parameter", "")
		return
	}

	if err := h.usecase.AuthorizeFileAccess(c.Request.Context(), actorFrom(c), key, false); err != nil {
		writeUsecaseError(c, err)
		return
	}

	data, err := h.storageClient.GetFile(c.Request.Context(), key)
	if err != nil {
		response.NotFound(c, "File not found in Box storage")
		return
	}

	contentType := mime.TypeByExtension(strings.ToLower(filepath.Ext(key)))
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	c.Header("Content-Disposition", mime.FormatMediaType("inline", map[string]string{"filename": filepath.Base(key)}))
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", "private, no-store")
	c.Data(http.StatusOK, contentType, data)
}

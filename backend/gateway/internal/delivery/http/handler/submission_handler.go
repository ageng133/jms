package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jms-uts/backend/gateway/internal/delivery/http/middleware"
	"github.com/jms-uts/backend/gateway/internal/domain"
	"github.com/jms-uts/backend/gateway/internal/usecase"
	"github.com/jms-uts/backend/gateway/pkg/response"
)

type SubmissionHandler struct {
	usecase usecase.SubmissionUsecase
}

func NewSubmissionHandler(usecase usecase.SubmissionUsecase) *SubmissionHandler {
	return &SubmissionHandler{usecase: usecase}
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
	FileType         domain.FileType  `json:"file_type"`
	S3Key            string           `json:"s3_key"`
	OriginalFilename string           `json:"original_filename"`
	FileSizeBytes    int64            `json:"file_size_bytes"`
	// Dual-file support
	DraftFile        *FileMetaRequest `json:"draft_file"`
	TemplateFile     *FileMetaRequest `json:"template_file"`
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

	manuscript, err := h.usecase.GetManuscript(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Manuscript not found")
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

	result, err := h.usecase.RequestUploadURL(c.Request.Context(), manuscriptID, req.Filename, req.FileType, req.FileRole)
	if err != nil {
		response.BadRequest(c, err.Error(), "")
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
	}

	result, err := h.usecase.ConfirmSubmission(c.Request.Context(), dto)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}

	response.Success(c, http.StatusAccepted, result)
}

// Query audit outcome
func (h *SubmissionHandler) GetAuditReport(c *gin.Context) {
	idStr := c.Param("id")
	auditID, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(c, "Invalid audit UUID", err.Error())
		return
	}

	audit, err := h.usecase.GetAuditReport(c.Request.Context(), auditID)
	if err != nil {
		response.NotFound(c, "Audit report not found")
		return
	}

	response.Success(c, http.StatusOK, audit)
}


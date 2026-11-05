// Package auditengine talks to the Python PyMuPDF audit worker over HTTP
// (backend/ai-worker, `python -m app.server`).
package auditengine

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/jms-uts/backend/gateway/internal/domain"
)

type WorkerClient struct {
	baseURL    string
	token      string
	httpClient *http.Client
}

func NewWorkerClient(baseURL, token string, timeout time.Duration) *WorkerClient {
	if timeout <= 0 {
		timeout = 3 * time.Minute
	}
	return &WorkerClient{
		baseURL:    strings.TrimRight(baseURL, "/"),
		token:      token,
		httpClient: &http.Client{Timeout: timeout},
	}
}

func (w *WorkerClient) Name() string { return "pymupdf-worker" }

// Ping checks the worker's /healthz endpoint (implements domain.EnginePinger).
func (w *WorkerClient) Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, w.baseURL+"/healthz", nil)
	if err != nil {
		return err
	}
	resp, err := w.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("worker healthz returned %d", resp.StatusCode)
	}
	return nil
}

type workerResponse struct {
	Report struct {
		Engine  string `json:"engine"`
		Modules struct {
			GeometryAndLayout struct {
				Checks []domain.GeometryCheck `json:"checks"`
			} `json:"geometry_and_layout"`
			Anonymization struct {
				LeaksFound []domain.AnonymizationLeak `json:"leaks_found"`
			} `json:"anonymization"`
			CitationCrosscheck domain.CitationResult `json:"citation_crosscheck"`
		} `json:"modules"`
		TemplateSpecs domain.TemplateSpecs `json:"template_specs"`
	} `json:"report"`
	AnnotatedPDFBase64 *string `json:"annotated_pdf_base64"`
}

func (w *WorkerClient) Audit(ctx context.Context, in domain.AuditInput) (*domain.AuditOutput, error) {
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)

	if err := addFile(mw, "manuscript", "manuscript.pdf", in.Draft); err != nil {
		return nil, err
	}
	if len(in.Template) > 0 {
		if err := addFile(mw, "template", "template.pdf", in.Template); err != nil {
			return nil, err
		}
	}
	specsJSON, _ := json.Marshal(in.Specs)
	if err := mw.WriteField("template_specs", string(specsJSON)); err != nil {
		return nil, err
	}
	if err := mw.Close(); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, w.baseURL+"/v1/audit", &body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	if w.token != "" {
		req.Header.Set("X-Worker-Token", w.token)
	}

	resp, err := w.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("audit worker unreachable at %s: %w", w.baseURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		detail := extractDetail(msg)
		if resp.StatusCode == http.StatusUnprocessableEntity {
			return nil, fmt.Errorf("%w: %s", domain.ErrInvalidDocument, detail)
		}
		return nil, fmt.Errorf("audit worker returned %d: %s", resp.StatusCode, detail)
	}

	var wr workerResponse
	if err := json.NewDecoder(resp.Body).Decode(&wr); err != nil {
		return nil, fmt.Errorf("decode audit worker response: %w", err)
	}

	out := &domain.AuditOutput{
		Engine: w.Name(),
		Findings: domain.AuditFindings{
			Checks:        wr.Report.Modules.GeometryAndLayout.Checks,
			Leaks:         wr.Report.Modules.Anonymization.LeaksFound,
			Citation:      wr.Report.Modules.CitationCrosscheck,
			TemplateSpecs: wr.Report.TemplateSpecs,
		},
	}
	if wr.AnnotatedPDFBase64 != nil && *wr.AnnotatedPDFBase64 != "" {
		pdf, err := base64.StdEncoding.DecodeString(*wr.AnnotatedPDFBase64)
		if err != nil {
			return nil, fmt.Errorf("decode annotated pdf: %w", err)
		}
		out.AnnotatedPDF = pdf
	}
	return out, nil
}

func addFile(mw *multipart.Writer, field, filename string, data []byte) error {
	part, err := mw.CreateFormFile(field, filename)
	if err != nil {
		return err
	}
	_, err = part.Write(data)
	return err
}

func extractDetail(body []byte) string {
	var v struct {
		Detail any `json:"detail"`
	}
	if json.Unmarshal(body, &v) == nil && v.Detail != nil {
		return fmt.Sprint(v.Detail)
	}
	return strings.TrimSpace(string(body))
}

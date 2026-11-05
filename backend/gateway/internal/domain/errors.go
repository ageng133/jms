package domain

import "errors"

// Sentinel errors returned by usecases. HTTP handlers map them to status codes
// with errors.Is, so wrap them with fmt.Errorf("...: %w", ErrX) to add context.
var (
	ErrNotFound     = errors.New("resource not found")
	ErrForbidden    = errors.New("access denied")
	ErrInvalidInput = errors.New("invalid input")
	ErrUnauthorized = errors.New("unauthorized")

	// ErrInvalidDocument: an audit engine rejected the PDF itself (corrupt,
	// encrypted, empty). Trying another engine will not help.
	ErrInvalidDocument = errors.New("invalid document")
)

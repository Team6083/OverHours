package transport

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	kithttp "github.com/go-kit/kit/transport/http"

	internalErrors "github.com/Team6083/OverHours/internal/errors"
)

var (
	ErrMissingParam = errors.New("missing parameter")
)

func NewMissingParam(msg string) error {
	return fmt.Errorf("%w: %s", ErrMissingParam, msg)
}

func formatError(err error) (int, string) {
	var syntaxError *json.SyntaxError
	switch {
	case errors.Is(err, ErrMissingParam):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, internalErrors.ErrNotFound):
		return http.StatusNotFound, err.Error()
	case errors.Is(err, internalErrors.ErrInvalidArguments):
		return http.StatusBadRequest, err.Error()
	case errors.As(err, &syntaxError):
		return http.StatusBadRequest, fmt.Sprintf("json decode error: %s", syntaxError)
	default:
		return http.StatusInternalServerError, "internal server error"
	}
}

type ErrorWrapper struct {
	Error string `json:"error"`
}

func NewErrorEncoder() kithttp.ErrorEncoder {
	return encodeError
}

func encodeError(ctx context.Context, inputErr error, w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	httpStatus, errorMessage := formatError(inputErr)
	w.WriteHeader(httpStatus)

	err := json.NewEncoder(w).Encode(ErrorWrapper{
		Error: errorMessage,
	})
	if err != nil {
		fmt.Println(err)
		return
	}
}

func EncodeHTTPGenericRequest(_ context.Context, r *http.Request, request interface{}) error {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(request); err != nil {
		return err
	}
	r.Body = io.NopCloser(&buf)
	return nil
}

func EncodeHTTPGenericResponse(ctx context.Context, w http.ResponseWriter, response interface{}) error {
	return json.NewEncoder(w).Encode(response)
}

func DecodeError(_ context.Context, r *http.Response) error {
	if r.StatusCode != http.StatusOK {
		var errorResp ErrorWrapper
		if err := json.NewDecoder(r.Body).Decode(&errorResp); err != nil {
			return errors.New(r.Status)
		}

		return fmt.Errorf("%s: %s\n", r.Status, errorResp.Error)
	}

	return nil
}

func DecodeHTTPGenericRequestFromJson(_ context.Context, r *http.Request, req interface{}) (interface{}, error) {
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		return nil, err
	}

	return req, nil
}

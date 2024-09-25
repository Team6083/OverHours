package transport

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/go-kit/kit/endpoint"
	kithttp "github.com/go-kit/kit/transport/http"
)

var (
	ErrMissingParam = errors.New("missing parameter")
)

func formatError(err error) (int, string) {
	var syntaxError *json.SyntaxError
	switch {
	case errors.Is(err, ErrMissingParam):
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

	var httpStatus int
	var errorMessage string

	if isBusinessError, ok := ctx.Value("is_business_error").(bool); ok && isBusinessError {
		httpStatus = http.StatusBadRequest
		errorMessage = inputErr.Error()
	} else {
		httpStatus, errorMessage = formatError(inputErr)
	}

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
	if f, ok := response.(endpoint.Failer); ok && f.Failed() != nil {
		ctx = context.WithValue(ctx, "is_business_error", true)
		encodeError(ctx, f.Failed(), w)
		return nil
	}

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

package punchclock

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/go-chi/chi/v5"
	"net/http"

	internalError "github.com/Team6083/OverHours/internal/errors"
	kitlog "github.com/go-kit/kit/log"
	"github.com/go-kit/kit/transport"
	kithttp "github.com/go-kit/kit/transport/http"
)

func MakeHTTPHandler(svc Service, logger kitlog.Logger) http.Handler {
	opts := []kithttp.ServerOption{
		kithttp.ServerErrorHandler(transport.NewLogErrorHandler(logger)),
		kithttp.ServerErrorEncoder(encodeError),
	}

	punchInHandler := kithttp.NewServer(
		makePunchInEndpoint(svc),
		func(ctx context.Context, r *http.Request) (interface{}, error) {
			var req punchInRequest
			return decodeRequestFromJson(ctx, r, &req)
		},
		encodeResponse,
		opts...,
	)

	punchOutHandler := kithttp.NewServer(
		makePunchOutEndpoint(svc),
		func(ctx context.Context, r *http.Request) (interface{}, error) {
			var req punchOutRequest
			return decodeRequestFromJson(ctx, r, &req)
		},
		encodeResponse,
		opts...,
	)

	lockHandler := kithttp.NewServer(
		makeLockEndpoint(svc),
		func(ctx context.Context, r *http.Request) (interface{}, error) {
			var req lockRequest
			return decodeRequestFromJson(ctx, r, &req)
		},
		encodeResponse,
		opts...,
	)

	getTimeLogsHandler := kithttp.NewServer(
		makeGetTimeLogsEndpoint(svc),
		func(ctx context.Context, r *http.Request) (interface{}, error) {
			var req getTimeLogsRequest
			return req, nil
		},
		encodeResponse,
		opts...,
	)

	r := chi.NewRouter()
	r.Post("/punchIn", punchInHandler.ServeHTTP)
	r.Post("/punchOut", punchOutHandler.ServeHTTP)
	r.Post("/lock", lockHandler.ServeHTTP)
	r.Get("/timeLogs", getTimeLogsHandler.ServeHTTP)

	return r
}

func decodeRequestFromJson(_ context.Context, r *http.Request, req interface{}) (interface{}, error) {
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		return nil, err
	}

	return req, nil
}

func encodeResponse(_ context.Context, w http.ResponseWriter, response interface{}) error {
	return json.NewEncoder(w).Encode(response)
}

func parseError(err error) (string, int) {
	var syntaxError *json.SyntaxError
	switch {
	case errors.Is(err, ErrMissingParam):
		return err.Error(), http.StatusBadRequest
	case errors.Is(err, internalError.ErrInvalidArguments):
		return err.Error(), http.StatusBadRequest
	case errors.As(err, &syntaxError):
		return fmt.Sprintf("json decode error: %s", syntaxError), http.StatusBadRequest
	default:
		return "internal error", http.StatusInternalServerError
	}
}

func encodeError(_ context.Context, inputErr error, w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	msg, httpCode := parseError(inputErr)
	w.WriteHeader(httpCode)

	err := json.NewEncoder(w).Encode(map[string]interface{}{
		"error": msg,
	})
	if err != nil {
		fmt.Println(err)
		return
	}
}

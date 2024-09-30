package punchclock

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	kitlog "github.com/go-kit/kit/log"
	kittransport "github.com/go-kit/kit/transport"
	kithttp "github.com/go-kit/kit/transport/http"

	"github.com/Team6083/OverHours/internal/kitutil/transport"
)

func MakeHTTPHandler(svc Service, logger kitlog.Logger) http.Handler {
	errorEncoder := transport.NewErrorEncoder()

	opts := []kithttp.ServerOption{
		kithttp.ServerErrorHandler(kittransport.NewLogErrorHandler(logger)),
		kithttp.ServerErrorEncoder(errorEncoder),
	}

	punchInHandler := kithttp.NewServer(
		makePunchInEndpoint(svc),
		func(ctx context.Context, r *http.Request) (interface{}, error) {
			var req punchInRequest
			return transport.DecodeHTTPGenericRequestFromJson(ctx, r, req)
		},
		transport.EncodeHTTPGenericResponse,
		opts...,
	)

	punchOutHandler := kithttp.NewServer(
		makePunchOutEndpoint(svc),
		func(ctx context.Context, r *http.Request) (interface{}, error) {
			var req punchOutRequest
			return transport.DecodeHTTPGenericRequestFromJson(ctx, r, &req)
		},
		transport.EncodeHTTPGenericResponse,
		opts...,
	)

	lockHandler := kithttp.NewServer(
		makeLockEndpoint(svc),
		func(ctx context.Context, r *http.Request) (interface{}, error) {
			var req lockRequest
			return transport.DecodeHTTPGenericRequestFromJson(ctx, r, &req)
		},
		transport.EncodeHTTPGenericResponse,
		opts...,
	)

	getTimeLogsHandler := kithttp.NewServer(
		makeGetTimeLogsEndpoint(svc),
		func(ctx context.Context, r *http.Request) (interface{}, error) {
			var req getTimeLogsRequest
			if r.URL.Query().Has("userId") {
				req.UserID = r.URL.Query().Get("userId")
			}

			if r.URL.Query().Has("status") {
				req.Status = r.URL.Query().Get("status")
			}

			return &req, nil
		},
		transport.EncodeHTTPGenericResponse,
		opts...,
	)

	r := chi.NewRouter()
	r.Post("/punchIn", punchInHandler.ServeHTTP)
	r.Post("/punchOut", punchOutHandler.ServeHTTP)
	r.Post("/lock", lockHandler.ServeHTTP)
	r.Get("/timeLogs", getTimeLogsHandler.ServeHTTP)

	return r
}

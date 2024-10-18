package identity

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

	r := chi.NewRouter()
	r.Route("/user", newUserRouteHandler(svc, opts))

	return r
}

func newUserRouteHandler(svc Service, opts []kithttp.ServerOption) func(r chi.Router) {
	createUser := kithttp.NewServer(
		makeCreateUserEndpoint(svc),
		func(ctx context.Context, r *http.Request) (interface{}, error) {
			var req createUserRequest
			return transport.DecodeHTTPGenericRequestFromJson(ctx, r, &req)
		},
		transport.EncodeHTTPGenericResponse,
		opts...,
	)

	getUser := kithttp.NewServer(
		makeGetUserEndpoint(svc),
		func(ctx context.Context, r *http.Request) (interface{}, error) {
			var req getUserRequest

			id := chi.URLParam(r, "id")
			req.ID = id

			return transport.DecodeHTTPGenericRequestFromJson(ctx, r, &req)
		},
		transport.EncodeHTTPGenericResponse,
		opts...,
	)

	getAllUsers := kithttp.NewServer(
		makeGetAllUsersEndpoint(svc),
		func(ctx context.Context, r *http.Request) (interface{}, error) {
			var req getAllUsersRequest
			return req, nil
		},
		transport.EncodeHTTPGenericResponse,
		opts...,
	)

	return func(r chi.Router) {
		r.Get("/", getAllUsers.ServeHTTP)
		r.Post("/", createUser.ServeHTTP)
		r.Get("/{id}", getUser.ServeHTTP)
	}
}

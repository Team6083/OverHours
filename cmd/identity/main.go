package main

import (
	"crypto/ed25519"
	"encoding/base64"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-kit/kit/log"

	"github.com/Team6083/OverHours/pkgs/identity"
)

func getEd25519PrivateKey(base64EncodedKey string) ed25519.PrivateKey {
	decoded, err := base64.StdEncoding.DecodeString(base64EncodedKey)
	if err != nil {
		panic(err)
	}

	return ed25519.PrivateKey(decoded)
}

func main() {
	var err error

	var logger log.Logger
	{
		logger = log.NewLogfmtLogger(os.Stderr)
		logger = log.With(logger, "ts", log.DefaultTimestampUTC)
		logger = log.With(logger, "caller", log.DefaultCaller)
	}
	httpLogger := log.With(logger, "component", "http")

	signingKey := getEd25519PrivateKey(os.Getenv("signingKey"))

	userRepo := identity.NewInMemUserRepository()
	svc := identity.NewService(userRepo, &signingKey)

	r := chi.NewRouter()
	r.Mount("/v1", identity.MakeHTTPHandler(svc, httpLogger))

	err = logger.Log("msg", "HTTP", "addr", ":8081")
	if err != nil {
		panic(err)
	}
	err = logger.Log("err", http.ListenAndServe(":8081", r))
	if err != nil {
		panic(err)
	}
}

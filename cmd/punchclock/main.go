package main

import (
	"github.com/Team6083/OverHours/pkgs/punchclock"
	"github.com/go-chi/chi/v5"
	"github.com/go-kit/kit/log"
	"net/http"
	"os"
)

func main() {
	var err error

	var logger log.Logger
	{
		logger = log.NewLogfmtLogger(os.Stderr)
		logger = log.With(logger, "ts", log.DefaultTimestampUTC)
		logger = log.With(logger, "caller", log.DefaultCaller)
	}
	httpLogger := log.With(logger, "component", "http")

	eventRepo := punchclock.NewInMemEventRepository()
	svc := punchclock.NewService(eventRepo)

	r := chi.NewRouter()
	r.Mount("/v1", punchclock.MakeHTTPHandler(svc, httpLogger))

	err = logger.Log("msg", "HTTP", "addr", ":8081")
	if err != nil {
		panic(err)
	}
	err = logger.Log("err", http.ListenAndServe(":8081", r))
	if err != nil {
		panic(err)
	}
}

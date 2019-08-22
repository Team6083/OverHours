package web

import (
	"fmt"
	"github.com/gorilla/mux"
	"net/http"
)

func (web *Web) apiHandler() *mux.Router {
	router := mux.NewRouter().StrictSlash(true)

	for _, route := range web.GetAPIRoutes() {
		var handler http.Handler
		handler = route.HandlerFunc
		handler = Logger(handler, route.Name)

		router.
			Methods(route.Method).
			Path(fmt.Sprintf("/api%s", route.Pattern)).
			Name(route.Name).
			Handler(handler)

	}

	return router
}

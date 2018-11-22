package web

import (
	"bytes"
	"fmt"
	"github.com/gorilla/mux"
	"log"
	"net/http"
)

type Web struct {
}

func NewWeb() *Web {
	web := &Web{}
	return web
}

func handleWebErr(w http.ResponseWriter, err error) {
	http.Error(w, "Internal server error: "+err.Error(), 500)
}

func (web *Web) ServeWebInterface(webPort int) {

	//go web.ServeSocketInterface(8000)

	http.Handle("/res/", http.StripPrefix("/res/", http.FileServer(http.Dir("res/"))))
	//http.Handle("/", web.newHandler())

	// Start Server
	log.Printf("Serving HTTP requests on port %d", webPort)
	log.Print(fmt.Sprintf(":%d", webPort))
	http.ListenAndServe(fmt.Sprintf(":%d", webPort), nil)
}

func (web *Web) newHandler() http.Handler {
	router := mux.NewRouter()
	router.HandleFunc("/", web.IndexHandler).Methods("GET")
	return router
}

func (web *Web) IndexHandler(w http.ResponseWriter, r *http.Request) {
	buffer := new(bytes.Buffer)
	//template.Index("Test",buffer)
	w.Write(buffer.Bytes())
}

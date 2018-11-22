package web

import (
	"fmt"
	"github.com/gorilla/mux"
	"github.com/kennhung/OverHours/module"
	"log"
	"net/http"
	"path/filepath"
	"text/template"
)

type Web struct {
	database        *module.Database
	templateHelpers template.FuncMap
}

func NewWeb(database *module.Database) *Web {
	web := &Web{database: database}
	return web
}

func handleWebErr(w http.ResponseWriter, err error) {
	http.Error(w, "Internal server error: "+err.Error(), 500)
}

func (web *Web) ServeWebInterface(webPort int) {
	//go web.ServeSocketInterface(8000)

	web.database.DB.C("session").DropCollection()

	http.Handle("/res/", http.StripPrefix("/res/", http.FileServer(http.Dir("res/"))))
	http.Handle("/", web.newHandler())

	// Start Server
	log.Printf("Serving HTTP requests on port %d", webPort)
	log.Print(fmt.Sprintf(":%d", webPort))
	http.ListenAndServe(fmt.Sprintf(":%d", webPort), nil)
}

func (web *Web) newHandler() http.Handler {
	router := mux.NewRouter()
	router.HandleFunc("/", web.IndexHandler).Methods("GET")
	router.HandleFunc("/login", web.LoginHandler).Methods("GET")
	router.HandleFunc("/login", web.LoginPOST).Methods("POST")
	return router
}

func (web *Web) IndexHandler(w http.ResponseWriter, r *http.Request) {

	sessionToken, err := web.checkAuth(w, r)
	if err != nil {
		handleWebErr(w, err)
		return
	}
	if sessionToken == nil {
		return
	}

	template, err := web.parseFiles("templates/index.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}
	data := struct {
		Response string
	}{"test"}
	err = template.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

// Prepends the base directory to the template filenames.
func (web *Web) parseFiles(filenames ...string) (*template.Template, error) {
	var paths []string
	for _, filename := range filenames {
		paths = append(paths, filepath.Join(".", filename))
	}

	template := template.New("").Funcs(web.templateHelpers)
	return template.ParseFiles(paths...)
}

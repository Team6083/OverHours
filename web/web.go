package web

import (
	"fmt"
	"github.com/gorilla/mux"
	"github.com/kennhung/OverHours/models"
	"log"
	"net/http"
	"path/filepath"
	"text/template"
)

type Web struct {
	database        *models.Database
	templateHelpers template.FuncMap
}

func NewWeb(database *models.Database) *Web {
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

	// Pages
	router.HandleFunc("/", web.IndexHandler).Methods("GET")
	// Auth
	router.HandleFunc("/login", web.LoginHandler).Methods("GET")
	router.HandleFunc("/loginPost", web.LoginPOST).Methods("POST")
	// Student Login
	router.HandleFunc("/student/checkinPost", web.StudentCheckinPOST).Methods("POST")

	return router
}

func (web *Web) IndexHandler(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}
	if session == nil {
		return
	}

	template, err := web.parseFiles("templates/index.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	user, err := web.database.GetUserByName(session.Username)
	if err != nil {
		handleWebErr(w, err)
	}

	data := struct {
		UserName string
	}{"unknown"}

	if user != nil {
		data.UserName = user.Name
	}

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

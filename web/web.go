package web

import (
	"fmt"
	"github.com/Team6083/OverHours/models"
	"github.com/gorilla/mux"
	"gopkg.in/mgo.v2"
	"html/template"
	"log"
	"net/http"
	"path/filepath"
	"reflect"
	"time"
)

type Web struct {
	database        *models.Database
	templateHelpers template.FuncMap
	settings        *models.Setting
}

func avail(name string, data interface{}) bool {
	v := reflect.ValueOf(data)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return false
	}
	return v.FieldByName(name).IsValid()
}

func getSecFromDuration(duration time.Duration) int64 {
	return int64(duration.Seconds())
}

func NewWeb(database *models.Database) *Web {
	web := &Web{database: database}
	web.templateHelpers = template.FuncMap{
		"avail":              avail,
		"getSecFromDuration": getSecFromDuration,
	}

	err := web.readSettings()
	if err != nil {
		panic(err)
	}

	return web
}

func (web *Web) readSettings() error {
	settings, err := web.database.GetSetting()
	if err != nil {
		return err
	}

	web.settings = settings
	return nil
}

func handleWebErr(w http.ResponseWriter, err error) {
	fmt.Printf("Server internal error: %s\n", err)
	http.Error(w, "Internal server error: "+err.Error(), 500)
}

func handleBadRequest(w http.ResponseWriter, err error) {
	http.Error(w, "Bad request error: "+err.Error(), http.StatusBadRequest)
}

func handleForbidden(w http.ResponseWriter, err error) {
	http.Error(w, "Forbidden error: "+err.Error(), http.StatusBadRequest)
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
	router.HandleFunc("/logout", web.LogoutHandler).Methods("GET")
	// Setting
	router.HandleFunc("/settings", web.SettingsGET).Methods("GET")
	router.HandleFunc("/settings/submit", web.SettingsPOST).Methods("POST")
	router.HandleFunc("/settings/renew", web.RenewSettingsGET).Methods("GET")
	// Time Logs
	router.HandleFunc("/timeLog", web.TimeLogGET).Methods("GET")
	router.HandleFunc("/timeLog/datatable", web.TimeLogDatatable).Methods("GET")
	router.HandleFunc("/timeLog/form", web.TimeLogFormGET).Methods("GET")
	router.HandleFunc("/timeLog/form/submit", web.TimeLogFormPOST).Methods("POST")
	router.HandleFunc("/timeLog/checkinPost", web.TimeLogCheckinPOST).Methods("POST")
	router.HandleFunc("/timeLog/checkout", web.TimeLogCheckoutGET).Methods("GET")
	router.HandleFunc("/timeLog/delete/{id}", web.TimeLogDelete).Methods("GET")
	// Meetings
	router.HandleFunc("/meeting", web.MeetingGET).Methods("GET")
	router.HandleFunc("/meeting/detail/{meetId}", web.MeetingDetailGET).Methods("GET")
	router.HandleFunc("/meeting/checkin/{meetId}", web.MeetingCheckinGET).Methods("GET")
	router.HandleFunc("/meeting/checkin/{meetId}/{userId}", web.MeetingCheckinGET).Methods("GET")
	router.HandleFunc("/meeting/form", web.MeetingFormGET).Methods("GET")
	router.HandleFunc("/meeting/form/submit", web.MeetingFormPOST).Methods("POST")
	router.HandleFunc("/meeting/delete/{id}", web.MeetingDeleteGET).Methods("GET")
	router.HandleFunc("/meeting/modify/{meetId}/openCheckin", web.MeetingModifyOpenCheckinGET).Methods("GET")
	router.HandleFunc("/meeting/modify/{meetId}/removeAllLog", web.MeetingModifyRmAllLogGET).Methods("GET")
	router.HandleFunc("/meeting/modify/{meetId}/finish", web.MeetingModifyFinishGET).Methods("GET")

	// Users
	router.HandleFunc("/users", web.UsersGET).Methods("GET")
	router.HandleFunc("/users/form", web.UsersFormGET).Methods("GET")
	router.HandleFunc("/users/form/submit", web.UsersFormPOST).Methods("POST")
	router.HandleFunc("/users/delete/{id}", web.UsersDeleteGET).Methods("GET")

	// Boards
	router.HandleFunc("/board/ranking", web.leaderboardGET).Methods("GET")

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

	user, err := web.database.GetUserByUserName(session.Username)
	if err != nil {
		handleWebErr(w, err)
	}

	names, err := web.database.GetUserNameMap()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	var timeLogs []models.TimeLog
	data := struct {
		UserName      string
		Readonly      string
		Disable       bool
		UserAccName   string
		TimeLogs      []models.TimeLog
		UserNames     map[string]string
		CurrentSeason string
		CanCheckIn    bool
		CanCheckOut   bool
		IncomingMeet  *models.Meeting
	}{"unknown", "readonly", true, "", timeLogs, names, web.settings.SeasonId, false, false, nil}

	if user != nil {
		data.UserName = user.Name
		data.UserAccName = user.Username
		if user.CheckPermissionLevel(models.PermissionLeader) {
			data.Readonly = ""
			data.Disable = false
		}
		timeLogs, err = web.database.GetAllUnfinishedTimeLogs()
		if err != nil && err != mgo.ErrNotFound {
			handleWebErr(w, err)
			return
		}
		data.TimeLogs = timeLogs

		if web.settings.CheckIfCanCheckIn(user) {
			data.CanCheckIn = true
		}

		if web.settings.CheckIfCanCheckOut(user) {
			data.CanCheckOut = true
		}

		lastMeet, err := web.database.GetLastOngoingMeetingsByUserId(user.GetIdentify())
		if err != nil {
			handleWebErr(w, err)
			return
		}

		if lastMeet != nil && lastMeet.CheckIfMeetingCanCheckInNow(user) {
			lastMeetLog, err := web.database.GetLastLogByUserWithSpecificSeason(user.GetIdentify(), lastMeet.GetMeetingLogId())
			if err != nil && err != mgo.ErrNotFound {
				handleWebErr(w, err)
				return
			}

			if lastMeetLog != nil && lastMeetLog.TimeIn != 0 {
				data.IncomingMeet = nil
			} else {
				data.IncomingMeet = lastMeet
			}
		}
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

package web

import (
	"fmt"
	"github.com/Team6083/OverHours/models"
	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
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
	sentry.CaptureException(err)
	http.Error(w, "Internal server error: "+err.Error(), 500)
}

func handleBadRequest(w http.ResponseWriter, err error) {
	http.Error(w, "Bad request error: "+err.Error(), http.StatusBadRequest)
}

func handleForbidden(w http.ResponseWriter, err error) {
	http.Error(w, "Forbidden error: "+err.Error(), http.StatusBadRequest)
}

func (web *Web) ServeWebInterface(webPort int, dsn string) {
	//go web.ServeSocketInterface(8000)

	web.database.DB.C("session").DropCollection()

	err := sentry.Init(sentry.ClientOptions{
		Dsn: dsn,
	})

	if err != nil {
		panic(err)
	}

	sentryHandler := sentryhttp.New(sentryhttp.Options{})

	http.Handle("/res/", http.StripPrefix("/res/", http.FileServer(http.Dir("res/"))))
	http.Handle("/", sentryHandler.Handle(web.newHandler()))

	// Start Server
	log.Printf("Serving HTTP requests on port %d", webPort)
	log.Print(fmt.Sprintf(":%d", webPort))
	http.ListenAndServe(fmt.Sprintf(":%d", webPort), nil)
}

type PageInfo struct {
	path    string
	handler func(http.ResponseWriter, *http.Request)
	methods string
}

func (web *Web) GetPageInfos() []PageInfo {
	pages := make([]PageInfo, 1)
	pages[0] = PageInfo{"/", web.IndexHandler, "GET"}

	pages = append(pages, PageInfo{"/login", web.LoginHandler, "GET"})
	pages = append(pages, PageInfo{"/loginPost", web.LoginPOST, "POST"})
	pages = append(pages, PageInfo{"/logout", web.LogoutHandler, "GET"})

	// Setting
	pages = append(pages, PageInfo{"/settings", web.SettingsGET, "GET"})
	pages = append(pages, PageInfo{"/settings/submit", web.SettingsPOST, "POST"})
	pages = append(pages, PageInfo{"/settings/renew", web.RenewSettingsGET, "GET"})
	//Time Logs
	pages = append(pages, PageInfo{"/timeLog", web.TimeLogGET, "GET"})
	pages = append(pages, PageInfo{"/timeLog/datatable", web.TimeLogDatatable, "GET"})
	pages = append(pages, PageInfo{"/timeLog/form", web.TimeLogFormGET, "GET"})
	pages = append(pages, PageInfo{"/timeLog/form/submit", web.TimeLogFormPOST, "POST"})
	pages = append(pages, PageInfo{"/timeLog/checkinPost", web.TimeLogCheckinPOST, "POST"})
	pages = append(pages, PageInfo{"/timeLog/checkout", web.TimeLogCheckoutGET, "GET"})
	pages = append(pages, PageInfo{"/timeLog/delete/{id}", web.TimeLogDelete, "GET"})
	//Meetings
	pages = append(pages, PageInfo{"/meeting", web.MeetingGET, "GET"})
	pages = append(pages, PageInfo{"/meeting/detail/{meetId}", web.MeetingDetailGET, "GET"})
	pages = append(pages, PageInfo{"/meeting/checkin/{meetId}", web.MeetingCheckinGET, "GET"})
	pages = append(pages, PageInfo{"/meeting/checkin/{meetId}/{userId}", web.MeetingCheckinGET, "GET"})
	pages = append(pages, PageInfo{"/meeting/participant/leave/{meetId}/{userId}", web.MeetingParticipantLeaveGET, "GET"})
	pages = append(pages, PageInfo{"/meeting/participant/deleteLog/{meetId}/{userId}", web.MeetingParticipantDeleteLogGET, "GET"})
	pages = append(pages, PageInfo{"/meeting/participant/delete/{meetId}/{userId}", web.MeetingParticipantDeleteGET, "GET"})
	pages = append(pages, PageInfo{"/meeting/form", web.MeetingFormGET, "GET"})
	pages = append(pages, PageInfo{"/meeting/form/submit", web.MeetingFormPOST, "POST"})
	pages = append(pages, PageInfo{"/meeting/delete/{id}", web.MeetingDeleteGET, "GET"})
	pages = append(pages, PageInfo{"/meeting/modify/{meetId}/openCheckin", web.MeetingModifyOpenCheckinGET, "GET"})
	pages = append(pages, PageInfo{"/meeting/modify/{meetId}/removeAllLog", web.MeetingModifyRmAllLogGET, "GET"})
	pages = append(pages, PageInfo{"/meeting/modify/{meetId}/finish", web.MeetingModifyFinishGET, "GET"})
	// Users
	pages = append(pages, PageInfo{"/users", web.UsersGET, "GET"})
	pages = append(pages, PageInfo{"/users/form", web.UsersFormGET, "GET"})
	pages = append(pages, PageInfo{"/users/form/submit", web.UsersFormPOST, "POST"})
	pages = append(pages, PageInfo{"/users/delete/{id}", web.UsersDeleteGET, "GET"})
	// Boards
	pages = append(pages, PageInfo{"/board/ranking", web.leaderboardGET, "GET"})

	return pages
}

func (web *Web) newHandler() http.Handler {
	router := mux.NewRouter()

	pages := web.GetPageInfos()

	for _, pageInfo := range pages {
		router.HandleFunc(pageInfo.path, pageInfo.handler).Methods(pageInfo.methods)
	}

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

package web

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Team6083/OverHours/models"
	"github.com/gorilla/mux"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
)

// Handlers

func (web *Web) TimeLogGET(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*models.User)

	webTemplate, err := web.parseFiles("templates/timeLogs.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	names, err := web.database.GetUserNameMap()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	var timeLogs []models.TimeLog
	data := struct {
		UserName    string
		UserAccName string
		TimeLogs    []models.TimeLog
		UserNames   map[string]string
	}{"unknown", "", timeLogs, names}

	if user != nil {
		data.UserName = user.Name
		data.UserAccName = user.Username
		if user.CheckPermissionLevel(models.PermissionLeader) {
			timeLogs, err = web.database.GetAllTimeLogs()
			if err != nil && err != mgo.ErrNotFound {
				handleWebErr(w, err)
				return
			}
		} else {
			timeLogs, err = web.database.GetTimeLogsByUser(user.Username)
			if err != nil && err != mgo.ErrNotFound {
				handleWebErr(w, err)
				return
			}
		}
		data.TimeLogs = timeLogs
	}

	err = webTemplate.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

func (web *Web) TimeLogDatatable(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*models.User)
	var err error
	var timeLogs []models.TimeLog

	if user != nil {
		if user.CheckPermissionLevel(models.PermissionLeader) {
			timeLogs, err = web.database.GetAllTimeLogs()
			if err != nil {
				handleWebErr(w, err)
				return
			}
		} else {
			timeLogs, err = web.database.GetTimeLogsByUser(user.Username)
			if err != nil {
				handleWebErr(w, err)
				return
			}
		}
	}

	data := struct {
		Data   []models.TimeLog `json:"data"`
		Length int              `json:"length"`
	}{timeLogs, len(timeLogs)}

	b, err := json.Marshal(data)
	if err != nil {
		fmt.Println("error:", err)
	}

	w.WriteHeader(http.StatusOK)
	_, err = w.Write(b)
	if err != nil {
		fmt.Println(err)
		return
	}
}

func (web *Web) TimeLogFormGET(w http.ResponseWriter, r *http.Request) {
	//user := r.Context().Value("user").(*models.User)

	template, err := web.parseFiles("templates/timeLogs_form.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	data := struct {
		EditTimeLog models.TimeLog
	}{models.TimeLog{Id: bson.NewObjectId()}}

	editTargetLogId, ok := r.URL.Query()["edit"]
	if ok {
		timeLog, err := web.database.GetTimeLogById(editTargetLogId[0])
		if err != nil {
			handleWebErr(w, err)
			return
		}
		data.EditTimeLog = *timeLog
	}

	err = template.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
	}
}

func (web *Web) TimeLogFormPOST(w http.ResponseWriter, r *http.Request) {
	//user := r.Context().Value("user").(*models.User)

	err := r.ParseForm()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if r.Form["id"] == nil || r.Form["userId"] == nil || r.Form["seasonId"] == nil || r.Form["timeIn"] == nil {
		handleBadRequest(w, errors.New("some fields are missing "+r.Form.Encode()))
		return
	}

	timeLog := new(models.TimeLog)

	timeLog.Id = bson.ObjectIdHex(r.Form["id"][0])
	timeLog.UserID = r.Form["userId"][0]
	timeLog.SeasonId = r.Form["seasonId"][0]
	timeIn, err := strconv.ParseInt(r.Form["timeIn"][0], 10, 64)
	if err != nil {
		handleWebErr(w, err)
		return
	}
	timeLog.TimeIn = timeIn
	if r.Form["timeOut"][0] != "" {
		timeOut, err := strconv.ParseInt(r.Form["timeOut"][0], 10, 64)
		if err != nil {
			handleWebErr(w, err)
			return
		}
		timeLog.TimeOut = timeOut
	} else {
		timeLog.TimeOut = 0
	}

	_, err = web.database.SaveTimeLog(timeLog)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, "/timeLog", http.StatusSeeOther)
}

func (web *Web) TimeLogDelete(w http.ResponseWriter, r *http.Request) {
	//user := r.Context().Value("user").(*models.User)

	vars := mux.Vars(r)
	targetId := vars["id"]

	timeLog, err := web.database.GetTimeLogById(targetId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	err = web.database.DeleteTimeLog(timeLog)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, "/timeLog", http.StatusSeeOther)
}

func (web *Web) TimeLogCheckinPOST(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*models.User)

	err := r.ParseForm()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if r.Form["studentId"] == nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	stuId := r.Form["studentId"][0]

	if user.Username != stuId && !user.CheckPermissionLevel(models.PermissionLeader) {
		handleWebErr(w, AuthNoPermission)
		return
	}

	if web.settings.CheckIfCanCheckIn(user) {
		fmt.Printf("%s checkin at %s\n", stuId, time.Now().String())
		err = web.StudentCheckin(stuId, web.settings.SeasonId)
		if err != nil && err != models.AlreadyCheckInError {
			handleWebErr(w, err)
			return
		}
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
	return
}

func (web *Web) TimeLogRFIDREGPOST(w http.ResponseWriter, r *http.Request) {
	body, _ := ioutil.ReadAll(r.Body)

	type InputData struct {
		UID      string `json:"uid"`
		Token    string `json:"token"`
		UserName string `json:"userName"`
	}

	var data InputData

	err := json.Unmarshal(body, &data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
	if data.Token != web.settings.Token {
		handleForbidden(w, errors.New("token miss match"))
		return
	}

	user, err := web.database.GetUserByUserName(data.UserName)
	if err != nil {
		if err == mgo.ErrNotFound {
			fmt.Printf("Can't find user for %s\n", data.UserName)
			handleBadRequest(w, err)
		} else {
			handleWebErr(w, err)
		}
		return
	}

	user.UUID = data.UID

	_, err = web.database.SaveUser(*user)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (web *Web) TimeLogRFIDPOST(w http.ResponseWriter, r *http.Request) {
	body, _ := ioutil.ReadAll(r.Body)

	type InputData struct {
		UID   string `json:"uid"`
		Token string `json:"token"`
	}

	var data InputData

	err := json.Unmarshal(body, &data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
	if data.Token != web.settings.Token {
		handleForbidden(w, errors.New("token miss match"))
		return
	}

	user, err := web.database.GetUserByUUID(data.UID)
	if err != nil {
		if err == mgo.ErrNotFound {
			fmt.Printf("Can't find user for %s\n", data.UID)
			handleBadRequest(w, err)
		} else {
			handleWebErr(w, err)
		}
		return
	}

	type RFIDResponse struct {
		Status    string
		UserName  string
		CheckTime time.Time
	}

	err = web.StudentCheckin(user.Username, web.settings.SeasonId)
	if err == nil {
		w.WriteHeader(http.StatusOK)
		responseByte, err := json.Marshal(RFIDResponse{"checkin", user.Username, time.Now()})
		if err != nil {
			handleWebErr(w, err)
			return
		}

		_, err = w.Write(responseByte)
		if err != nil {
			handleWebErr(w, err)
			return
		}
		return
	}

	// if != already checkin error
	if err != models.AlreadyCheckInError {
		handleWebErr(w, err)
		return
	}

	// Already checkin error -> checkout
	err = web.StudentCheckOut(user.Username)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	responseByte, err := json.Marshal(RFIDResponse{"checkout", user.Username, time.Now()})
	if err != nil {
		handleWebErr(w, err)
		return
	}

	_, err = w.Write(responseByte)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

func (web *Web) TimeLogCheckoutGET(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*models.User)

	var studentId string
	status, ok := r.URL.Query()["studentId"]
	if ok && len(status[0]) >= 1 {
		studentId = status[0]
	}

	if user.Username != studentId && !user.CheckPermissionLevel(models.PermissionLeader) {
		handleWebErr(w, AuthNoPermission)
		return
	}

	if web.settings.CheckIfCanCheckOut(user) {
		fmt.Printf("%s checkout at %s\n", studentId, time.Now().String())
		err := web.StudentCheckOut(studentId)
		if err != nil && err != models.AlreadyCheckOutError {
			handleWebErr(w, err)
			return
		}
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
	return
}

func (web *Web) TimeLogGetAllSeasonsGET(w http.ResponseWriter, r *http.Request) {

	seasonIds, err := web.database.GetAllSeasons()
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(w, err)
		return
	}

	data, err := json.Marshal(seasonIds)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	_, err = w.Write(data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

// Checkin and Checkout

var StudentNotExistError = errors.New("student doesn't exist")

func (web *Web) StudentCheckOut(studentId string) error {
	timeLog, err := web.database.GetLastLogByUser(studentId)
	if err != nil {
		return err
	}

	if !timeLog.IsOut() {
		if web.settings.CheckIfExceedLastOut(timeLog.GetInTime(), time.Now()) {
			timeLog.TimeOut = -1
		} else {
			timeLog.TimeOut = time.Now().Unix()
		}

		_, err = web.database.SaveTimeLog(timeLog)
		if err != nil {
			return err
		}
		return nil
	} else {
		return models.AlreadyCheckOutError
	}
}

func (web *Web) StudentCheckin(studentId string, seasonId string) error {

	user, err := web.database.GetUserByUserName(studentId)
	if err != nil && err != mgo.ErrNotFound {
		return err
	}
	if user == nil {
		return StudentNotExistError
	}

	lastLog, err := web.database.GetLastLogByUser(studentId)
	if err != nil && err != mgo.ErrNotFound {
		return err
	}
	var timeLog models.TimeLog

	if lastLog == nil || lastLog.IsOut() {
		if lastLog == nil {
			fmt.Printf("creating a new log for %s\n", studentId)
		}
		timeLog = models.NewTimeLogAtNow(studentId, seasonId)
		_, err = web.database.SaveTimeLog(&timeLog)
		if err != nil {
			return err
		}
	} else {
		return models.AlreadyCheckInError
	}

	go web.CheckinWebHook(*user)

	return nil
}

func (web *Web) CheckinWebHook(user models.User) {
	if web.settings.CheckinWebHook != "" {
		req, err := http.NewRequest("POST", web.settings.CheckinWebHook, strings.NewReader(fmt.Sprintf("{\"studentId\": \"%s\", \"name\": \"%s\"}", user.Email, user.Name)))
		if err != nil {
			fmt.Println(err)
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("token", web.settings.CheckinWebHookToken)

		client := &http.Client{}
		resp, err := client.Do(req)

		if resp.StatusCode != http.StatusUnprocessableEntity && resp.StatusCode != http.StatusOK {
			defer resp.Body.Close()
			body, err := ioutil.ReadAll(resp.Body)
			if err != nil {
				// handle error
				fmt.Println(err)
			}

			fmt.Println(string(body))
		}
	}
}

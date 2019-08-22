package web

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/Team6083/OverHours/models"
	"github.com/gorilla/mux"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"io"
	"io/ioutil"
	"net/http"
	"strconv"
	"time"
)

// Handlers

func (web *Web) TimeLogGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		return
	}

	webTemplate, err := web.parseFiles("templates/timeLogs.html", "templates/base.html")
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
	session, err := web.pageAccessManage(w, r, PageLogin, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		return
	}

	user, err := web.database.GetUserByUserName(session.Username)
	if err != nil {
		handleWebErr(w, err)
	}

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
	session, err := web.pageAccessManage(w, r, PageLeader, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		web.handle401(w, r)
		return
	}

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
	session, err := web.pageAccessManage(w, r, PageLeader, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		web.handle401(w, r)
		return
	}

	err = r.ParseForm()
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
	session, err := web.pageAccessManage(w, r, PageLeader, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		return
	}

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
	session, err := web.pageAccessManage(w, r, PageLogin, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session != nil {
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

		user, err := web.database.GetUserByUserName(session.Username)
		if err != nil {
			handleWebErr(w, err)
			return
		}
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

	} else {
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
	return
}

func (web *Web) TimeLogCheckoutGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session != nil {
		var studentId string
		status, ok := r.URL.Query()["studentId"]
		if ok && len(status[0]) >= 1 {
			studentId = status[0]
		}

		user, err := web.database.GetUserByUserName(session.Username)
		if err != nil {
			handleWebErr(w, err)
			return
		}
		if user.Username != studentId && !user.CheckPermissionLevel(models.PermissionLeader) {
			handleWebErr(w, AuthNoPermission)
			return
		}

		if web.settings.CheckIfCanCheckOut(user) {
			fmt.Printf("%s checkout at %s\n", studentId, time.Now().String())
			err = web.StudentCheckOut(studentId)
			if err != nil && err != models.AlreadyCheckOutError {
				handleWebErr(w, err)
				return
			}
		}

	} else {
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
	return
}

// Checkin and Checkout

var StudentNotExistError = errors.New("student doesn't exist")

func (web *Web) StudentCheckOut(studentId string) error {
	//TODO: add season select support
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

	exist, err := web.database.CheckUserExist(studentId)
	if err != nil {
		return err
	}
	if !exist {
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

	return nil
}

// API handlers

// GET /timeLogs
func (web *Web) APIGetTimeLogs(w http.ResponseWriter, r *http.Request) {
	timeLogs, err := web.database.GetAllTimeLogs()
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(w, err)
		return
	}

	var sendBytes []byte

	_, ok := r.URL.Query()["datatable"]
	if ok {
		datatableData := struct {
			Data   []models.TimeLog `json:"data"`
			Length int              `json:"length"`
		}{timeLogs, len(timeLogs)}

		b, err := json.Marshal(datatableData)
		if err != nil {
			handleWebErr(w, err)
			return
		}
		sendBytes = b
	} else {
		b, err := json.Marshal(timeLogs)
		if err != nil {
			handleWebErr(w, err)
			return
		}
		sendBytes = b
	}

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(sendBytes)
	if err != nil {
		panic(err)
	}
}

// POST /timeLogs
func (web *Web) APIPostTimeLog(w http.ResponseWriter, r *http.Request) {
	var timeLog models.TimeLog
	timeLog.Id = bson.NewObjectId()

	body, err := ioutil.ReadAll(io.LimitReader(r.Body, 1048576))
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if err := json.Unmarshal(body, &timeLog); err != nil {
		w.Header().Set("Content-Type", "application/json;   charset=UTF-8")
		w.WriteHeader(http.StatusBadRequest)
		if err := json.NewEncoder(w).Encode(err); err != nil {
			panic(err)
		}
		return
	}

	change, err := web.database.SaveTimeLog(&timeLog)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json;   charset=UTF-8")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(change); err != nil {
		panic(err)
	}
}

// GET /timeLogs/{id}
func (web *Web) APIGetTimeLog(w http.ResponseWriter, r *http.Request) {
	targetId := mux.Vars(r)["id"]

	timeLog, err := web.database.GetTimeLogById(targetId)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(timeLog); err != nil {
		panic(err)
	}
}

// PUT /timeLogs/{id}
func (web *Web) APIPutTimeLog(w http.ResponseWriter, r *http.Request) {
	targetId := mux.Vars(r)["id"]
	if !bson.IsObjectIdHex(targetId) {
		handleBadRequest(w, errors.New("id is not a valid objectid"))
		return
	}

	var timeLog models.TimeLog
	timeLog.Id = bson.ObjectIdHex(targetId)

	body, err := ioutil.ReadAll(io.LimitReader(r.Body, 1048576))
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if err := json.Unmarshal(body, &timeLog); err != nil {
		w.Header().Set("Content-Type", "application/json;   charset=UTF-8")
		w.WriteHeader(http.StatusBadRequest)
		if err := json.NewEncoder(w).Encode(err); err != nil {
			panic(err)
		}
		return
	}

	change, err := web.database.SaveTimeLog(&timeLog)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json;   charset=UTF-8")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(change); err != nil {
		panic(err)
	}
}

// PATCH /timeLogs/{id}
func (web *Web) APIPatchTimeLog(w http.ResponseWriter, r *http.Request) {
	targetId := mux.Vars(r)["id"]
	if !bson.IsObjectIdHex(targetId) {
		handleBadRequest(w, errors.New("id is not a valid objectid"))
		return
	}

	timeLog, err := web.database.GetTimeLogById(targetId)
	if err != mgo.ErrNotFound {
		handleWebErr(w, err)
		return
	}

	if timeLog == nil {
		timeLog = new(models.TimeLog)
		timeLog.Id = bson.ObjectIdHex(targetId)
	}

	body, err := ioutil.ReadAll(io.LimitReader(r.Body, 1048576))
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if err := json.Unmarshal(body, &timeLog); err != nil {
		w.Header().Set("Content-Type", "application/json;   charset=UTF-8")
		w.WriteHeader(http.StatusBadRequest)
		if err := json.NewEncoder(w).Encode(err); err != nil {
			panic(err)
		}
		return
	}

	change, err := web.database.SaveTimeLog(timeLog)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json;   charset=UTF-8")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(change); err != nil {
		panic(err)
	}
}

// GET /timeLog/checkin
func (web *Web) APICheckin(w http.ResponseWriter, r *http.Request) {

	keys, ok := r.URL.Query()["user"]
	if !ok || len(keys[0]) < 1 {
		handleBadRequest(w, errors.New("parameter \"user\" needed"))
		return
	}

	userId := keys[0]

	keys, ok = r.URL.Query()["season"]
	seasonId := web.settings.SeasonId
	if ok && len(keys[0]) > 0 {
		seasonId = keys[0]
	}

	err := web.StudentCheckin(userId, seasonId)
	if err == StudentNotExistError || err == models.AlreadyCheckInError {
		handleBadRequest(w, err)
		return
	} else if err != nil {
		handleWebErr(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// GET /timeLog/checkout
func (web *Web) APICheckout(w http.ResponseWriter, r *http.Request) {

	keys, ok := r.URL.Query()["user"]
	if !ok || len(keys[0]) < 1 {
		handleBadRequest(w, errors.New("parameter \"user\" needed"))
		return
	}

	userId := keys[0]

	keys, ok = r.URL.Query()["season"]
	//seasonId := web.settings.SeasonId
	//if ok && len(keys[0]) > 0 {
	//	seasonId = keys[0]
	//}

	err := web.StudentCheckOut(userId)
	if err == models.AlreadyCheckOutError {
		handleUnprocessableEntity(w, err)
		return
	} else if err != nil {
		handleWebErr(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
}

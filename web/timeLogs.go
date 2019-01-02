package web

import (
	"errors"
	"fmt"
	"github.com/Team6083/OverHours/models"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
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

	var timeLogs []models.TimeLog
	data := struct {
		UserName    string
		UserAccName string
		TimeLogs    []models.TimeLog
	}{"unknown", "", timeLogs}

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

func (web *Web) TimeLogCheckinPOST(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, false)
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

		fmt.Printf("%s checkin at %s\n", stuId, time.Now().String())
		err = web.StudentCheckin(stuId, web.settings.SeasonId)
		if err != nil && err != AlreadyCheckInError {
			handleWebErr(w, err)
			return
		}
	} else {
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
	return
}

func (web *Web) TimeLogCheckoutGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, false)
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

		fmt.Printf("%s checkout at %s\n", studentId, time.Now().String())
		err = web.StudentCheckOut(studentId)
		if err != nil {
			handleWebErr(w, err)
			return
		}
	} else {
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
	return
}

// Checkin and Checkout

var AlreadyCheckInError = errors.New("already checkin")
var AlreadyCheckOutError = errors.New("already checkout")
var StudentNotExistError = errors.New("student doesn't exist")

func (web *Web) StudentCheckOut(studentId string) error {
	timeLog, err := web.database.GetLastLogByUser(studentId)
	if err != nil {
		return err
	}

	if !timeLog.IsOut() {
		timeLog.TimeOut = time.Now().Unix()
		_, err = web.database.SaveTimeLog(timeLog)
		if err != nil {
			return err
		}
		return nil
	} else {
		return AlreadyCheckOutError
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
		return AlreadyCheckInError
	}

	return nil
}

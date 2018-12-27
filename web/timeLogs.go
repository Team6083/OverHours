package web

import (
	"errors"
	"fmt"
	"github.com/kennhung/OverHours/models"
	"gopkg.in/mgo.v2"
	"net/http"
	"time"
)

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
		err = web.StudentCheckin(stuId, tempSeason)
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

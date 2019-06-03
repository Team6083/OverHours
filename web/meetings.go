package web

import (
	"encoding/base64"
	"errors"
	"fmt"
	"github.com/Team6083/OverHours/models"
	"github.com/gorilla/mux"
	uuid "github.com/satori/go.uuid"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"net/http"
	"strconv"
	"time"
)

func (web *Web) MeetingGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		return
	}

	webTemplate, err := web.parseFiles("templates/meetings.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	user, err := web.database.GetUserByUserName(session.Username)
	if err != nil {
		handleWebErr(w, err)
	}

	var meetings []models.Meeting
	data := struct {
		UserName    string
		UserAccName string
		Meetings    []models.Meeting
	}{"unknown", "", meetings}

	if user != nil {
		data.UserName = user.Name
		data.UserAccName = user.Username
		if user.CheckPermissionLevel(models.PermissionLeader) {
			meetings, err = web.database.GetAllMeeting()
			if err != nil && err != mgo.ErrNotFound {
				handleWebErr(w, err)
				return
			}
		} else {
			meetings, err = web.database.GetMeetingsByUserId(user.GetIdentify())
			if err != nil && err != mgo.ErrNotFound {
				handleWebErr(w, err)
				return
			}
		}
		data.Meetings = meetings
	}

	err = webTemplate.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

func (web *Web) MeetingCheckinGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		return
	}

	sessionUser, err := web.database.GetUserByUserName(session.Username)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	vars := mux.Vars(r)
	meetId := vars["meetId"]

	meeting, err := web.database.GetMeetingByMeetId(meetId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	var user *models.User
	user = sessionUser

	if vars["userId"] != "" {
		userId := vars["userId"]
		user, err = web.database.GetUserByUserName(userId)
		if err != nil {
			handleWebErr(w, err)
			return
		}
	}

	if sessionUser != user {
		if !(sessionUser.CheckPermissionLevel(models.PermissionAdmin) || meeting.CheckUserAdmin(sessionUser.GetIdentify())) {
			handleForbidden(w, errors.New("you need to be a Admin user or a meeting admin"))
			return
		}
	}

	err = web.database.MeetingCheckin(meeting, user)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (web *Web) MeetingDetailGET(w http.ResponseWriter, r *http.Request) {
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
		return
	}

	webTemplate, err := web.parseFiles("templates/meetings_detail.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	vars := mux.Vars(r)
	meetId := vars["meetId"]

	meeting, err := web.database.GetMeetingByMeetId(meetId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if !meeting.CheckIfVisibleToUser(user) {
		web.handle403(w, r)
		return
	}

	names, err := web.database.GetUserNameMap()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	type ParticipantsTimeLogDetail struct {
		UserId      string
		DisplayName string
		InTime      int64
		OutTime     int64
	}

	data := struct {
		Meeting               *models.Meeting
		UserNames             map[string]string
		TimeLogs              map[string]ParticipantsTimeLogDetail
		CanCheckin            bool
		MeetingStarted        bool
		MeetingCheckinStarted bool
		IsLeader              bool
		MeetingFinished       bool
	}{meeting, names, make(map[string]ParticipantsTimeLogDetail), meeting.CheckIfMeetingCanCheckInNow(user), meeting.MeetingStarted(), meeting.CheckinStarted(), user.CheckPermissionLevel(models.PermissionLeader), meeting.MeetingFinished()}

	for index, participant := range meeting.Participants {
		lastLog, err := web.database.GetLastLogByUser(participant.UserId)
		if err != nil && err != mgo.ErrNotFound {
			handleWebErr(w, err)
			return
		}

		logs := ParticipantsTimeLogDetail{DisplayName: names[participant.UserId], UserId: participant.UserId}

		if lastLog != nil && lastLog.SeasonId == meeting.GetMeetingLogId() {
			logs.InTime = lastLog.TimeIn
			logs.OutTime = lastLog.TimeOut
		} else {
			logs.InTime = 0
			logs.OutTime = 0
		}

		data.TimeLogs[index] = logs
	}

	err = webTemplate.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

func (web *Web) MeetingFormGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLeader, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		web.handle401(w, r)
		return
	}

	template, err := web.parseFiles("templates/meetings_form.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	names, err := web.database.GetUserNameMap()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	data := struct {
		EditMeeting models.Meeting
		UserNames   map[string]string
	}{models.Meeting{Id: bson.NewObjectId(), MeetId: base64.URLEncoding.EncodeToString(uuid.NewV4().Bytes())}, names}

	editTargetMeetId, ok := r.URL.Query()["edit"]
	if ok {
		meeting, err := web.database.GetMeetingByMeetId(editTargetMeetId[0])
		if err != nil {
			handleWebErr(w, err)
			return
		}
		data.EditMeeting = *meeting
	}

	err = template.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
	}
}

func (web *Web) MeetingFormPOST(w http.ResponseWriter, r *http.Request) {
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

	if r.Form["id"] == nil || r.Form["meetId"] == nil || r.Form["seasonId"] == nil || r.Form["startTime"] == nil {
		handleBadRequest(w, errors.New("some fields are missing "+r.Form.Encode()))
		return
	}

	meeting := models.GetNewMeeting()

	meeting.Id = bson.ObjectIdHex(r.Form["id"][0])
	meeting.MeetId = r.Form["meetId"][0]
	meeting.SeasonId = r.Form["seasonId"][0]

	startTime, err := strconv.ParseInt(r.Form["startTime"][0], 10, 64)
	if err != nil {
		handleWebErr(w, err)
		return
	}
	meeting.StartTime = startTime

	startCheckinTime, err := strconv.ParseInt(r.Form["startCheckinTime"][0], 10, 64)
	if err != nil {
		handleWebErr(w, err)
		return
	}
	meeting.StartCheckinTime = startCheckinTime

	if r.Form["finishTime"][0] != "" {
		FinishTime, err := strconv.ParseInt(r.Form["finishTime"][0], 10, 64)
		if err != nil {
			handleWebErr(w, err)
			return
		}
		meeting.FinishTime = FinishTime
	} else {
		meeting.FinishTime = 0
	}

	meeting.Title = r.Form["title"][0]
	meeting.Description = r.Form["description"][0]

	checkinLevel, err := strconv.Atoi(r.Form["checkinLevel"][0])
	if err != nil {
		handleWebErr(w, err)
		return
	}
	meeting.CheckinLevel = checkinLevel

	for _, data := range r.Form["participantsData"] {
		fmt.Println(data)
	}

	for _, participantId := range r.Form["userSelect"] {
		participantData := models.ParticipantData{UserId: participantId, Leave: false, IsAdmin: false}

		meeting.Participants[participantId] = participantData
	}

	_, err = web.database.SaveMeeting(meeting)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/meeting/detail/%s", meeting.MeetId), http.StatusSeeOther)
}

func (web *Web) MeetingDeleteGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLeader, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	meeting, err := web.database.GetMeetingById(id)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	err = web.database.DeleteMeeting(meeting)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, "/meeting", http.StatusSeeOther)
}

// modify

func (web *Web) MeetingModifyOpenCheckinGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLeader, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		return
	}

	vars := mux.Vars(r)
	meetId := vars["meetId"]

	meeting, err := web.database.GetMeetingByMeetId(meetId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	meeting.StartCheckinTime = time.Now().Unix()

	_, err = web.database.SaveMeeting(meeting)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/meeting/detail/%s", meetId), http.StatusSeeOther)
}

func (web *Web) MeetingModifyRmAllLogGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLeader, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		return
	}

	vars := mux.Vars(r)
	meetId := vars["meetId"]

	meeting, err := web.database.GetMeetingByMeetId(meetId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	err = web.database.DeleteAllMeetingLog(meeting)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/meeting/detail/%s", meetId), http.StatusSeeOther)
}

func (web *Web) MeetingModifyFinishGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLeader, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		return
	}

	vars := mux.Vars(r)
	meetId := vars["meetId"]

	meeting, err := web.database.GetMeetingByMeetId(meetId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if !meeting.MeetingFinished() {
		meeting.FinishTime = time.Now().Unix()
	}

	_, err = web.database.SaveMeeting(meeting)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/meeting/detail/%s", meetId), http.StatusSeeOther)
}

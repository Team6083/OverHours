package web

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	. "github.com/Team6083/OverHours/models"
	"github.com/gorilla/mux"
	uuid "github.com/satori/go.uuid"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"net/http"
	"strconv"
	"time"
)

func (web *Web) MeetingGET(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*User)

	webTemplate, err := web.parseFiles("templates/meetings.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	var meetings []Meeting
	data := struct {
		UserName    string
		UserAccName string
		Meetings    []Meeting
	}{"unknown", "", meetings}

	if user != nil {
		data.UserName = user.Name
		data.UserAccName = user.Username
		if user.CheckPermissionLevel(PermissionLeader) {
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
	sessionUser := r.Context().Value("user").(*User)

	vars := mux.Vars(r)
	meetId := vars["meetId"]

	meeting, err := web.database.GetMeetingByMeetId(meetId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	var user *User
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
		if !(sessionUser.CheckPermissionLevel(PermissionAdmin) || meeting.CheckUserAdmin(sessionUser.GetIdentify())) {
			handleForbidden(w, errors.New("you need to be a Admin user or a meeting admin"))
			return
		}
	}

	err = web.database.MeetingCheckin(meeting, user)
	if err != nil {
		if err == CantCheckinError || err == UserNotInMeeting || err == AlreadyCheckInError || err == UserLeaveError {
			handleBadRequest(w, err)
		} else {
			handleWebErr(w, err)
		}

		return
	}

	goHome, ok := r.URL.Query()["goHome"]
	if ok && goHome[0] == "false" {
		http.Redirect(w, r, "/meeting/detail/"+meetId, http.StatusSeeOther)
	} else {
		http.Redirect(w, r, "/", http.StatusSeeOther)
	}

}

func (web *Web) MeetingDetailGET(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("user").(*User)

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
		IsLeave     bool
	}

	data := struct {
		Meeting               *Meeting
		UserNames             map[string]string
		TimeLogs              map[string]ParticipantsTimeLogDetail
		CanCheckin            bool
		MeetingStarted        bool
		MeetingCheckinStarted bool
		IsAdmin               bool
		MeetingFinished       bool
		//TODO: admin user of a meeting
	}{meeting, names, make(map[string]ParticipantsTimeLogDetail), meeting.CheckIfMeetingCanCheckInNow(user), meeting.MeetingStarted(), meeting.CheckinStarted(), user.CheckPermissionLevel(PermissionAdmin) || meeting.CheckUserAdmin(user.GetIdentify()), meeting.MeetingFinished()}

	for index, participant := range meeting.Participants {
		lastLog, err := web.database.GetLastLogByUserWithSpecificSeason(participant.UserId, meeting.GetMeetingLogId())
		if err != nil && err != mgo.ErrNotFound {
			handleWebErr(w, err)
			return
		}

		logs := ParticipantsTimeLogDetail{DisplayName: names[participant.UserId], UserId: participant.UserId, IsLeave: participant.Leave}

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
	//user := r.Context().Value("user").(*models.User)

	template, err := web.parseFiles("templates/meetings_form.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	usersMap, err := web.database.GetAllUserMap()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	for k, u := range usersMap {
		u.Password = ""
		usersMap[k] = u
	}

	data := struct {
		EditMeeting Meeting
		UsersMap    map[string]User
	}{EditMeeting: Meeting{Id: bson.NewObjectId(), MeetId: base64.URLEncoding.EncodeToString(uuid.NewV4().Bytes()), SeasonId: web.settings.SeasonId}, UsersMap: usersMap}

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
	//user := r.Context().Value("user").(*models.User)

	err := r.ParseForm()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if r.Form["id"] == nil || r.Form["meetId"] == nil || r.Form["seasonId"] == nil || r.Form["startTime"] == nil {
		handleBadRequest(w, errors.New("some fields are missing "+r.Form.Encode()))
		return
	}

	meeting := GetNewMeeting()

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

	for _, participantId := range r.Form["userSelect"] {
		participantData := ParticipantData{UserId: participantId, Leave: false, IsAdmin: false}

		meeting.Participants[participantId] = participantData
	}

	for index, data := range r.Form["participantsData[][UserId]"] {
		if meeting.CheckUserParticipate(data) {
			participantData := meeting.Participants[data]

			participantData.IsAdmin = r.Form["participantsData[][IsAdmin]"][index] == "true"
			participantData.Leave = r.Form["participantsData[][Leave]"][index] == "true"

			meeting.Participants[data] = participantData
		}
	}

	_, err = web.database.SaveMeeting(meeting)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/meeting/detail/%s", meeting.MeetId), http.StatusSeeOther)
}

func (web *Web) MeetingDeleteGET(w http.ResponseWriter, r *http.Request) {
	//user := r.Context().Value("user").(*models.User)

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

func (web *Web) MeetingParticipantLeaveGET(w http.ResponseWriter, r *http.Request) {
	sessionUser := r.Context().Value("user").(*User)

	vars := mux.Vars(r)
	meetId := vars["meetId"]

	meeting, err := web.database.GetMeetingByMeetId(meetId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	userId := vars["userId"]
	if !meeting.CheckUserParticipate(userId) {
		handleBadRequest(w, UserNotInMeeting)
		return
	}

	if sessionUser.GetIdentify() != userId {
		if !(sessionUser.CheckPermissionLevel(PermissionAdmin) || meeting.CheckUserAdmin(sessionUser.GetIdentify())) {
			handleForbidden(w, errors.New("you need to be a Admin user or a meeting admin"))
			return
		}
	}

	meeting.ParticipantLeave(userId, true)
	_, err = web.database.SaveMeeting(meeting)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/meeting/detail/%s", meetId), http.StatusSeeOther)
}

func (web *Web) MeetingParticipantLeaveBatchPOST(w http.ResponseWriter, r *http.Request) {
	sessionUser := r.Context().Value("user").(*User)

	if !sessionUser.CheckPermissionLevel(PermissionAdmin) {
		web.handle403(w, r)
		return
	}

	decoder := json.NewDecoder(r.Body)
	var data []string
	err := decoder.Decode(&data)
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

	participants := meeting.Participants

	for _, v := range data {
		if _, ok := participants[v]; ok {
			participant := participants[v]
			participant.Leave = true
			participants[v] = participant
		}
	}

	meeting.Participants = participants
	_, err = web.database.SaveMeeting(meeting)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (web *Web) MeetingParticipantDeleteLogGET(w http.ResponseWriter, r *http.Request) {
	sessionUser := r.Context().Value("user").(*User)

	vars := mux.Vars(r)
	meetId := vars["meetId"]

	meeting, err := web.database.GetMeetingByMeetId(meetId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	userId := vars["userId"]
	if !meeting.CheckUserParticipate(userId) {
		handleBadRequest(w, UserNotInMeeting)
		return
	}

	if !(sessionUser.CheckPermissionLevel(PermissionAdmin) || meeting.CheckUserAdmin(sessionUser.GetIdentify())) {
		handleForbidden(w, errors.New("you need to be a Admin user or a meeting admin"))
		return
	}

	timeLogs, err := web.database.GetTimeLogsByUserWithSpecificSeason(userId, meeting.GetMeetingLogId())
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(w, err)
		return
	}

	for _, timeLog := range timeLogs {
		err = web.database.DeleteTimeLog(&timeLog)
		if err != nil {
			handleWebErr(w, err)
			return
		}
	}

	meeting.ParticipantLeave(userId, false)
	_, err = web.database.SaveMeeting(meeting)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/meeting/detail/%s", meetId), http.StatusSeeOther)
}

func (web *Web) MeetingParticipantDeleteGET(w http.ResponseWriter, r *http.Request) {
	sessionUser := r.Context().Value("user").(*User)

	vars := mux.Vars(r)
	meetId := vars["meetId"]

	meeting, err := web.database.GetMeetingByMeetId(meetId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	userId := vars["userId"]
	if !meeting.CheckUserParticipate(userId) {
		handleBadRequest(w, UserNotInMeeting)
		return
	}

	if !(sessionUser.CheckPermissionLevel(PermissionAdmin) || meeting.CheckUserAdmin(sessionUser.GetIdentify())) {
		handleForbidden(w, errors.New("you need to be a Admin user or a meeting admin"))
		return
	}

	meeting.DeleteParticipant(userId)
	_, err = web.database.SaveMeeting(meeting)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/meeting/detail/%s", meetId), http.StatusSeeOther)
}

// modify

func (web *Web) MeetingModifyOpenCheckinGET(w http.ResponseWriter, r *http.Request) {
	//user := r.Context().Value("user").(*models.User)

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
	//user := r.Context().Value("user").(*models.User)

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
	//user := r.Context().Value("user").(*models.User)

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

func (web *Web) MeetingUtilGetMeetingGET(w http.ResponseWriter, r *http.Request) {
	sessionUser := r.Context().Value("user").(*User)
	vars := mux.Vars(r)
	meetId := vars["meetId"]

	meeting, err := web.database.GetMeetingByMeetId(meetId)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(w, err)
		return
	} else if err == mgo.ErrNotFound {
		handleBadRequest(w, err)
		return
	}

	if !meeting.CheckIfVisibleToUser(sessionUser) {
		handleForbidden(w, errors.New("meeting not visible to this user"))
		return
	}

	encoder := json.NewEncoder(w)
	err = encoder.Encode(meeting)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

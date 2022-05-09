package web

import (
	"errors"
	"github.com/Team6083/OverHours/models"
	"github.com/gin-gonic/gin"
	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
	"net/http"
)

func (web *Web) HandleMeetingRoutes(router *gin.Engine) {
	meetingsGroup := router.Group("/meetings")
	meetingsGroup.GET("/", web.APIGetMeetings)
	meetingsGroup.POST("/", web.APIPostMeetings)
	meetingsGroup.GET("/:meetingId", web.APIGetMeeting)
	meetingsGroup.PUT("/:meetingId", web.APIPutMeetings)
	meetingsGroup.DELETE("/:meetingId", web.APIDeleteMeetings)

	meetingGroup := router.Group("/meeting")
	meetingGroup.GET("/logs/:meetingId", web.APIGetMeetingLogs)
	meetingGroup.PUT("/participants/:meetingId/:userId", web.APIPutMeetingParticipants)
}

//APIHandler

// GET /meetings
func (web *Web) APIGetMeetings(ctx *gin.Context) {
	meetings, err := web.database.GetAllMeeting()
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	if meetings == nil {
		meetings = []models.Meeting{}
	}

	ctx.JSON(http.StatusOK, meetings)
}

// POST /meetings
func (web *Web) APIPostMeetings(ctx *gin.Context) {
	meeting := models.Meeting{Id: bson.NewObjectId()}

	if err := ctx.ShouldBind(&meeting); err != nil {
		handleBadRequest(ctx, err)
	}

	change, err := web.database.SaveMeeting(&meeting)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusCreated, change)
}

// GET /meetings/:meetingId
func (web *Web) APIGetMeeting(ctx *gin.Context) {
	meetingId := ctx.Param("meetingId")

	if !bson.IsObjectIdHex(meetingId) {
		handleBadRequest(ctx, errors.New("id not valid"))
		return
	}

	var meeting *models.Meeting

	meeting, err := web.database.GetMeetingById(meetingId)
	if err != nil {
		handleBadRequest(ctx, err)
		return
	}

	if meeting == nil {
		handleNotFound(ctx)
		return
	}

	ctx.JSON(http.StatusBadRequest, meeting)
}

// PUT /meetings/:meetingId
func (web *Web) APIPutMeetings(ctx *gin.Context) {
	meetingId := ctx.Param("meetingId")

	if !bson.IsObjectIdHex(meetingId) {
		handleBadRequest(ctx, errors.New("id not valid"))
		return
	}

	var meeting models.Meeting
	meeting.Id = bson.ObjectIdHex(meetingId)

	if err := ctx.ShouldBind(&meeting); err != nil {
		handleBadRequest(ctx, err)
		return
	}

	change, err := web.database.SaveMeeting(&meeting)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusAccepted, change)
}

// Delete /meetings/:meetingId
func (web *Web) APIDeleteMeetings(ctx *gin.Context) {
	meetingId := ctx.Param("meetingId")

	if !bson.IsObjectIdHex(meetingId) {
		handleBadRequest(ctx, errors.New("id not valid"))
		return
	}

	err := web.database.DeleteMeeting(&models.Meeting{Id: bson.ObjectIdHex(meetingId)})
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.Writer.WriteHeader(http.StatusNoContent)
}

// GET /meeting/logs/:meetingId
func (web *Web) APIGetMeetingLogs(ctx *gin.Context) {
	meetingId := ctx.Param("meetingId")

	if !bson.IsObjectIdHex(meetingId) {
		handleBadRequest(ctx, errors.New("id not valid"))
		return
	}

	meeting, err := web.database.GetMeetingById(meetingId)
	if err != nil {
		if err == mgo.ErrNotFound {
			handleBadRequest(ctx, err)
		} else {
			handleWebErr(ctx, err)
		}
		return
	}

	timeLogs, err := web.database.GetTimeLogsBySeason(meeting.GetMeetingLogId())
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, timeLogs)
}

// PUT /meeting/participants/:meetingId/:userId
func (web *Web) APIPutMeetingParticipants(ctx *gin.Context) {
	meetingId := ctx.Param("meetingId")
	userId := ctx.Param("userId")

	if !bson.IsObjectIdHex(meetingId) {
		handleBadRequest(ctx, errors.New("meetingId not valid"))
		return
	}

	if userId == "" {
		handleBadRequest(ctx, errors.New("userId is empty"))
		return
	}

	_, err := web.database.GetUserByUserName(userId)
	if err != nil {
		if err == mgo.ErrNotFound {
			handleBadRequest(ctx, errors.New("cant find user for userId"))
		} else {
			handleWebErr(ctx, err)
		}
		return
	}

	meeting, err := web.database.GetMeetingById(meetingId)
	if err != nil {
		if err == mgo.ErrNotFound {
			handleBadRequest(ctx, err)
		} else {
			handleWebErr(ctx, err)
		}
		return
	}

	participantData := new(models.ParticipantData)

	err = ctx.ShouldBindJSON(&participantData)
	if err != nil {
		handleBadRequest(ctx, err)
		return
	}

	if participantData.UserId.Hex() != userId {
		handleBadRequest(ctx, errors.New("userId dose not match"))
		return
	}

	flag := false
	for i, v := range meeting.Participants {
		if v.UserId.Hex() == participantData.UserId.Hex() {
			meeting.Participants[i] = *participantData
			flag = true
			break
		}
	}

	if !flag {
		meeting.Participants = append(meeting.Participants, *participantData)
	}

	change, err := web.database.SaveMeeting(meeting)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusAccepted, change)
}

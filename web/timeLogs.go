package web

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/Team6083/OverHours/models"
	"github.com/gin-gonic/gin"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"net/http"
	"time"
)

func (web *Web) HandleTimeLogRoutes(router *gin.Engine) {
	timeLogsGroup := router.Group("/timeLogs")
	timeLogsGroup.GET("/", web.APIGetTimeLogs)
	timeLogsGroup.POST("/", web.APIPostTimeLog)
	timeLogsGroup.GET("/:timeLogId", web.APIGetTimeLog)
	timeLogsGroup.PUT("/:timeLogId", web.APIPutTimeLog)
	timeLogsGroup.DELETE("/:timeLogId", web.APIDeleteTimeLog)

	timeLogGroup := router.Group("/timeLog")

	// checkin & checkout
	timeLogGroup.GET("/checkin", web.APICheckin)
	timeLogGroup.GET("/checkout", web.APICheckout)
	timeLogGroup.GET("/unfinished", web.APIGetUnfinishedTimeLogs)
}

// API handlers

// GET /timeLogs
func (web *Web) APIGetTimeLogs(ctx *gin.Context) {
	timeLogs, err := web.database.GetAllTimeLogs()
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, timeLogs)
}

// GET /timeLog/unfinished
func (web *Web) APIGetUnfinishedTimeLogs(ctx *gin.Context) {
	timeLogs, err := web.database.GetAllUnfinishedTimeLogs()
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	if timeLogs == nil {
		timeLogs = []models.TimeLog{}
	}

	ctx.JSON(http.StatusOK, timeLogs)
}

// POST /timeLogs
func (web *Web) APIPostTimeLog(ctx *gin.Context) {
	timeLog := models.TimeLog{Id: bson.NewObjectId()}

	if err := ctx.ShouldBind(&timeLog); err != nil {
		handleBadRequest(ctx, err)
	}

	change, err := web.database.SaveTimeLog(&timeLog)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusCreated, change)
}

// GET /timeLogs/data/:timeLogId
func (web *Web) APIGetTimeLog(ctx *gin.Context) {
	targetId := ctx.Param("timeLogId")

	timeLog, err := web.database.GetTimeLogById(targetId)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, timeLog)
}

// PUT /timeLogs/data/:timeLogId
func (web *Web) APIPutTimeLog(ctx *gin.Context) {
	targetId := ctx.Param("timeLogId")
	if !bson.IsObjectIdHex(targetId) {
		handleBadRequest(ctx, errors.New("id is not a valid objectId"))
		return
	}

	var timeLog models.TimeLog
	timeLog.Id = bson.ObjectIdHex(targetId)

	if err := ctx.ShouldBind(&timeLog); err != nil {
		handleBadRequest(ctx, err)
	}

	change, err := web.database.SaveTimeLog(&timeLog)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusAccepted, change)
}

// DELETE /timeLog/data/:timeLogId
func (web *Web) APIDeleteTimeLog(ctx *gin.Context) {
	targetId := ctx.Param("timeLogId")
	if !bson.IsObjectIdHex(targetId) {
		handleBadRequest(ctx, errors.New("id is not a valid objectId"))
		return
	}

	err := web.database.DeleteTimeLog(&models.TimeLog{Id: bson.ObjectIdHex(targetId)})
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.Writer.WriteHeader(http.StatusNoContent)
}

// POST /timeLog/rfid
func (web *Web) TimeLogRFIDPost(ctx *gin.Context) {
	type RFIDInput struct {
		UID   string `json:"uid"`
		Token string `json:"token"`
	}

	var data RFIDInput

	err := ctx.ShouldBindJSON(data)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	// check given token
	if data.Token != web.settings.Token {
		handleForbidden(ctx, err)
		return
	}

	// get user
	user, err := web.database.GetUserByUUID(data.UID)
	if err != nil {
		if err == mgo.ErrNotFound {
			handleBadRequest(ctx, err)
		} else {
			handleWebErr(ctx, err)
		}
		return
	}

	type RFIDResponse struct {
		Status    string    `json:"status"`
		UserName  string    `json:"username"`
		CheckTime time.Time `json:"checkTime"`
	}

	// checkin
	err = web.StudentCheckin(user.Username, web.settings.SeasonId)
	if err == nil {
		// checkin response if no error
		response, err := json.Marshal(RFIDResponse{"checkin", user.Username, time.Now()})
		if err != nil {
			handleWebErr(ctx, err)
			return
		}
		ctx.JSON(http.StatusOK, response)
	}

	// other than AlreadyCheckInError
	if err != models.AlreadyCheckInError {
		handleWebErr(ctx, err)
		return
	}

	// checkout
	err = web.StudentCheckOut(user.Username)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	// checkout response
	response, err := json.Marshal(RFIDResponse{"checkout", user.Username, time.Now()})
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, response)
}

// GET /timeLog/checkin
func (web *Web) APICheckin(ctx *gin.Context) {
	userId := ctx.Query("user")

	seasonId := ctx.DefaultQuery("season", web.settings.SeasonId)

	err := web.StudentCheckin(userId, seasonId)
	if err == StudentNotExistError || err == models.AlreadyCheckInError {
		handleUnprocessableEntity(ctx, err)
		return
	} else if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.Writer.WriteHeader(http.StatusNoContent)
}

// GET /timeLog/checkout
func (web *Web) APICheckout(ctx *gin.Context) {
	userId := ctx.Query("user")

	err := web.StudentCheckOut(userId)
	if err == models.AlreadyCheckOutError {
		handleUnprocessableEntity(ctx, err)
		return
	} else if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.Writer.WriteHeader(http.StatusNoContent)
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

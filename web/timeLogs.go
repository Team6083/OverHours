package web

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/Team6083/OverHours/models"
	"github.com/gin-gonic/gin"
	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
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

// APIGetTimeLogs
// @Router /timeLogs [get]
// @Summary Get time logs
// @Param seasonId query string false "Season id"
// @Param userId query string false "User id"
// @Tags TimeLog
// @Produce json
// @Success 200 {object} []models.TimeLog
// @Failure default {object} APIException
func (web *Web) APIGetTimeLogs(ctx *gin.Context) {
	// TODO: add support of userId and seasonId
	//userId := ctx.Query("userId")
	//seasonId := ctx.Query("seasonId")

	timeLogs, err := web.database.GetAllTimeLogs()
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	if timeLogs == nil {
		timeLogs = []models.TimeLog{}
	}

	ctx.JSON(http.StatusOK, timeLogs)
}

// APIGetUnfinishedTimeLogs
// @Router /timeLog/unfinished [get]
// @Summary Get unfinished time logs
// @Param seasonId query string false "Season id"
// @Tags TimeLog
// @Produce json
// @Success 200 {object} []models.TimeLog
// @Failure default {object} APIException
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

type APIPostTimeLogSuccessResponse struct {
	Ok bool `json:"ok"`
}

// APIPostTimeLog
// @Router /timeLogs [post]
// @Summary Add time log
// @Param timeLog body models.TimeLog true "Time log"
// @Tags TimeLog
// @Produce json
// @Success 200 {object} APIPostTimeLogSuccessResponse
// @Failure default {object} APIException
func (web *Web) APIPostTimeLog(ctx *gin.Context) {
	timeLog := models.TimeLog{Id: bson.NewObjectId()}

	if err := ctx.ShouldBind(&timeLog); err != nil {
		handleBadRequest(ctx, err)
	}

	_, err := web.database.SaveTimeLog(&timeLog)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, APIPostTimeLogSuccessResponse{true})
}

// APIGetTimeLog
// @Router /timeLogs/{timeLogId} [get]
// @Summary Get time log
// @Param timeLogId path string true "Time log id"
// @Tags TimeLog
// @Produce json
// @Success 200 {object} models.TimeLog
// @Failure default {object} APIException
func (web *Web) APIGetTimeLog(ctx *gin.Context) {
	targetId := ctx.Param("timeLogId")

	if !bson.IsObjectIdHex(targetId) {
		handleBadRequest(ctx, IdIsNotValidObjectIdError)
		return
	}

	timeLog, err := web.database.GetTimeLogById(targetId)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	if timeLog == nil {
		handleNotFound(ctx)
		return
	}

	ctx.JSON(http.StatusOK, timeLog)
}

type APIPutTimeLogSuccessResponse struct {
	Ok bool `json:"ok"`
}

// APIPutTimeLog
// @Router /timeLogs/{timeLogId} [put]
// @Summary Update a time log
// @Param timeLogId path string true "Time log id"
// @Param timeLog body models.TimeLog true "Time log"
// @Tags TimeLog
// @Produce json
// @Success 200 {object} APIPutTimeLogSuccessResponse
// @Failure default {object} APIException
func (web *Web) APIPutTimeLog(ctx *gin.Context) {
	targetId := ctx.Param("timeLogId")

	if !bson.IsObjectIdHex(targetId) {
		handleBadRequest(ctx, IdIsNotValidObjectIdError)
		return
	}

	var timeLog models.TimeLog
	timeLog.Id = bson.ObjectIdHex(targetId)

	if err := ctx.ShouldBind(&timeLog); err != nil {
		handleBadRequest(ctx, err)
	}

	_, err := web.database.SaveTimeLog(&timeLog)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, APIPutTimeLogSuccessResponse{true})
}

// APIDeleteTimeLog
// @Router /timeLogs/{timeLogId} [delete]
// @Summary Delete a time log
// @Param timeLogId path string true "Time log id"
// @Tags TimeLog
// @Produce json
// @Success 204
// @Failure default {object} APIException
func (web *Web) APIDeleteTimeLog(ctx *gin.Context) {
	targetId := ctx.Param("timeLogId")

	if !bson.IsObjectIdHex(targetId) {
		handleBadRequest(ctx, IdIsNotValidObjectIdError)
		return
	}

	err := web.database.DeleteTimeLog(&models.TimeLog{Id: bson.ObjectIdHex(targetId)})
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.Writer.WriteHeader(http.StatusNoContent)
}

type TimeLogRFIDPostBody struct {
	UID   string `json:"uid"`
	Token string `json:"token"`
}

type TimeLogRFIDPostSuccessResponse struct {
	Status    string    `json:"status"`
	UserName  string    `json:"username"`
	CheckTime time.Time `json:"checkTime"`
}

// TimeLogRFIDPost
// @Router /timeLog/rfid [post]
// @Summary Entry for card reader checkin/out
// @Param body body TimeLogRFIDPostBody true "body"
// @Tags TimeLog
// @Produce json
// @Success 200 {object} TimeLogRFIDPostSuccessResponse
// @Failure default {object} APIException
func (web *Web) TimeLogRFIDPost(ctx *gin.Context) {
	var data TimeLogRFIDPostBody

	err := ctx.ShouldBindJSON(data)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	rfidToken := ""

	// check given token
	if data.Token != rfidToken {
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
	// checkin
	err = web.StudentCheckin(user.UserName, "")
	if err == nil {
		// checkin response if no error
		response, err := json.Marshal(TimeLogRFIDPostSuccessResponse{"checkin", user.UserName, time.Now()})
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
	err = web.StudentCheckOut(user.UserName)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	// checkout response
	response, err := json.Marshal(TimeLogRFIDPostSuccessResponse{"checkout", user.UserName, time.Now()})
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, response)
}

// APICheckin
// @Router /timeLog/checkin [get]
// @Summary User checkin
// @Param user query string true "user id"
// @Param season query string false "season id"
// @Tags TimeLog
// @Produce json
// @Success 204
// @Failure default {object} APIException
func (web *Web) APICheckin(ctx *gin.Context) {
	userId := ctx.Query("user")

	seasonId := ctx.DefaultQuery("season", "")

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

// APICheckout
// @Router /timeLog/checkout [get]
// @Summary User checkout
// @Param user query string true "user id"
// @Tags TimeLog
// @Produce json
// @Success 204
// @Failure default {object} APIException
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
		// TODO: check exceed last out
		if false {
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

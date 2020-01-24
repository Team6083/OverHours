package web

import (
	"github.com/gin-gonic/gin"
	"gopkg.in/mgo.v2"
	"net/http"
)

//
//import (
//	"errors"
//	"github.com/Team6083/OverHours/models"
//	"net/http"
//	"time"
//)
//
//func (web *Web) leaderboardGET(w http.ResponseWriter, r *http.Request) {
//	session, err := web.pageAccessManage(w, r, PageLogin, true)
//	if err != nil {
//		if err != AuthNoPermission {
//			handleWebErr(w, err)
//		}
//		return
//	}
//
//	if session == nil {
//		return
//	}
//
//	webTemplate, err := web.parseFiles("templates/leaderboard.html", "templates/base.html")
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	currentUser, err := web.database.GetUserByUserName(session.Username)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//	if currentUser == nil {
//		handleWebErr(w, errors.New("user is nil"))
//		return
//	}
//
//	ranking, err := web.database.GetRankingBySeason(web.settings.SeasonId)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	userTimeLogs, err := web.database.GetTimeLogsByUserWithSpecificSeason(currentUser.Username, web.settings.SeasonId)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	names, err := web.database.GetUserNameMap()
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	data := struct {
//		Ranking       []models.TimeLogSummary
//		UserTotalTime time.Duration
//		UserRank      int
//		UserNames     map[string]string
//	}{ranking, models.CalculateTotalTimes(userTimeLogs), 0, names}
//
//	for i, rData := range ranking {
//		if rData.UserID == currentUser.Username {
//			data.UserRank = i + 1
//		}
//	}
//
//	err = webTemplate.ExecuteTemplate(w, "base", data)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//}

func (web *Web) HandleBoardRoutes(router *gin.RouterGroup) {
	router.GET("s", web.APIGetBoards)
}

// API Handlers

// GET /boards/leaderboard
func (web *Web) APIGetBoards(ctx *gin.Context) {
	seasonId := ctx.Param("SeasonId")

	season, err := web.database.GetRankingBySeason(seasonId)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, season)
}

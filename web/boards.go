package web

import (
	"github.com/gin-gonic/gin"
	"gopkg.in/mgo.v2"
	"net/http"
)

func (web *Web) HandleBoardRoutes(router *gin.Engine) {
	boardsRouter := router.Group("/boards")
	boardsRouter.GET("/season/:seasonId", web.APIGetSeasonBoards)
}

// API Handlers

// GET /boards/season/:SeasonId
func (web *Web) APIGetSeasonBoards(ctx *gin.Context) {
	seasonId := ctx.Param("seasonId")

	season, err := web.database.GetRankingBySeason(seasonId)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, season)
}

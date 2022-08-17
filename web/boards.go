package web

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/globalsign/mgo"
)

func (web *Web) HandleBoardRoutes(router *gin.Engine) {
	boardsRouter := router.Group("/boards")
	boardsRouter.GET("/season/:seasonId", web.APIGetSeasonBoards)
}

// API Handlers

// APIGetSeasonBoards
// @Router /boards/season/:SeasonId [get]
// @Summary Get season boards
// @Tags board
// @Accept json
// @Param seasonId path string true "season id"
// @Produce json
// @Success 200 {object} []models.TimeLogSummary
func (web *Web) APIGetSeasonBoards(ctx *gin.Context) {
	seasonId := ctx.Param("seasonId")

	season, err := web.database.GetRankingBySeason(seasonId)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, season)
}

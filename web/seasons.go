package web

import (
	"errors"
	"net/http"

	"github.com/Team6083/OverHours/models"
	"github.com/gin-gonic/gin"
	"github.com/globalsign/mgo/bson"
)

func (web *Web) HandleSeasonRoutes(router *gin.Engine) {
	seasonGroup := router.Group("/seasons")
	seasonGroup.GET("/:teamId", web.APIGetTeamSeasons)
	seasonGroup.GET("/:seasonId", web.APIGetSeason)
	seasonGroup.POST("/", web.APIPostSeason)
	seasonGroup.PUT("/:seasonId", web.APIPutSeason)
	seasonGroup.DELETE("/:seasonId", web.APIDeleteSeason)
}

// APIGetSeasons
// @Router /seasons [get]
// @Summary Get all seasons
// @Tags season
// @Accept json
// @Param teamId path string true "team id"
// @Produce json
// @Success 200 {object} []models.Season
func (web *Web) APIGetTeamSeasons(ctx *gin.Context) {
	teamId := ctx.Param("teamId")

	if !bson.IsObjectIdHex(teamId) {
		handleWebErr(ctx, errors.New("team id not valid"))
		return
	}

	seasons, err := web.database.GetSeasonsByTeamId(teamId)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, seasons)
}

// APIGetSeason
// @Router /seasons [get]
// @Summary Get season
// @Tags season
// @Accept json
// @Param seasonId path string true "season id"
// @Produce json
// @Success 200 {object} models.Season
func (web *Web) APIGetSeason(ctx *gin.Context) {
	seasonId := ctx.Param("seasonId")

	if !bson.IsObjectIdHex(seasonId) {
		handleWebErr(ctx, errors.New("season id not valid"))
		return
	}

	season, err := web.database.GetSeasonById(seasonId)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, season)
}

// APIPostSeason
// @Router /seasons/:seasonId [post]
// @Summary Create season
// @Tags season
// @Accept json
// @Param body body models.Season true "Put season body"
// @Produce json
// @Success 201 {object} mgo.ChangeInfo
func (web *Web) APIPostSeason(ctx *gin.Context) {
	season := models.Season{Id: bson.NewObjectId()}

	if err := ctx.ShouldBind(&season); err != nil {
		handleBadRequest(ctx, err)
		return
	}

	change, err := web.database.SaveSeason(&season)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusCreated, change)
}

// APIPutSeason
// @Router /seasons/:seasonId [put]
// @Summary Modify season
// @Tags season
// @Accept json
// @Param seasonId path string true "season id"
// @Param body body models.Season true "Put season body"
// @Produce json
// @Success 202 {object} mgo.ChangeInfo
func (web *Web) APIPutSeason(ctx *gin.Context) {
	seasonId := ctx.Param("seasonId")

	if !bson.IsObjectIdHex(seasonId) {
		handleBadRequest(ctx, errors.New("id not valid"))
		return
	}

	season := models.Season{Id: bson.ObjectIdHex(seasonId)}

	if err := ctx.ShouldBind(&season); err != nil {
		handleWebErr(ctx, err)
		return
	}

	change, err := web.database.SaveSeason(&season)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusAccepted, change)
}

// APIDeleteSeason
// @Router /seasons/:seasonId [put]
// @Summary Delete season
// @Tags season
// @Accept json
// @Param seasonId path string true "season id"
// @Produce json
// @Success 204
func (web *Web) APIDeleteSeason(ctx *gin.Context) {
	seasonId := ctx.Param("seasonId")

	if !bson.IsObjectIdHex(seasonId) {
		handleBadRequest(ctx, errors.New("id not valid"))
		return
	}

	err := web.database.DeleteSeason(bson.ObjectIdHex(seasonId))
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.Writer.WriteHeader(http.StatusNoContent)
}

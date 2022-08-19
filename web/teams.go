package web

import (
	"errors"
	"net/http"

	"github.com/Team6083/OverHours/models"
	"github.com/gin-gonic/gin"
	"github.com/globalsign/mgo/bson"
)

func (web *Web) HandleTeamsRoutes(router *gin.Engine) {
	teamGroup := router.Group("/teams")
	teamGroup.GET("/", web.APIGetTeams)
	teamGroup.GET("/:teamId", web.APIGetTeam)
	teamGroup.POST("/", web.APIPostTeam)
	teamGroup.PUT("/:teamId", web.APIPutTeam)
	teamGroup.DELETE("/:teamId", web.APIDeleteTeam)
}

// APIGetTeams
// @Router /teams [get]
// @Summary Get all teams
// @Tags team
// @Accept json
// @Produce json
// @Success 200 {object} models.Team
func (web *Web) APIGetTeams(ctx *gin.Context) {
	teams, err := web.database.GetAllTeams()
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, teams)
}

// APIGetTeam
// @Router /teams/:teamId [get]
// @Summary Get team
// @Tags team
// @Accept json
// @Param teamId path string true "team id"
// @Produce json
// @Success 200 {object} models.Team
func (web *Web) APIGetTeam(ctx *gin.Context) {
	teamId := ctx.Param("teamId")

	if !bson.IsObjectIdHex(teamId) {
		handleBadRequest(ctx, errors.New("id not valid"))
		return
	}

	team, err := web.database.GetTeamById(teamId)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, team)
}

// APIPostTeam
// @Router /teams [post]
// @Summary Create team
// @Tags team
// @Accept json
// @Param body body models.Team true "Post team body"
// @Produce json
// @Success 201 {object} mgo.ChangeInfo
func (web *Web) APIPostTeam(ctx *gin.Context) {
	team := models.Team{Id: bson.NewObjectId()}

	if err := ctx.ShouldBind(&team); err != nil {
		handleBadRequest(ctx, err)
		return
	}

	change, err := web.database.SaveTeam(&team)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusCreated, change)
}

// APIPutTeam
// @Router /teams/:teamId [put]
// @Summary Modify team
// @Tags team
// @Accept json
// @Param teamId path string true "team id"
// @Param body body models.Team true "Put team body"
// @Produce json
// @Success 202 {object} mgo.ChangeInfo
func (web *Web) APIPutTeam(ctx *gin.Context) {
	teamId := ctx.Param("teamId")
	if !bson.IsObjectIdHex(teamId) {
		handleBadRequest(ctx, errors.New("id not valid"))
		return
	}

	team := models.Team{Id: bson.ObjectIdHex(teamId)}

	if err := ctx.ShouldBind(&team); err != nil {
		handleWebErr(ctx, err)
		return
	}

	change, err := web.database.SaveTeam(&team)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusAccepted, change)
}

// APIDeleteTeam
// @Router /teams/:teamId [delete]
// @Summary Delete team
// @Tags team
// @Accept json
// @Param teamId path string true "team id"
// @Produce json
// @Success 204
func (web *Web) APIDeleteTeam(ctx *gin.Context) {
	teamId := ctx.Param("teamId")
	if !bson.IsObjectIdHex(teamId) {
		handleBadRequest(ctx, errors.New("id not valid"))
		return
	}

	err := web.database.DeleteTeam(bson.ObjectIdHex(teamId))
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.Writer.WriteHeader(http.StatusNoContent)
}

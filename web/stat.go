package web

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

func (web *Web) HandleStatRoutes(router *gin.Engine) {
	statGroup := router.Group("/stat")
	statGroup.GET("/users", web.APIGetStatUsers)
}

func (web *Web) APIGetStatUsers(ctx *gin.Context) {
	seasonId := ctx.Query("seasonId")
	if seasonId == "" {

	}

	ranking, err := web.database.GetRankingBySeason(seasonId)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	type UserInfoPayload struct {
		UserId    string  `json:"userId"`
		TotalTime float64 `json:"totalTime"`
	}

	var userInfos []UserInfoPayload

	for _, v := range ranking {
		userInfos = append(userInfos, UserInfoPayload{UserId: v.UserID, TotalTime: v.TotalTime.Seconds()})
	}

	type StatUsersPayload struct {
		Users    []UserInfoPayload `json:"users"`
		SeasonId string            `json:"seasonId"`
	}

	ctx.JSON(http.StatusOK, StatUsersPayload{SeasonId: seasonId, Users: userInfos})
}

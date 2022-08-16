package web

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type UserInfoPayload struct {
	UserId    string  `json:"userId"`
	TotalTime float64 `json:"totalTime"`
}

type StatUsersPayload struct {
	Users    []UserInfoPayload `json:"users"`
	SeasonId string            `json:"seasonId"`
}

func (web *Web) HandleStatRoutes(router *gin.Engine) {
	statGroup := router.Group("/stat")
	statGroup.GET("/users", web.APIGetStatUsers)
}

// APIGetStatUsers
// @Router /stat/users [get]
// @Summary Get stat users
// @Tags stat
// @Accept json
// @Param seasonId path string true "seasonId"
// @Produce json
// @Success 200 {object} StatUsersPayload
func (web *Web) APIGetStatUsers(ctx *gin.Context) {
	seasonId := ctx.Query("seasonId")
	if seasonId == "" {

	}

	ranking, err := web.database.GetRankingBySeason(seasonId)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	var userInfos []UserInfoPayload

	for _, v := range ranking {
		userInfos = append(userInfos, UserInfoPayload{UserId: v.UserID, TotalTime: v.TotalTime.Seconds()})
	}

	ctx.JSON(http.StatusOK, StatUsersPayload{SeasonId: seasonId, Users: userInfos})
}

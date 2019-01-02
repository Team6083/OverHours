package web

import (
	"errors"
	"github.com/Team6083/OverHours/models"
	"net/http"
)

func (web *Web) leaderboardGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, true)
	if err != nil {
		if err != AuthNoPermission {
			handleWebErr(w, err)
		}
		return
	}

	if session == nil {
		return
	}

	webTemplate, err := web.parseFiles("templates/leaderboard.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	currentUser, err := web.database.GetUserByUserName(session.Username)
	if err != nil {
		handleWebErr(w, err)
		return
	}
	if currentUser == nil {
		handleWebErr(w, errors.New("user is nil"))
		return
	}

	ranking, err := web.database.GetRankingBySeason(web.settings.SeasonId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	data := struct {
		Ranking  []models.TimeLogSummary
		UserRank int
	}{ranking, 0}

	for i, rData := range ranking {
		if rData.UserID == currentUser.Username {
			data.UserRank = i + 1
		}
	}

	err = webTemplate.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

package web

import (
	"github.com/Team6083/OverHours/models"
	"net/http"
	"time"
)

func (web *Web) leaderboardGET(w http.ResponseWriter, r *http.Request) {
	currentUser := r.Context().Value("user").(*models.User)

	webTemplate, err := web.parseFiles("templates/leaderboard.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	ranking, err := web.database.GetRankingBySeason(web.settings.SeasonId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	userTimeLogs, err := web.database.GetTimeLogsByUserWithSpecificSeason(currentUser.Username, web.settings.SeasonId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	names, err := web.database.GetUserNameMap()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	data := struct {
		Ranking       []models.TimeLogSummary
		UserTotalTime time.Duration
		UserRank      int
		UserNames     map[string]string
	}{ranking, models.CalculateTotalTimes(userTimeLogs), 0, names}

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

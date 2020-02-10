package web

import (
	"encoding/json"
	"errors"
	"fmt"
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

func (web *Web) ChartDataGet(w http.ResponseWriter, r *http.Request) {
	tokens, ok := r.URL.Query()["token"]

	if !ok || len(tokens[0]) < 1 {
		handleBadRequest(w, errors.New("token is missing"))
		return
	}

	token := tokens[0]

	if token != web.settings.Token {
		handleForbidden(w, errors.New("invalid token"))
		return
	}

	startDates, ok := r.URL.Query()["startDate"]

	if !ok || len(startDates[0]) < 1 {
		handleBadRequest(w, errors.New("startDate is missing"))
		return
	}

	startDate, err := time.Parse(time.RFC3339, startDates[0])
	if err != nil {
		handleBadRequest(w, err)
		return
	}

	endDates, ok := r.URL.Query()["endDate"]

	if !ok || len(endDates[0]) < 1 {
		handleBadRequest(w, errors.New("endDate is missing"))
		return
	}

	endDate, err := time.Parse(time.RFC3339, endDates[0])
	if err != nil {
		handleBadRequest(w, err)
		return
	}

	seasons, ok := r.URL.Query()["season"]

	season := web.settings.SeasonId
	if ok && len(seasons[0]) >= 1 {
		season = seasons[0]
	}

	countCurrentIns, ok := r.URL.Query()["countCurrentIn"]

	countCurrentIn := false
	if ok && len(countCurrentIns[0]) >= 1 && countCurrentIns[0] == "true" {
		countCurrentIn = true
	}

	timeLogs, err := web.database.GetTimeLogsBySeason(season)

	b := timeLogs[:0]
	for _, x := range timeLogs {
		if startDate.Before(x.GetInTime()) && endDate.After(x.GetInTime()) && (x.IsOut() || countCurrentIn) {
			b = append(b, x)
		}
	}

	timeLogs = b

	data, err := json.Marshal(timeLogs)
	if err != nil {
		handleBadRequest(w, err)
		return
	}

	w.Header().Add("Content-Type", "application/json")

	w.WriteHeader(http.StatusOK)
	_, err = w.Write(data)
	if err != nil {
		fmt.Print(err)
	}
}

func (web *Web) ChartGet(w http.ResponseWriter, r *http.Request) {
	webTemplate, err := web.parseFiles("templates/chart.html", "templates/base.html")

	err = webTemplate.ExecuteTemplate(w, "base", struct{ Token string }{web.settings.Token})
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

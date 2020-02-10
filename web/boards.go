package web

import (
	"github.com/Team6083/OverHours/models"
	"gopkg.in/mgo.v2"
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

func (web *Web) ChartGet(w http.ResponseWriter, r *http.Request) {
	webTemplate, err := web.parseFiles("templates/chart.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	type HoursCalc struct {
		YearDay int
		Count   int
	}

	timeLogs, err := web.database.GetTimeLogsBySeason(web.settings.SeasonId)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(w, err)
		return
	}

	data := struct {
		Data []HoursCalc
	}{}

	data.Data = make([]HoursCalc, 365)
	dd := map[int]map[string]bool{}

	for i := 0; i < 365; i++ {
		data.Data[i].Count = 0
		data.Data[i].YearDay = i + 1
		dd[i] = make(map[string]bool)
	}

	for _, v := range timeLogs {
		if !dd[v.GetInTime().YearDay()-1][v.UserID] {
			dd[v.GetInTime().YearDay()-1][v.UserID] = true
			data.Data[v.GetInTime().YearDay()-1].Count++
		}
	}

	err = webTemplate.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

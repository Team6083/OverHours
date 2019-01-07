package web

import (
	"github.com/Team6083/OverHours/models"
	"net/http"
	"strconv"
)

func (web *Web) SettingsGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLeader, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}
	if session == nil {
		return
	}

	user, err := web.database.GetUserByUserName(session.Username)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if !user.CheckPermissionLevel(models.PermissionAdmin) {
		web.handle401(w, r)
		return
	}

	template, err := web.parseFiles("templates/settings.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	settings, err := web.database.GetSetting()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	data := struct {
		Settings *models.Setting
	}{settings}

	err = template.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

func (web *Web) SettingsPOST(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		web.handle401(w, r)
		return
	}

	currUser, err := web.database.GetUserByUserName(session.Username)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if !currUser.CheckPermissionLevel(models.PermissionAdmin) {
		web.handle401(w, r)
		return
	}

	err = r.ParseForm()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	settings, err := web.database.GetSetting()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if r.Form["seasonId"] != nil {
		settings.SeasonId = r.Form["seasonId"][0]
	}

	if r.Form["lastOut"] != nil {
		lastOut, err := strconv.Atoi(r.Form["lastOut"][0])
		if err != nil {
			handleWebErr(w, err)
			return
		}
		settings.LastOut = lastOut
	}

	if r.Form["timezone"] != nil {
		settings.TimeZone = r.Form["timezone"][0]
	}

	_, err = web.database.SaveSetting(settings)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, "/settings/renew", http.StatusSeeOther)
}

func (web *Web) RenewSettingsGET(w http.ResponseWriter, r *http.Request) {
	err := web.readSettings()
	if err != nil {
		panic(err)
	}

	http.Redirect(w, r, "/settings", http.StatusSeeOther)
}

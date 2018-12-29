package web

import (
	"github.com/Team6083/OverHours/models"
	"gopkg.in/mgo.v2"
	"net/http"
)

func (web *Web) UsersGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageAdmin, true)
	if err != nil {
		if err != AuthNoPermission {
			handleWebErr(w, err)
		}
		return
	}

	if session == nil {
		return
	}

	webTemplate, err := web.parseFiles("templates/users.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	user, err := web.database.GetUserByUserName(session.Username)
	if err != nil {
		handleWebErr(w, err)
	}

	var users []models.User
	data := struct {
		Users []models.User
	}{users}

	if user != nil {
		if user.CheckPermissionLevel(models.PermissionAdmin) {
			users, err = web.database.GetAllUsers()
			if err != nil && err != mgo.ErrNotFound {
				handleWebErr(w, err)
				return
			}
		} else {

		}
	}
	data.Users = users

	err = webTemplate.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

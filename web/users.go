package web

import (
	"errors"
	"github.com/Team6083/OverHours/models"
	"github.com/gorilla/mux"
	"github.com/satori/go.uuid"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"net/http"
	"strconv"
)

func (web *Web) UsersGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLeader, true)
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
			tempUsers, err := web.database.GetAllUsers()
			if err != nil && err != mgo.ErrNotFound {
				handleWebErr(w, err)
				return
			}

			for _, userData := range tempUsers {
				if userData.PermissionLevel < user.PermissionLevel || userData.Username == user.Username {
					users = append(users, userData)
				}
			}
		}
	}
	data.Users = users

	err = webTemplate.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

// UsersForm

func (web *Web) UsersFormGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		web.handle401(w, r)
		return
	}

	user, err := web.database.GetUserByUserName(session.Username)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	template, err := web.parseFiles("templates/users_form.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	editData := struct {
		Id                 string
		UUID               string
		UserName           string
		Name               string
		Password           string
		Email              string
		FirstY             int
		GradY              int
		PLevel             int
		PasswordNeedChange bool
	}{"", "", "", "", "", "", 0, 0, 0, false}

	data := struct {
		EditUser struct {
			Id                 string
			UUID               string
			UserName           string
			Name               string
			Password           string
			Email              string
			FirstY             int
			GradY              int
			PLevel             int
			PasswordNeedChange bool
		}
		New         bool
		CurrentUser models.User
	}{editData, true, *user}

	editTargetUserName, ok := r.URL.Query()["edit"]
	if ok {
		editUser, err := web.database.GetUserByUserName(editTargetUserName[0])
		if err != nil && err != mgo.ErrNotFound {
			handleWebErr(w, err)
			return
		}
		if editUser != nil {
			if user.PermissionLevel > editUser.PermissionLevel || user.Username == editUser.Username || user.CheckPermissionLevel(models.PermissionSuper) {
				data.EditUser.Id = editUser.Id.String()
				data.EditUser.UserName = editUser.Username
				data.EditUser.Name = editUser.Name
				data.EditUser.UUID = editUser.UUID
				data.EditUser.Password = editUser.Password
				data.EditUser.Email = editUser.Email
				data.EditUser.FirstY = editUser.FirstYear
				data.EditUser.GradY = editUser.GraduationYear
				data.EditUser.PLevel = editUser.PermissionLevel
				data.EditUser.PasswordNeedChange = editUser.PasswordNeedChange
				data.New = false
			}
		}
	}

	err = template.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
	}
}

func (web *Web) UsersFormPOST(w http.ResponseWriter, r *http.Request) {
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

	err = r.ParseForm()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	data := struct {
		Name               string
		UserName           string
		pLevel             string
		email              string
		firstYStr          string
		gradYStr           string
		UUID               string
		PasswordNeedChange bool
	}{"", "", "", "", "", "", "", false}

	if r.Form["userName"] == nil || r.Form["name"] == nil || r.Form["pLevel"] == nil {
		handleBadRequest(w, errors.New("some fields are missing"+r.Form.Encode()))
		return
	}

	targetUserName := r.Form["userName"][0]

	user, err := web.database.GetUserByUserName(targetUserName)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(w, err)
		return
	}

	if user != nil {
		if currUser.PermissionLevel <= user.PermissionLevel && currUser.Username != user.Username {
			handleBadRequest(w, errors.New("you didn't have the permission to edit this user"))
			return
		}

		if len(r.Form["passwordNeedChange"]) > 0 {
			data.PasswordNeedChange = r.Form["passwordNeedChange"][0] == "on"
		} else {
			data.PasswordNeedChange = false
		}
	} else {
		user = new(models.User)
		user.Username = targetUserName
		user.Id = bson.NewObjectId()
		data.PasswordNeedChange = true
		user.Password = uuid.NewV4().String()
	}

	user.PasswordNeedChange = data.PasswordNeedChange
	user.Name = r.Form["name"][0]

	pLevel := r.Form["pLevel"][0]
	var targetPLevel int
	switch pLevel {
	case "Member":
		targetPLevel = models.PermissionMember
	case "Leader":
		targetPLevel = models.PermissionLeader
	case "Admin":
		targetPLevel = models.PermissionAdmin
	case "Super":
		targetPLevel = models.PermissionSuper
	default:
		targetPLevel = models.PermissionMember
	}

	user.PermissionLevel = targetPLevel

	if !currUser.CheckPermissionLevel(user.PermissionLevel) {
		handleBadRequest(w, errors.New("you didn't have the permission to change to permission level to "+pLevel))
		return
	}

	if r.Form["email"] != nil {
		user.Email = r.Form["email"][0]
	}
	if r.Form["firstYear"] != nil {
		data.firstYStr = r.Form["firstYear"][0]
	}
	if r.Form["graduationYear"] != nil {
		data.gradYStr = r.Form["graduationYear"][0]
	}

	if r.Form["UUID"] != nil {
		data.UUID = r.Form["UUID"][0]
	} else {
		uuid := uuid.NewV4()
		data.UUID = uuid.String()
	}

	user.UUID = data.UUID
	if data.firstYStr != "" {
		user.FirstYear, err = strconv.Atoi(data.firstYStr)
		if err != nil {
			handleWebErr(w, err)
			return
		}
	}
	if data.gradYStr != "" {
		user.GraduationYear, err = strconv.Atoi(data.gradYStr)
		if err != nil {
			handleWebErr(w, err)
			return
		}
	}

	_, err = web.database.SaveUser(*user)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	var redirectURI string
	if currUser.CheckPermissionLevel(models.PermissionLeader) {
		redirectURI = "/users"
	} else {
		redirectURI = "/"
	}

	http.Redirect(w, r, redirectURI, http.StatusSeeOther)
}

func (web *Web) UsersDeleteGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLeader, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		return
	}

	vars := mux.Vars(r)
	targetId := vars["id"]

	user, err := web.database.GetUserByUUID(targetId)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	err = web.database.DeleteUser(*user)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, "/users", http.StatusSeeOther)
}

func (web *Web) UserChangePasswordGET(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		web.handle401(w, r)
		return
	}

	user, err := web.database.GetUserByUserName(session.Username)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	template, err := web.parseFiles("templates/users_change_password.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	data := struct {
		Name        string
		Identify    string
		ForceChange bool
	}{}

	editTargetUserName, ok := r.URL.Query()["edit"]
	if ok {
		editUser, err := web.database.GetUserByUserName(editTargetUserName[0])
		if err != nil && err != mgo.ErrNotFound {
			handleWebErr(w, err)
			return
		}

		if editUser == nil {
			handleBadRequest(w, errors.New("user not found"))
			return
		}

		if editUser.GetIdentify() != user.GetIdentify() && !user.CheckPermissionLevel(models.PermissionAdmin) {
			web.handle403(w, r)
			return
		}

		data.Identify = editUser.GetIdentify()
		data.Name = editUser.Name
	}

	force, ok := r.URL.Query()["force"]
	data.ForceChange = ok && force[0] == "true"

	err = template.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
	}
}

func (web *Web) UserChangePasswordPOST(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, true)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session == nil {
		web.handle401(w, r)
		return
	}

	user, err := web.database.GetUserByUserName(session.Username)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	err = r.ParseForm()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	editTargetQuery, ok := r.Form["target"]
	if !ok {
		handleBadRequest(w, errors.New("parameter target not found"))
		return
	}

	editUser, err := web.database.GetUserByUserName(editTargetQuery[0])
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(w, err)
		return
	}

	if editUser == nil {
		handleBadRequest(w, errors.New("target not found"))
		return
	}

	if editUser.GetIdentify() != user.GetIdentify() && user.PermissionLevel <= editUser.PermissionLevel && user.PermissionLevel != models.PermissionSuper {
		handleForbidden(w, errors.New("no permission"))
		return
	}

	pswQuery, ok := r.Form["password"]
	if !ok || len(pswQuery[0]) < 1 {
		handleBadRequest(w, errors.New("password not provided or is empty"))
		return
	}

	editUser.Password = pswQuery[0]
	editUser.PasswordNeedChange = false

	_, err = web.database.SaveUser(*editUser)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, "/users", http.StatusSeeOther)
}

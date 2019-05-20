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

	editDate := struct {
		Id       string
		UUID     string
		UserName string
		Name     string
		Password string
		Email    string
		FirstY   int
		GradY    int
		PLevel   int
	}{"", "", "", "", "", "", 0, 0, 0}

	data := struct {
		EditUser struct {
			Id       string
			UUID     string
			UserName string
			Name     string
			Password string
			Email    string
			FirstY   int
			GradY    int
			PLevel   int
		}
		New         bool
		CurrentUser models.User
	}{editDate, true, *user}

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

	datas := struct {
		Name      string
		UserName  string
		pLevel    string
		email     string
		firstYStr string
		gradYStr  string
		UUID      string
	}{"", "", "", "", "", "", ""}

	if r.Form["userName"] == nil || r.Form["name"] == nil || r.Form["pLevel"] == nil {
		handleBadRequest(w, errors.New("some fields are missing"+r.Form.Encode()))
		return
	}

	user := new(models.User)

	user.Username = r.Form["userName"][0]
	user.Name = r.Form["name"][0]
	pLevel := r.Form["pLevel"][0]

	oldUser, err := web.database.GetUserByUserName(user.Username)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(w, err)
		return
	}

	switch pLevel {
	case "Member":
		user.PermissionLevel = models.PermissionMember
	case "Leader":
		user.PermissionLevel = models.PermissionLeader
	case "Admin":
		user.PermissionLevel = models.PermissionAdmin
	case "Super":
		user.PermissionLevel = models.PermissionSuper
	default:
		user.PermissionLevel = models.PermissionMember
	}

	if oldUser != nil {
		if currUser.PermissionLevel <= oldUser.PermissionLevel && currUser.Username != user.Username {
			handleBadRequest(w, errors.New("you didn't have the permission to edit this user"))
			return
		}
	}

	if !currUser.CheckPermissionLevel(user.PermissionLevel) {
		handleBadRequest(w, errors.New("you didn't have the permission to change to permission level to "+pLevel))
		return
	}

	if r.Form["email"] != nil {
		user.Email = r.Form["email"][0]
	}
	if r.Form["firstYear"] != nil {
		datas.firstYStr = r.Form["firstYear"][0]
	}
	if r.Form["graduationYear"] != nil {
		datas.gradYStr = r.Form["graduationYear"][0]
	}
	if r.Form["password"] != nil {
		user.Password = r.Form["password"][0]
	} else {
		if oldUser != nil {
			user.Password = oldUser.Password
		}
	}
	if r.Form["UUID"] != nil {
		datas.UUID = r.Form["UUID"][0]
	} else {
		uuid := uuid.NewV4()
		datas.UUID = uuid.String()
	}

	user.UUID = datas.UUID
	if datas.firstYStr != "" {
		user.FirstYear, err = strconv.Atoi(datas.firstYStr)
		if err != nil {
			handleWebErr(w, err)
			return
		}
	}
	if datas.gradYStr != "" {
		user.GraduationYear, err = strconv.Atoi(datas.gradYStr)
		if err != nil {
			handleWebErr(w, err)
			return
		}
	}

	if oldUser != nil {
		user.Id = oldUser.Id
	} else {
		user.Id = bson.NewObjectId()
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

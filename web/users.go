package web

import (
	"errors"
	"github.com/Team6083/OverHours/models"
	"github.com/satori/go.uuid"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"net/http"
	"strconv"
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

	data := struct {
		Id       string
		UUID     string
		UserName string
		Name     string
		Password string
		Email    string
		FirstY   int
		GradY    int
		PLevel   int
		CPLevel  int
		New      bool
	}{"", "", "", "", "", "", 0, 0, 0, user.PermissionLevel, true}

	editTargetUserName, ok := r.URL.Query()["edit"]
	if ok {
		editUser, err := web.database.GetUserByUserName(editTargetUserName[0])
		if err != nil && err != mgo.ErrNotFound {
			handleWebErr(w, err)
			return
		}
		if editUser != nil {
			if user.PermissionLevel > editUser.PermissionLevel || user.Username == editUser.Username || user.CheckPermissionLevel(models.PermissionSuper) {
				data.Id = editUser.Id.String()
				data.UserName = editUser.Username
				data.Name = editUser.Name
				data.UUID = editUser.UUID
				data.Password = editUser.Password
				data.Email = editUser.Email
				data.FirstY = editUser.FirstYear
				data.GradY = editUser.GraduationYear
				data.PLevel = editUser.PermissionLevel
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

	olduser, err := web.database.GetUserByUserName(user.Username)
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

	if olduser != nil {
		if currUser.PermissionLevel <= olduser.PermissionLevel && currUser.Username != user.Username {
			handleBadRequest(w, errors.New("you didn't have the permission to edit this user"))
			return
		}
	}

	if !currUser.CheckPermissionLevel(user.PermissionLevel) {
		handleBadRequest(w, errors.New("you didn't have the permission to change to permission level to "+pLevel))
		return
	}

	if r.Form["email"] != nil {
		datas.email = r.Form["email"][0]
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
		if olduser != nil {
			user.Password = olduser.Password
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

	if olduser != nil {
		user.Id = olduser.Id
	} else {
		user.Id = bson.NewObjectId()
	}

	_, err = web.database.SaveUser(*user)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

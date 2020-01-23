package web

import (
	"errors"
	"github.com/Team6083/OverHours/models"
	"github.com/gin-gonic/gin"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"net/http"
)

//func (web *Web) UsersGET(w http.ResponseWriter, r *http.Request) {
//	session, err := web.pageAccessManage(w, r, PageLeader, true)
//	if err != nil {
//		if err != AuthNoPermission {
//			handleWebErr(w, err)
//		}
//		return
//	}
//
//	if session == nil {
//		return
//	}
//
//	webTemplate, err := web.parseFiles("templates/users.html", "templates/base.html")
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	user, err := web.database.GetUserByUserName(session.Username)
//	if err != nil {
//		handleWebErr(w, err)
//	}
//
//	var users []models.User
//	data := struct {
//		Users []models.User
//	}{users}
//
//	if user != nil {
//		if user.CheckPermissionLevel(models.PermissionAdmin) {
//			users, err = web.database.GetAllUsers()
//			if err != nil && err != mgo.ErrNotFound {
//				handleWebErr(w, err)
//				return
//			}
//		} else {
//			tempUsers, err := web.database.GetAllUsers()
//			if err != nil && err != mgo.ErrNotFound {
//				handleWebErr(w, err)
//				return
//			}
//
//			for _, userData := range tempUsers {
//				if userData.PermissionLevel < user.PermissionLevel || userData.Username == user.Username {
//					users = append(users, userData)
//				}
//			}
//		}
//	}
//	data.Users = users
//
//	err = webTemplate.ExecuteTemplate(w, "base", data)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//}
//
//// UsersForm
//
//func (web *Web) UsersFormGET(w http.ResponseWriter, r *http.Request) {
//	session, err := web.pageAccessManage(w, r, PageLogin, true)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	if session == nil {
//		web.handle401(w, r)
//		return
//	}
//
//	user, err := web.database.GetUserByUserName(session.Username)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	template, err := web.parseFiles("templates/users_form.html", "templates/base.html")
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	editData := struct {
//		Id                 string
//		UUID               string
//		UserName           string
//		Name               string
//		Password           string
//		Email              string
//		FirstY             int
//		GradY              int
//		PLevel             int
//		PasswordNeedChange bool
//	}{"", "", "", "", "", "", 0, 0, 0, false}
//
//	data := struct {
//		EditUser struct {
//			Id                 string
//			UUID               string
//			UserName           string
//			Name               string
//			Password           string
//			Email              string
//			FirstY             int
//			GradY              int
//			PLevel             int
//			PasswordNeedChange bool
//		}
//		New         bool
//		CurrentUser models.User
//	}{editData, true, *user}
//
//	editTargetUserName, ok := r.URL.Query()["edit"]
//	if ok {
//		editUser, err := web.database.GetUserByUserName(editTargetUserName[0])
//		if err != nil && err != mgo.ErrNotFound {
//			handleWebErr(w, err)
//			return
//		}
//		if editUser != nil {
//			if user.PermissionLevel > editUser.PermissionLevel || user.Username == editUser.Username || user.CheckPermissionLevel(models.PermissionSuper) {
//				data.EditUser.Id = editUser.Id.String()
//				data.EditUser.UserName = editUser.Username
//				data.EditUser.Name = editUser.Name
//				data.EditUser.Password = editUser.Password
//				data.EditUser.Email = editUser.Email
//				data.EditUser.FirstY = editUser.FirstYear
//				data.EditUser.GradY = editUser.GraduationYear
//				data.EditUser.PLevel = editUser.PermissionLevel
//				data.EditUser.PasswordNeedChange = editUser.PasswordNeedChange
//				data.New = false
//			}
//		}
//	}
//
//	err = template.ExecuteTemplate(w, "base", data)
//	if err != nil {
//		handleWebErr(w, err)
//	}
//}
//
//func (web *Web) UsersFormPOST(w http.ResponseWriter, r *http.Request) {
//	session, err := web.pageAccessManage(w, r, PageLogin, true)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	if session == nil {
//		web.handle401(w, r)
//		return
//	}
//
//	currUser, err := web.database.GetUserByUserName(session.Username)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	err = r.ParseForm()
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	datas := struct {
//		Name               string
//		UserName           string
//		pLevel             string
//		email              string
//		firstYStr          string
//		gradYStr           string
//		PasswordNeedChange bool
//	}{"", "", "", "", "", "", false}
//
//	if r.Form["userName"] == nil || r.Form["name"] == nil || r.Form["pLevel"] == nil {
//		handleBadRequest(w, errors.New("some fields are missing"+r.Form.Encode()))
//		return
//	}
//
//	user := new(models.User)
//
//	user.Username = r.Form["userName"][0]
//	user.Name = r.Form["name"][0]
//	pLevel := r.Form["pLevel"][0]
//
//	oldUser, err := web.database.GetUserByUserName(user.Username)
//	if err != nil && err != mgo.ErrNotFound {
//		handleWebErr(w, err)
//		return
//	}
//
//	switch pLevel {
//	case "Member":
//		user.PermissionLevel = models.PermissionMember
//	case "Leader":
//		user.PermissionLevel = models.PermissionLeader
//	case "Admin":
//		user.PermissionLevel = models.PermissionAdmin
//	case "Super":
//		user.PermissionLevel = models.PermissionSuper
//	default:
//		user.PermissionLevel = models.PermissionMember
//	}
//
//	if oldUser != nil {
//		if currUser.PermissionLevel <= oldUser.PermissionLevel && currUser.Username != user.Username {
//			handleBadRequest(w, errors.New("you didn't have the permission to edit this user"))
//			return
//		}
//	}
//
//	if !currUser.CheckPermissionLevel(user.PermissionLevel) {
//		handleBadRequest(w, errors.New("you didn't have the permission to change to permission level to "+pLevel))
//		return
//	}
//
//	if r.Form["email"] != nil {
//		user.Email = r.Form["email"][0]
//	}
//	if r.Form["firstYear"] != nil {
//		datas.firstYStr = r.Form["firstYear"][0]
//	}
//	if r.Form["graduationYear"] != nil {
//		datas.gradYStr = r.Form["graduationYear"][0]
//	}
//
//	passwordChanged := false
//
//	if r.Form["password"] != nil {
//		user.Password = r.Form["password"][0]
//		passwordChanged = true
//	} else {
//		if oldUser != nil {
//			user.Password = oldUser.Password
//		}
//	}
//
//	if len(r.Form["passwordNeedChange"]) > 0 {
//		datas.PasswordNeedChange = r.Form["passwordNeedChange"][0] == "on"
//	} else {
//		datas.PasswordNeedChange = false
//	}
//	if passwordChanged {
//		user.PasswordNeedChange = false
//	} else {
//		user.PasswordNeedChange = datas.PasswordNeedChange
//	}
//
//	if datas.firstYStr != "" {
//		user.FirstYear, err = strconv.Atoi(datas.firstYStr)
//		if err != nil {
//			handleWebErr(w, err)
//			return
//		}
//	}
//	if datas.gradYStr != "" {
//		user.GraduationYear, err = strconv.Atoi(datas.gradYStr)
//		if err != nil {
//			handleWebErr(w, err)
//			return
//		}
//	}
//
//	if oldUser != nil {
//		user.Id = oldUser.Id
//	} else {
//		user.Id = bson.NewObjectId()
//	}
//
//	_, err = web.database.SaveUser(*user)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	var redirectURI string
//	if currUser.CheckPermissionLevel(models.PermissionLeader) {
//		redirectURI = "/users"
//	} else {
//		redirectURI = "/"
//	}
//
//	http.Redirect(w, r, redirectURI, http.StatusSeeOther)
//}
//
//func (web *Web) UsersDeleteGET(w http.ResponseWriter, r *http.Request) {
//	session, err := web.pageAccessManage(w, r, PageLeader, true)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	if session == nil {
//		return
//	}
//
//	vars := mux.Vars(r)
//	targetId := vars["id"]
//
//	user, err := web.database.GetUserByID(targetId)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	err = web.database.DeleteUser(*user)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	http.Redirect(w, r, "/users", http.StatusSeeOther)
//}

func (web *Web) HandleUserRoutes(userGroup *gin.RouterGroup) {
	userGroup.GET("s", web.APIGetUsers)

	userGroup.GET("/:id", web.APIGetUser)

	userGroup.POST("s", web.APIPostUser)

	userGroup.PUT("/:UserId", web.APIPutUser)

	userGroup.DELETE("/:id", web.APIDeleteUser)
}

// API handlers

// /users
func (web *Web) APIGetUsers(ctx *gin.Context) {
	users, err := web.database.GetAllUsers()
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, users)
}

// /users/:id
func (web *Web) APIGetUser(ctx *gin.Context) {
	targetId := ctx.Param("id")

	user, err := web.database.GetUserByID(targetId)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, user)
}

// POST /users
func (web *Web) APIPostUser(ctx *gin.Context) {
	user := models.User{Id: bson.NewObjectId()}

	if err := ctx.ShouldBind(&user); err != nil {
		handleBadRequest(ctx, err)
	}

	change, err := web.database.SaveUser(user)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusCreated, change)
}

// PUT /user/:UserId
func (web *Web) APIPutUser(ctx *gin.Context) {
	userId := ctx.Param("UserId")

	if !bson.IsObjectIdHex(userId) {
		handleBadRequest(ctx, errors.New("id is not a valid ObjectId"))
		return
	}

	var user models.User
	user.Id = bson.ObjectIdHex(userId)

	if err := ctx.ShouldBind(&user); err != nil {
		handleBadRequest(ctx, err)
	}

	change, err := web.database.SaveUser(user)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.JSON(http.StatusAccepted, change)
}

// DELETE /users/:id
func (web *Web) APIDeleteUser(ctx *gin.Context) {
	targetId := ctx.Param("id")

	err := web.database.DeleteUser(models.User{Id: bson.ObjectIdHex(targetId)})
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.Writer.WriteHeader(http.StatusNoContent)
}

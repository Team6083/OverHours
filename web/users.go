package web

import (
	"github.com/Team6083/OverHours/models"
	"github.com/gin-gonic/gin"
	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
	"net/http"
)

func (web *Web) HandleUserRoutes(router *gin.Engine) {
	usersGroup := router.Group("/users")
	usersGroup.GET("/", web.APIGetUsers)
	usersGroup.POST("/", web.APIPostUser)
	usersGroup.GET("/:id", web.APIGetUser)
	usersGroup.PUT("/:id", web.APIPutUser)
	usersGroup.DELETE("/:id", web.APIDeleteUser)

	//userGroup := router.Group("/user")
}

// API handlers

// GET /users
func (web *Web) APIGetUsers(ctx *gin.Context) {
	users, err := web.database.GetAllUsers()
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	if users == nil {
		users = []models.User{}
	}

	ctx.JSON(http.StatusOK, users)
}

// POST /users
func (web *Web) APIPostUser(ctx *gin.Context) {
	type APIPostUserBody struct {
		User     models.User `json:"user"`
		Password string      `json:"password"`
	}

	body := APIPostUserBody{
		User: models.User{Id: bson.NewObjectId()},
	}

	if err := ctx.ShouldBind(&body); err != nil {
		handleBadRequest(ctx, err)
	}

	saveUserChange, err := web.database.SaveUser(body.User)
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	cred, err := models.CreateCredential(body.User.Id, body.Password)

	if err != nil {
		handleWebErr(ctx, err)
		return
	}
	saveCredChange, err := web.database.SaveCredential(*cred)

	ctx.JSON(http.StatusCreated, struct {
		SaveUserChange *mgo.ChangeInfo
		SaveCredChange *mgo.ChangeInfo
	}{
		SaveUserChange: saveUserChange,
		SaveCredChange: saveCredChange,
	})
}

// GET /users/:id
func (web *Web) APIGetUser(ctx *gin.Context) {
	targetId := ctx.Param("id")

	if !bson.IsObjectIdHex(targetId) {
		handleBadRequest(ctx, IdIsNotValidObjectIdError)
		return
	}

	user, err := web.database.GetUserByID(targetId)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	if user == nil {
		handleNotFound(ctx)
		return
	}

	ctx.JSON(http.StatusOK, user)
}

// PUT /users/:id
func (web *Web) APIPutUser(ctx *gin.Context) {
	userId := ctx.Param("id")

	if !bson.IsObjectIdHex(userId) {
		handleBadRequest(ctx, IdIsNotValidObjectIdError)
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

	if !bson.IsObjectIdHex(targetId) {
		handleBadRequest(ctx, IdIsNotValidObjectIdError)
		return
	}

	err := web.database.DeleteUser(models.User{Id: bson.ObjectIdHex(targetId)})
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.Writer.WriteHeader(http.StatusNoContent)
}

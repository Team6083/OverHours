package web

import (
	"errors"
	"github.com/Team6083/OverHours/models"
	"github.com/gin-gonic/gin"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
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

	ctx.JSON(http.StatusOK, users)
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

// GET /user/data/:id
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

	ctx.JSON(http.StatusOK, user)
}

// PUT /user/data/:id
func (web *Web) APIPutUser(ctx *gin.Context) {
	userId := ctx.Param("id")

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

// DELETE /user/data/:id
func (web *Web) APIDeleteUser(ctx *gin.Context) {
	targetId := ctx.Param("id")

	err := web.database.DeleteUser(models.User{Id: bson.ObjectIdHex(targetId)})
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.Writer.WriteHeader(http.StatusNoContent)
}

package web

import (
	"net/http"

	"github.com/Team6083/OverHours/pkgs/models"
	"github.com/gin-gonic/gin"
	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
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

// APIGetUsers
// @Router /users [get]
// @Summary Get all users
// @Tags user
// @Accept json
// @Produce json
// @Success 200 {object} []models.User
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

type APIPostUserBody struct {
	User     models.User `json:"user"`
	Password string      `json:"password"`
}

type APIPostUserResponse struct {
	SaveUserChange *mgo.ChangeInfo
	SaveCredChange *mgo.ChangeInfo
}

// APIPostUser
// @Router /users [post]
// @Summary Create user
// @Tags user
// @Accept json
// @Param body body APIPostUserBody true "Post user body"
// @Produce json
// @Success 200 {object} APIPostUserResponse
func (web *Web) APIPostUser(ctx *gin.Context) {
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
	if err != nil {
		handleWebErr(ctx, err)
	}

	ctx.JSON(http.StatusCreated, APIPostUserResponse{
		SaveUserChange: saveUserChange,
		SaveCredChange: saveCredChange,
	})
}

// APIGetUser
// @Router /users/:id [get]
// @Summary Get user by id
// @Tags user
// @Accept json
// @Param id path string true "user id"
// @Produce json
// @Success 200 {object} models.User
func (web *Web) APIGetUser(ctx *gin.Context) {
	targetId := ctx.Param("id")

	if !bson.IsObjectIdHex(targetId) {
		handleBadRequest(ctx, ErrIdIsNotValidObjectId)
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

// APIPutUser
// @Router /users/:id [put]
// @Summary Modify user
// @Tags user
// @Accept json
// @Param id path string true "user id"
// @Param body body models.User true "body"
// @Produce json
// @Success 200 {object} APIPostAuthLoginSuccessResponse
func (web *Web) APIPutUser(ctx *gin.Context) {
	userId := ctx.Param("id")

	if !bson.IsObjectIdHex(userId) {
		handleBadRequest(ctx, ErrIdIsNotValidObjectId)
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

// APIDeleteUser
// @Router /users/:id [delete]
// @Summary Delete user
// @Tags user
// @Accept json
// @Param id path string true "user id"
// @Produce json
// @Success 204
func (web *Web) APIDeleteUser(ctx *gin.Context) {
	targetId := ctx.Param("id")

	if !bson.IsObjectIdHex(targetId) {
		handleBadRequest(ctx, ErrIdIsNotValidObjectId)
		return
	}

	err := web.database.DeleteUser(models.User{Id: bson.ObjectIdHex(targetId)})
	if err != nil {
		handleWebErr(ctx, err)
		return
	}

	ctx.Writer.WriteHeader(http.StatusNoContent)
}

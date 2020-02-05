package web

import (
	"crypto/rand"
	"crypto/sha256"
	"github.com/Team6083/OverHours/models"
	"github.com/gin-gonic/gin"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"io"
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

// DELETE /user/data/:id
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

const (
	PwSaltBytes = 32
)

func NewSalt() (salt string, err error) {
	b := make([]byte, PwSaltBytes)
	_, err = io.ReadFull(rand.Reader, b)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func PasswordToHash(password string, salt string) (hash string) {
	h := sha256.New()
	h.Write([]byte(password + salt))
	return string(h.Sum(nil))
}

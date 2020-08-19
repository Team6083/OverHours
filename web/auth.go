package web

import (
	"errors"
	"github.com/Team6083/OverHours/models"
	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
	"github.com/satori/go.uuid"
	"net/http"
	"time"
)

const tokenExp = 10 * 24 * time.Hour

type LoginToken struct {
	Id             string        `json:"id"`
	UserId         bson.ObjectId `json:"user_id"`
	Name           string        `json:"name"`
	ExpirationTime time.Time     `json:"expiration_time"`
}

// Define error
var (
	AuthSessionNotProvided = errors.New("no session provided")
	AuthWrongSession       = errors.New("wrong session")
	AuthNoPermission       = errors.New("no permission")
	AuthTimeExpired        = errors.New("valid time expired")
)

func (web *Web) HandleAuthRoutes(router *gin.Engine) {
	boardsRouter := router.Group("/auth")
	boardsRouter.POST("/login", web.APIPostAuthLogin)
}

// API Handlers

// POST /auth/login
func (web *Web) APIPostAuthLogin(ctx *gin.Context) {
	cred := struct {
		Password string `json:"password"`
		Username string `json:"username"`
	}{}

	if err := ctx.ShouldBind(&cred); err != nil {
		handleBadRequest(ctx, err)
		return
	}

	user, err := web.database.GetUserByUserName(cred.Username)
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(ctx, err)
		return
	}

	if user != nil {
		userCred, err := web.database.GetCredentialById(user.Id)
		if err != nil && err != mgo.ErrNotFound {
			handleWebErr(ctx, err)
			return
		}

		if userCred == nil {
			handleWebErr(ctx, errors.New("can't find user's cred"))
			return
		}

		if userCred.Password == PasswordToHash(cred.Password, userCred.Salt) {
			// login successful

			loginToken := newLoginToken(user)
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"name": loginToken.Name,
				"exp":  loginToken.ExpirationTime.Unix(),
				"jti":  loginToken.Id,
			})

			tokenString, err := token.SignedString(web.hmac)
			if err != nil {
				handleWebErr(ctx, err)
				return
			}

			ctx.JSON(http.StatusOK, struct {
				TokenString string `json:"token_string"`
			}{
				TokenString: tokenString,
			})
		}
	}

	ctx.AbortWithStatusJSON(http.StatusUnauthorized, APIException{
		Msg: "incorrect username or password",
	})
}

func newLoginToken(user *models.User) LoginToken {
	return LoginToken{
		UserId:         user.Id,
		Name:           user.Name,
		Id:             uuid.NewV4().String(),
		ExpirationTime: time.Now().Add(tokenExp),
	}
}

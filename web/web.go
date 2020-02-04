package web

import (
	"errors"
	"fmt"
	"github.com/Team6083/OverHours/models"
	"github.com/gbrlsnchs/jwt/v3"
	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	stats "github.com/semihalev/gin-stats"
	"log"
	"net/http"
)

type Web struct {
	database *models.Database
	settings *models.Setting
	hmac     *jwt.HMAC
}

func NewWeb(database *models.Database) *Web {
	web := &Web{database: database}

	err := web.readSettings()
	if err != nil {
		panic(err)
	}

	web.hmac = jwt.NewHMAC(jwt.SHA256, []byte(RandomString(10)))

	return web
}

func (web *Web) readSettings() error {
	settings, err := web.database.GetSetting()
	if err != nil {
		return err
	}

	web.settings = settings
	return nil
}

type APIException struct {
	Msg string `json:"error"`
}

var IdIsNotValidObjectIdError = errors.New("id is not a valid objectId")

func handleWebErr(c *gin.Context, err error) {
	fmt.Printf("Server internal error: %s\n", err)
	sentry.CaptureException(err)
	c.AbortWithStatusJSON(http.StatusInternalServerError, APIException{err.Error()})
}

func handleBadRequest(c *gin.Context, err error) {
	c.AbortWithStatusJSON(http.StatusBadRequest, APIException{err.Error()})
}

func handleUnprocessableEntity(c *gin.Context, err error) {
	c.AbortWithStatusJSON(http.StatusUnprocessableEntity, APIException{err.Error()})
}

func handleForbidden(c *gin.Context, err error) {
	c.AbortWithStatusJSON(http.StatusForbidden, APIException{err.Error()})
}

func (web *Web) ServeWebInterface(webPort int) {
	//go web.ServeSocketInterface(8000)

	web.database.DB.C("session").DropCollection()

	sentryHandler := sentryhttp.New(sentryhttp.Options{})

	http.Handle("/", sentryHandler.Handle(web.newHandler()))

	// Start Server
	log.Printf("Serving HTTP requests on port %d", webPort)
	log.Print(fmt.Sprintf(":%d", webPort))
	http.ListenAndServe(fmt.Sprintf(":%d", webPort), nil)
}

func (web *Web) newHandler() http.Handler {
	router := gin.New()

	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(cors.Default())

	router.GET("/stats", func(c *gin.Context) {
		c.JSON(http.StatusOK, stats.Report())
	})

	router.Use(stats.RequestStats())

	router.Use(web.databaseStatusMiddleWare())
	router.Use(web.AuthMiddleware())
	router.Use(web.responseMiddleWare())

	// APIs
	web.HandleUserRoutes(router)
	web.HandleTimeLogRoutes(router)
	web.HandleMeetingRoutes(router)
	web.HandleBoardRoutes(router)

	return router
}

func (web *Web) databaseStatusMiddleWare() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		if err := web.database.Session.Ping(); err != nil {
			web.database.Session.Refresh()
			handleWebErr(ctx, err)
			return
		}

		ctx.Next()
	}
}

func (web *Web) responseMiddleWare() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		ctx.Next()
		if err := ctx.ShouldBindHeader(&BasicHeader{ContentType: "application/json; charset=UTF-8"}); err != nil {
			handleWebErr(ctx, err)
		}
	}
}

type BasicHeader struct {
	ContentType string `header:"Content-Type"`
}

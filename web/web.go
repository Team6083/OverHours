package web

import (
	"fmt"
	"github.com/Team6083/OverHours/models"
	"github.com/gbrlsnchs/jwt/v3"
	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
	"github.com/gin-gonic/gin"
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

func handleWebErr(c *gin.Context, err error) {
	fmt.Printf("Server internal error: %s\n", err)
	sentry.CaptureException(err)
	c.JSON(http.StatusInternalServerError, err)
}

func handleBadRequest(c *gin.Context, err error) {
	c.JSON(http.StatusBadRequest, err)
}

func handleUnprocessableEntity(c *gin.Context, err error) {
	c.JSON(http.StatusUnprocessableEntity, err)
}

func handleForbidden(c *gin.Context, err error) {
	c.JSON(http.StatusForbidden, err)
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

	router.Use(web.databaseStatusMiddleWare())
	router.Use(web.AuthMiddleware())
	router.Use(web.responseHeaderMiddleWare())

	userGroup := router.Group("/user")
	web.HandleUserRoutes(userGroup)

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

func (web *Web) responseHeaderMiddleWare() gin.HandlerFunc {
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

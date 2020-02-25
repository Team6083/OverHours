package main

import (
	"fmt"
	"github.com/Team6083/OverHours/models"
	"github.com/Team6083/OverHours/web"
	"github.com/getsentry/sentry-go"
	_ "github.com/mattn/go-sqlite3"
	uuid "github.com/satori/go.uuid"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"log"
	"os"
	"strconv"
	"time"
)

func main() {
	log.Print("OverHours Starting at", time.Now())

	// getting environment variable
	var webPort, err = strconv.Atoi(getEnv("PORT", "80"))
	if err != nil {
		panic(err)
	}
	debug := false
	if len(os.Getenv("debug")) != 0 {
		debug = true
	}

	// Init Sentry
	sentryClientOption := sentry.ClientOptions{
		Dsn: getEnv("sentryDsn", ""),
	}

	if !debug {
		releaseName := "over-hours@1.4.4"
		sentryClientOption.Release = releaseName
	} else {
		sentryClientOption.Debug = true
	}

	err = sentry.Init(sentryClientOption)
	if err != nil {
		panic(err)
	}

	// connect to database
	var host = getEnv("host", "127.0.0.1")
	var dbName = getEnv("db", "OverHours")
	var user = getEnv("hoursUser", "")
	var pass = getEnv("hoursPassword", "")

	log.Printf("Connecting to db at %s/%s with username:  %s", host, dbName, user)
	database, err := models.OpenDataBase(host, user, pass, dbName)
	if err != nil {
		handleErr(err)
	}

	// check if setting exist
	_, err = database.GetSetting()
	if err != nil {
		if err == mgo.ErrNotFound {
			_, err = database.SaveSetting(&models.Setting{Id: bson.NewObjectId()})
			if err != nil {
				handleErr(err)
			}

			// add default user
			_, err = database.SaveUser(models.User{Name: "Root", Username: "root", Password: "root", UUID: uuid.NewV4().String(), PermissionLevel: models.PermissionSuper, PasswordNeedChange: true, Id: bson.NewObjectId()})
		} else {
			handleErr(err)
		}
	}

	// start web server
	webServer := web.NewWeb(database)
	webServer.ServeWebInterface(webPort)
}

func handleErr(err error) {
	fmt.Println(err)
	sentry.CaptureException(err)
	os.Exit(1)
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if len(value) == 0 {
		return fallback
	}
	return value
}

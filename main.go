package main

import (
	"fmt"
	"github.com/Team6083/OverHours/models"
	"github.com/Team6083/OverHours/web"
	"github.com/getsentry/sentry-go"
	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
	_ "github.com/mattn/go-sqlite3"
	"log"
	"os"
	"strconv"
	"time"
)

func main() {
	log.Print("OverHours Starting at", time.Now())

	var webPort, err = strconv.Atoi(getEnv("PORT", "80"))
	if err != nil {
		panic(err)
	}

	debug := false

	if len(os.Getenv("debug")) != 0 {
		debug = true
	}

	sentryClientOption := sentry.ClientOptions{
		Dsn: "https://64dc39d77b1f41d5823eaba5d5fac640@o275610.ingest.sentry.io/1493313",
	}

	sentryClientOption.Debug = debug

	err = sentry.Init(sentryClientOption)
	if err != nil {
		panic(err)
	}

	databaseURL := getEnv("databaseURL", "mongodb://127.0.0.1/OverHours")

	database, err := models.OpenDataBase(databaseURL)
	if err != nil {
		handleErr(err)
	}

	_, err = database.GetSetting()
	if err != nil {
		if err == mgo.ErrNotFound {
			_, err = database.SaveSetting(&models.Setting{Id: bson.NewObjectId()})
			if err != nil {
				handleErr(err)
			}
		} else {
			handleErr(err)
		}
	}

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

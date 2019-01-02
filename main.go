package main

import (
	"github.com/Team6083/OverHours/models"
	"github.com/Team6083/OverHours/web"
	_ "github.com/mattn/go-sqlite3"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"log"
	"os"
	"strconv"
	"time"
)

type Person struct {
	Name  string
	Phone string
}

func main() {
	log.Print("OverHours Starting at", time.Now())

	var webPort, err = strconv.Atoi(getenv("PORT", "80"))
	if err != nil {
		panic(err)
	}

	var host = getenv("host", "127.0.0.1")
	var dbName = getenv("db", "OverHours")
	var user = getenv("hoursUser", "")
	var pass = getenv("hoursPassword", "")

	log.Printf("Connecting to db at %s/%s with username:  %s", host, dbName, user)
	database, err := models.OpenDataBase(host, user, pass, dbName)
	if err != nil {
		panic(err)
	}

	_, err = database.GetSetting()
	if err != nil {
		if err == mgo.ErrNotFound {
			_, err = database.SaveSetting(&models.Setting{Id: bson.NewObjectId()})
			if err != nil {
				panic(err)
			}
		} else {
			panic(err)
		}
	}

	webServer := web.NewWeb(database)
	webServer.ServeWebInterface(webPort)
}

func getenv(key, fallback string) string {
	value := os.Getenv(key)
	if len(value) == 0 {
		return fallback
	}
	return value
}

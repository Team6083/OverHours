package main

import (
	"github.com/kennhung/OverHours/models"
	"github.com/kennhung/OverHours/web"
	_ "github.com/mattn/go-sqlite3"
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

	var host = getenv("host", "")
	var dbName = getenv("db", "")
	var user = getenv("Username", "")
	var pass = getenv("Password", "")

	database, err := models.OpenDataBase(host, user, pass, dbName)
	if err != nil {
		panic(err)
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

package main

import (
	"github.com/kennhung/OverHours/models"
	"github.com/kennhung/OverHours/web"
	_ "github.com/mattn/go-sqlite3"
	"gopkg.in/mgo.v2"
	"log"
	"os"
	"strconv"
	"time"
)

const DbConfigPath = "conf/database.json"
const webPort = 80

type Person struct {
	Name  string
	Phone string
}

func main() {
	log.Print("OverHours Starting at", time.Now())

	var webPort, _ = strconv.Atoi(getenv("port", "80"))

	dialInfo := &mgo.DialInfo{
		Addrs:     []string{""},
		Direct:    false,
		Timeout:   time.Second * 1,
		Database:  "overhourstest",
		Username:  "admin",
		Password:  "kenn@2001",
		PoolLimit: 4096, // Session.SetPoolLimit
	}

	dialInfo.Addrs[0] = getenv("host", dialInfo.Addrs[0])
	dialInfo.Database = getenv("db", dialInfo.Database)
	dialInfo.Username = getenv("Username", dialInfo.Username)
	dialInfo.Password = getenv("Password", dialInfo.Password)

	session, err := mgo.DialWithInfo(dialInfo)
	if nil != err {
		panic(err)
	}
	defer session.Close()

	db := session.DB("overhourstest")

	database := models.Database{session, &models.DatabaseConfig{"", "", "", ""}, db}

	web := web.NewWeb(&database)
	web.ServeWebInterface(webPort)
	defer database.Session.Close()
}

func getenv(key, fallback string) string {
	value := os.Getenv(key)
	if len(value) == 0 {
		return fallback
	}
	return value
}

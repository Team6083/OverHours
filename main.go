package main

import (
	"github.com/kennhung/OverHours/module"
	"github.com/kennhung/OverHours/web"
	_ "github.com/mattn/go-sqlite3"
	"log"
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

	database, err := module.OpenDataBase(DbConfigPath)
	if err != nil {
		log.Fatal(err)
	}

	web := web.NewWeb(database)
	web.ServeWebInterface(webPort)
	defer database.Session.Close()
}

package main

import (
	"github.com/kennhung/OverHours/web"
	"log"
	"time"
)

const DBPATH = "./foo.db"
const webPort = 80

func main() {
	log.Print("OverHours Starting at", time.Now())
	web := web.NewWeb()
	web.ServeWebInterface(webPort)
}

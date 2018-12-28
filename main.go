package main

import (
	"crypto/tls"
	"github.com/kennhung/OverHours/models"
	"github.com/kennhung/OverHours/web"
	_ "github.com/mattn/go-sqlite3"
	"gopkg.in/mgo.v2"
	"log"
	"net"
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
	webPort, err := strconv.Atoi(os.Getenv("PORT"))
	if err != nil {
		panic(err)
	}

	dialInfo, err := mgo.ParseURL(os.Getenv("host"))
	if err != nil {
		panic(err)
	}

	tlsConfig := &tls.Config{}
	dialInfo.DialServer = func(addr *mgo.ServerAddr) (net.Conn, error) {
		conn, err := tls.Dial("tcp", addr.String(), tlsConfig)
		return conn, err
	}

	session, err := mgo.DialWithInfo(dialInfo)
	if err != nil {
		panic(err)
	}

	var database models.Database
	database.Session = session
	database.DB = session.DB(os.Getenv("db"))

	web := web.NewWeb(&database)
	web.ServeWebInterface(webPort)
	defer database.Session.Close()
}

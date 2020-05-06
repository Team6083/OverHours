package models

import (
	"gopkg.in/mgo.v2"
	"time"
)

type Database struct {
	Session  *mgo.Session
	DialInfo *mgo.DialInfo
	DB       *mgo.Database
}

func OpenDataBase(url string) (*Database, error) {
	dialInfo, err := mgo.ParseURL(url)
	if err != nil {
		return nil, err
	}

	dialInfo.PoolLimit = 4096
	dialInfo.Timeout = time.Second * 1

	database, err := OpenDataBaseWithDialInfo(dialInfo)
	if err != nil {
		return nil, err
	}
	database.Session.SetSocketTimeout(1 * time.Hour)

	return database, nil
}

func OpenDataBaseWithDialInfo(dialInfo *mgo.DialInfo) (*Database, error) {
	database := new(Database)
	database.DialInfo = dialInfo

	session, err := mgo.DialWithInfo(dialInfo)

	if err != nil {
		return nil, err
	}
	session.SetMode(mgo.Strong, true)

	database.Session = session
	database.DB = session.DB(database.DialInfo.Database)
	return database, nil
}

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

func OpenDataBase(hostName string, user string, password string, dbName string) (*Database, error) {
	var database *Database
	var err error
	if user == "" && password == "" {
		database, err = OpenDataBaseDirectly(hostName, dbName)
		if err != nil {
			return nil, err
		}
	} else {
		dialInfo := &mgo.DialInfo{
			Addrs:     []string{hostName},
			Direct:    false,
			Timeout:   time.Second * 1,
			Database:  dbName,
			Username:  user,
			Password:  password,
			PoolLimit: 4096, // Session.SetPoolLimit
		}
		database, err = OpenDataBaseWithDialInfo(dialInfo)
		if err != nil {
			return nil, err
		}
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

func OpenDataBaseDirectly(hostname string, dbName string) (*Database, error) {
	database := new(Database)
	database.DialInfo = nil

	session, err := mgo.Dial(hostname)

	if err != nil {
		return nil, err
	}
	session.SetMode(mgo.Strong, true)

	database.Session = session
	database.DB = session.DB(dbName)
	return database, nil
}

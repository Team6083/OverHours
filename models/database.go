package models

import (
	"encoding/json"
	"gopkg.in/mgo.v2"
	"os"
)

type Database struct {
	Session *mgo.Session
	Config  *DatabaseConfig
	DB      *mgo.Database
}

type DatabaseConfig struct {
	Hosts    string `json:"hosts"`
	User     string `json:"user"`
	Password string `json:"password"`
	DBName   string `json:"DBName"`
}

func OpenDataBase(hostName string, user string, password string, dbName string) (*Database, error) {
	dbConfig := DatabaseConfig{hostName, user, password, dbName}

	database, err := OpenDataBaseWithConfig(&dbConfig)
	if err != nil {
		return nil, err
	}

	return database, nil
}

func OpenDataBaseWithConfigPath(DbConfigPath string) (*Database, error) {
	var config DatabaseConfig
	configFile, err := os.Open(DbConfigPath)
	if err != nil {
		return nil, err
	}
	jsonParser := json.NewDecoder(configFile)
	jsonParser.Decode(&config)
	configFile.Close()

	database, err := OpenDataBaseWithConfig(&config)

	if err != nil {
		return nil, err
	}

	return database, nil
}

func OpenDataBaseWithConfig(config *DatabaseConfig) (*Database, error) {
	database := new(Database)
	database.Config = config

	session, err := mgo.Dial(config.Hosts)

	if err != nil {
		return nil, err
	}
	session.SetMode(mgo.Strong, true)

	database.Session = session
	database.DB = session.DB(database.Config.DBName)
	return database, nil
}

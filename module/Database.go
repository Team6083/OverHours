package module

import (
	"encoding/json"
	"gopkg.in/mgo.v2"
	"os"
)

type Database struct {
	Session *mgo.Session
	config  *DatabaseConfig
	DB      *mgo.Database
}

type DatabaseConfig struct {
	Hosts    string `json:"hosts"`
	Password string `json:"password"`
	DBName   string `json:"DBName"`
}

func OpenDataBase(DbConfigPath string) (*Database, error) {
	database := new(Database)

	var config DatabaseConfig
	configFile, err := os.Open(DbConfigPath)
	if err != nil {
		return nil, err
	}
	jsonParser := json.NewDecoder(configFile)
	jsonParser.Decode(&config)
	configFile.Close()

	database.config = &config

	session, err := mgo.Dial(config.Hosts)

	if err != nil {
		return nil, err
	}
	session.SetMode(mgo.Strong, true)

	database.Session = session
	database.DB = session.DB(database.config.DBName)
	return database, nil
}

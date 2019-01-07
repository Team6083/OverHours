package models

import (
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"log"
	"time"
)

type Setting struct {
	SeasonId string
	LastOut  int
	TimeZone string
	Id       bson.ObjectId `bson:"_id,omitempty"`
}

func (database *Database) GetSetting() (*Setting, error) {
	setting := new(Setting)
	err := database.DB.C("settings").Find(bson.M{}).One(&setting)
	if err != nil {
		return nil, err
	}
	return setting, nil
}

func (database *Database) SaveSetting(setting *Setting) (*mgo.ChangeInfo, error) {
	change, err := database.DB.C("settings").UpsertId(setting.Id, setting)
	if err != nil {
		return nil, err
	}
	return change, nil
}

func (setting Setting) GetTimeZone() *time.Location {
	local, err := time.LoadLocation(setting.TimeZone)
	if err != nil {
		log.Fatal(err)
		return time.Local
	}
	return local
}

func (setting *Setting) CheckIfExceedLastOut(t time.Time) bool {
	hour, min, sec := t.In(setting.GetTimeZone()).Clock()

	tCalc := hour*60*60 + min*60 + sec
	if tCalc > setting.LastOut {
		return true
	} else {
		return false
	}
}

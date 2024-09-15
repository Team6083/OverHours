package models

import (
	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
)

type Setting struct {
	Id bson.ObjectId `bson:"_id,omitempty"`
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

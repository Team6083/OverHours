package models

import (
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"log"
	"time"
)

type Setting struct {
	SeasonId            string
	Token               string
	CheckinWebHook      string
	CheckinWebHookToken string
	LastOut             int
	TimeZone            string
	CheckinLimit        int
	CheckoutLimit       int
	Id                  bson.ObjectId `bson:"_id,omitempty"`
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

func (settings Setting) GetTimeZone() *time.Location {
	local, err := time.LoadLocation(settings.TimeZone)
	if err != nil {
		log.Fatal(err)
		return time.Local
	}
	return local
}

func (settings *Setting) CheckIfExceedLastOut(timeIn time.Time, t time.Time) bool {
	if settings.LastOut == -1 {
		return false
	}
	timeZoneT := t.In(settings.GetTimeZone())
	hour, min, sec := timeZoneT.Clock()
	year, _, _ := timeIn.In(settings.GetTimeZone()).Date()
	tYear, _, _ := timeZoneT.Date()

	tCalc := hour*60*60 + min*60 + sec
	if tCalc > settings.LastOut || (year*365+timeIn.In(settings.GetTimeZone()).YearDay()) < (tYear*365+timeZoneT.YearDay()) {
		return true
	} else {
		return false
	}
}

func (settings *Setting) CheckIfCanCheckIn(user *User) bool {
	if !(settings.CheckinLimit == 2 && !user.CheckPermissionLevel(PermissionAdmin)) && !(settings.CheckinLimit == 1 && !user.CheckPermissionLevel(PermissionLeader)) {
		return true
	}
	return false
}

func (settings *Setting) CheckIfCanCheckOut(user *User) bool {
	if !(settings.CheckoutLimit == 2 && !user.CheckPermissionLevel(PermissionAdmin)) && !(settings.CheckoutLimit == 1 && !user.CheckPermissionLevel(PermissionLeader)) {
		return true
	}
	return false
}

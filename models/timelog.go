package models

import (
	"gopkg.in/mgo.v2/bson"
	"time"
)

type TimeLog struct {
	UserID   string
	TimeIn   time.Time
	TimeOut  time.Time
	SeasonId string
	LogId    string
}

func (database *Database) GetAllTimeLogs() ([]TimeLog, error) {
	var timeLogs []TimeLog

	err := database.DB.C("timeLogs").Find(bson.M{}).All(&timeLogs)
	if err != nil {
		return nil, err
	}

	return timeLogs, nil
}

func (database *Database) GetTimeLogsByUser(userId string) ([]TimeLog, error) {
	var timeLogs []TimeLog
	err := database.DB.C("timeLogs").Find(bson.M{"userId": userId}).All(&timeLogs)
	if err != nil {
		return nil, err
	}
	return timeLogs, nil
}

func (database *Database) UpdateTimeLog(log *TimeLog) {

}

package models

import (
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"time"
)

type TimeLog struct {
	UserID   string        `userId`
	TimeIn   int64         `timeIn`
	TimeOut  int64         `timeOut`
	SeasonId string        `seasonId`
	Id       bson.ObjectId `bson:"_id,omitempty"`
}

func (timeLog *TimeLog) GetDuration() *time.Duration {
	duration := timeLog.GetOutTime().Sub(timeLog.GetInTime())
	return &duration
}

func (timeLog *TimeLog) GetInTime() time.Time {
	return time.Unix(timeLog.TimeIn, 0)
}

func (timeLog *TimeLog) GetOutTime() time.Time {
	return time.Unix(timeLog.TimeOut, 0)
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

func (database *Database) GetLastLogByUser(userId string) (*TimeLog, error) {
	var timeLogs TimeLog
	err := database.DB.C("timeLogs").Find(bson.M{"userId": userId}).Sort("+timeIn").One(&timeLogs)
	if err != nil {
		return nil, err
	}
	return &timeLogs, nil
}

func (database *Database) SaveTimeLog(log *TimeLog) (*mgo.ChangeInfo, error) {
	change, err := database.DB.C("timeLogs").UpsertId(log.Id, log)
	if err != nil {
		return nil, err
	}
	return change, nil
}

func (database *Database) DeleteTimeLog(log *TimeLog) error {
	err := database.DB.C("timeLogs").RemoveId(log.Id)
	if err != nil {
		return err
	}
	return nil
}

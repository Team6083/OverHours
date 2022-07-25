package models

import (
	"errors"
	"sort"
	"time"

	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
)

type TimeLog struct {
	UserId  string        `json:"userId"`
	TimeIn  int64         `json:"timeIn"`
	TimeOut int64         `json:"timeOut"`
	Id      bson.ObjectId `bson:"_id,omitempty"`
}

type TimeLogSummary struct {
	UserID    string
	TotalTime time.Duration
}

var AlreadyCheckInError = errors.New("already checkin")
var AlreadyCheckOutError = errors.New("already checkout")

func NewTimeLogAtNow(studentId string, seasonId string) TimeLog {
	return TimeLog{studentId, time.Now().Unix(), 0, bson.NewObjectId()}
}

func (timeLog *TimeLog) GetDuration() *time.Duration {
	duration := timeLog.GetOutTime().Sub(timeLog.GetInTime())
	return &duration
}

func (timeLog *TimeLog) IsOut() bool {
	if timeLog.TimeOut == 0 || timeLog.TimeOut == -1 {
		return false
	} else {
		return true
	}
}

func (timeLog *TimeLog) GetInTime() time.Time {
	return time.Unix(timeLog.TimeIn, 0)
}

func (timeLog *TimeLog) GetOutTime() time.Time {
	return time.Unix(timeLog.TimeOut, 0)
}

func (database *Database) GetAllTimeLogsQuery() *mgo.Query {
	return database.DB.C("timeLogs").Find(bson.M{})
}

func (database *Database) GetAllTimeLogs() ([]TimeLog, error) {
	var timeLogs []TimeLog

	err := database.GetAllTimeLogsQuery().All(&timeLogs)
	if err != nil {
		return nil, err
	}

	return timeLogs, nil
}

func (database *Database) GetTimeLogsQueryByUser(userId string) *mgo.Query {
	return database.DB.C("timeLogs").Find(bson.M{"userid": userId})
}

func (database *Database) GetTimeLogsByUser(userId string) ([]TimeLog, error) {
	var timeLogs []TimeLog
	err := database.GetTimeLogsQueryByUser(userId).All(&timeLogs)
	if err != nil {
		return nil, err
	}
	return timeLogs, nil
}

func (database *Database) GetTimeLogById(Id string) (*TimeLog, error) {
	var timeLog TimeLog
	err := database.DB.C("timeLogs").FindId(bson.ObjectIdHex(Id)).One(&timeLog)
	if err != nil {
		return nil, err
	}
	return &timeLog, nil
}

func (database *Database) GetTimeLogsBySeason(seasonId string) ([]TimeLog, error) {
	var timeLogs []TimeLog
	err := database.DB.C("timeLogs").Find(bson.M{"seasonid": seasonId}).All(&timeLogs)
	if err != nil {
		return nil, err
	}
	return timeLogs, nil
}

func (database *Database) GetTimeLogsByUserWithSpecificSeason(userId string, seasonId string) ([]TimeLog, error) {
	var timeLogs []TimeLog
	err := database.DB.C("timeLogs").Find(bson.M{"userid": userId, "seasonid": seasonId}).All(&timeLogs)
	if err != nil {
		return nil, err
	}
	return timeLogs, nil
}

func (database *Database) GetLastLogByUser(userId string) (*TimeLog, error) {
	var timeLog TimeLog
	err := database.DB.C("timeLogs").Find(bson.M{"userid": userId}).Sort("-timein").One(&timeLog)
	if err != nil {
		return nil, err
	}
	return &timeLog, nil
}

func (database *Database) GetLastLogByUserWithSpecificSeason(userId string, seasonId string) (*TimeLog, error) {
	var timeLog TimeLog
	err := database.DB.C("timeLogs").Find(bson.M{"userid": userId, "seasonid": seasonId}).Sort("-timein").One(&timeLog)
	if err != nil {
		return nil, err
	}
	return &timeLog, nil
}

func (database *Database) GetAllUnfinishedTimeLogs() ([]TimeLog, error) {
	var timeLogs []TimeLog
	err := database.DB.C("timeLogs").Find(bson.M{"timeout": bson.M{"$lte": 0}}).All(&timeLogs)
	if err != nil {
		return nil, err
	}

	return timeLogs, nil
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

func (database *Database) GetTimeLogSeasons() ([]string, error) {
	var result []string

	err := database.DB.C("timeLogs").Find(bson.M{}).Distinct("seasonid", &result)
	if err != nil {
		return nil, err
	}

	return result, nil
}

//  Calculating time logs

func (database *Database) GetRankingBySeason(seasonId string) ([]TimeLogSummary, error) {
	seasonLogs, err := database.GetTimeLogsBySeason(seasonId)
	if err != nil {
		return nil, err
	}

	logsSummaries := GetTimeLogsSummary(seasonLogs)

	return SortTimeLogSummary(logsSummaries), nil
}

func CalculateTotalTimes(timeLogs []TimeLog) time.Duration {
	var totalTime time.Duration
	for _, timeLog := range timeLogs {
		if timeLog.IsOut() {
			totalTime = time.Duration(totalTime.Nanoseconds()+timeLog.GetDuration().Nanoseconds()) * time.Nanosecond
		}
	}
	return totalTime
}

func GetTimeLogsSummary(seasonLogs []TimeLog) []TimeLogSummary {
	ranking := map[string]TimeLogSummary{}

	for _, logs := range seasonLogs {
		if logs.IsOut() {
			duration := logs.GetDuration()
			rank, ok := ranking[logs.UserId]
			if ok {
				rank.add(duration)
			} else {
				rank = TimeLogSummary{logs.UserId, 0}
				rank.add(duration)
			}
			ranking[logs.UserId] = rank
		}
	}

	var timeLogSummaries []TimeLogSummary

	for _, v := range ranking {
		timeLogSummaries = append(timeLogSummaries, v)
	}

	return timeLogSummaries
}

func SortTimeLogSummary(sum []TimeLogSummary) []TimeLogSummary {

	sort.Slice(sum, func(i, j int) bool {
		return sum[i].TotalTime > sum[j].TotalTime
	})

	return sum
}

func (logSummary *TimeLogSummary) add(duration *time.Duration) {
	logSummary.TotalTime = time.Duration(logSummary.TotalTime.Nanoseconds()+duration.Nanoseconds()) * time.Nanosecond
}

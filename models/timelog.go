package models

import (
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"sort"
	"time"
)

type TimeLog struct {
	UserID   string        `string:"userId"`
	TimeIn   int64         `string:"timeIn"`
	TimeOut  int64         `string:"timeOut"`
	SeasonId string        `string:"seasonId"`
	Id       bson.ObjectId `bson:"_id,omitempty"`
}

type TimeLogSummary struct {
	UserID    string
	TotalTime time.Duration
}

func NewTimeLogAtNow(studentId string, seasonId string) TimeLog {
	return TimeLog{studentId, time.Now().Unix(), 0, seasonId, bson.NewObjectId()}
}

func (timeLog *TimeLog) GetDuration() *time.Duration {
	duration := timeLog.GetOutTime().Sub(timeLog.GetInTime())
	return &duration
}

func (timeLog *TimeLog) IsOut() bool {
	if timeLog.TimeOut == 0 {
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
	err := database.DB.C("timeLogs").Find(bson.M{"userid": userId}).All(&timeLogs)
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
	var totlaTime time.Duration
	for _, timeLog := range timeLogs {
		totlaTime = time.Duration(totlaTime.Nanoseconds()+timeLog.GetDuration().Nanoseconds()) * time.Nanosecond
	}
	return totlaTime
}

func GetTimeLogsSummary(seasonLogs []TimeLog) []TimeLogSummary {
	ranking := map[string]TimeLogSummary{}

	for _, logs := range seasonLogs {
		if logs.IsOut() {
			duration := logs.GetDuration()
			rank, ok := ranking[logs.UserID]
			if ok {
				rank.add(duration)
			} else {
				rank = TimeLogSummary{logs.UserID, 0}
				rank.add(duration)
			}
			ranking[logs.UserID] = rank
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

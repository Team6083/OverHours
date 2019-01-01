package models

import (
	"fmt"
	"github.com/stretchr/testify/assert"
	"gopkg.in/mgo.v2/bson"
	"log"
	"testing"
	"time"
)

func TestTimeLog_GetInTime(t *testing.T) {
	timeNow := time.Now()

	timeLog := TimeLog{"TestID", timeNow.Unix(), time.Now().Local().Add(time.Second * time.Duration(10)).Unix(), "Season1", bson.NewObjectId()}
	assert.Equal(t, time.Unix(timeNow.Unix(), 0), timeLog.GetInTime())
}

func TestTimeLog_GetDuration(t *testing.T) {
	timeLog := TimeLog{"TestID", time.Now().Unix(), time.Now().Local().Add(time.Second * time.Duration(10)).Unix(), "Season1", bson.NewObjectId()}

	assert.Equal(t, timeLog.GetDuration().Seconds(), float64(10))
}

func TestDatabase_GetLastLogByUser(t *testing.T) {
	database := SetupTestDb(t)

	timeLog1 := TimeLog{"TestID", time.Now().Unix(), time.Now().Local().Add(time.Second * time.Duration(10)).Unix(), "Season1", bson.NewObjectId()}
	time.Sleep(time.Second * time.Duration(2))
	timeLog2 := TimeLog{"TestID", time.Now().Unix(), time.Now().Local().Add(time.Second * time.Duration(10)).Unix(), "Season 2", bson.NewObjectId()}

	_, err := database.SaveTimeLog(&timeLog1)
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)
	_, err = database.SaveTimeLog(&timeLog2)
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)

	timeLog, err := database.GetLastLogByUser(timeLog1.UserID)
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)

	assert.Equal(t, timeLog2.TimeIn, timeLog.TimeIn)

	database.DeleteTimeLog(&timeLog1)
	database.DeleteTimeLog(&timeLog2)
}

func TestDatabase_DeleteTimeLog(t *testing.T) {
	database := SetupTestDb(t)

	timeLog := TimeLog{"TestID", time.Now().Unix(), time.Now().Local().Add(time.Second * time.Duration(10)).Unix(), "Season1", bson.NewObjectId()}

	_, err := database.SaveTimeLog(&timeLog)
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)

	timeLog2, err := database.GetTimeLogsByUser(timeLog.UserID)
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)

	assert.NotNil(t, timeLog2)
	assert.Equal(t, timeLog2[0].UserID, timeLog.UserID)

	log.Print(timeLog.TimeIn, timeLog2[0].TimeIn)

	assert.Equal(t, timeLog2[0].TimeIn, timeLog.TimeIn)
	assert.Equal(t, timeLog2[0].TimeOut, timeLog.TimeOut)
	assert.Equal(t, timeLog2[0].SeasonId, timeLog.SeasonId)
	assert.Equal(t, timeLog2[0].Id, timeLog.Id)

	err = database.DeleteTimeLog(&timeLog)
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)
}

func TestDatabase_GetRankingBySeason(t *testing.T) {
	Database := SetupTestDb(t)

	for i := 0; i < 5; i++ {
		for j := 0; j < 10; j++ {
			timelog := NewTimeLogAtNow(fmt.Sprintf("stu%d", i), "testSeason")
			timelog.TimeOut = time.Now().Add(time.Duration(i) * time.Second).Unix()
			_, err := Database.SaveTimeLog(&timelog)
			if err != nil {
				panic(err)
				break
			}
		}
	}

	rank, err := Database.GetRankingBySeason("testSeason")
	if err != nil {
		panic(err)
	}

	assert.Equal(t, rank[0].UserID, "stu4")

	err = Database.DB.C("timeLogs").DropCollection()
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)
}

func TestDatabase_GetTimeLogsBySeason(t *testing.T) {
	Database := SetupTestDb(t)

	for i := 0; i < 5; i++ {
		for j := 0; j < 10; j++ {
			timelog := NewTimeLogAtNow(fmt.Sprintf("stu%d", i), "testSeason")
			timelog.TimeOut = time.Now().Unix()
			_, err := Database.SaveTimeLog(&timelog)
			if err != nil {
				panic(err)
				break
			}
		}
	}

	logs, err := Database.GetTimeLogsBySeason("testSeason")
	leng := len(logs)
	assert.Equal(t, 50, leng)

	err = Database.DB.C("timeLogs").DropCollection()
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)
}

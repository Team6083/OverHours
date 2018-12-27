package models

import (
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

	assert.Equal(t, timeLog1.TimeIn, timeLog.TimeIn)

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

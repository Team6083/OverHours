package models

import (
	"fmt"
	"github.com/stretchr/testify/assert"
	"gopkg.in/mgo.v2/bson"
	"log"
	"testing"
	"time"
)

func TestDatabase_GetMeetingsBySeason(t *testing.T) {
	Database := SetupTestDb(t)

	participant := []string{"1", "2", "3", "4"}

	for i := 0; i < 10; i++ {
		meeting := Meeting{fmt.Sprintf("meet%d", i), time.Now().Unix(), "seasonTest", "title", "desc", 0, time.Now().Unix(), participant, bson.NewObjectId()}
		_, err := Database.SaveMeeting(&meeting)
		if err != nil {
			panic(err)
		}
	}

	logs, err := Database.GetMeetingsBySeasonId("seasonTest")
	length := len(logs)
	assert.Equal(t, 10, length)

	err = Database.DB.C("meetings").DropCollection()
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)
}

func TestDatabase_DeleteMeeting(t *testing.T) {
	database := SetupTestDb(t)

	participant := []string{"1", "2", "3", "4"}

	meeting := Meeting{"m1", time.Now().Unix(), "seasonTest", "title", "desc", 0, time.Now().Unix(), participant, bson.NewObjectId()}

	_, err := database.SaveMeeting(&meeting)
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)

	meeting2, err := database.GetMeetingByMeetId(meeting.MeetId)
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)

	assert.NotNil(t, meeting2)
	assert.Equal(t, meeting2.MeetId, meeting.MeetId)

	log.Print(meeting2.StartTime, meeting.StartTime)

	assert.Equal(t, meeting2.Participants, meeting.Participants)
	assert.Equal(t, meeting2.Title, meeting.Title)
	assert.Equal(t, meeting2.CheckinLevel, meeting.CheckinLevel)

	err = database.DeleteMeeting(meeting2)
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)
}

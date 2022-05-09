package models

import (
	"github.com/globalsign/mgo/bson"
	"github.com/stretchr/testify/assert"
	"log"
	"testing"
	"time"
)

func TestDatabase_GetMeetingsBySeason(t *testing.T) {
	Database := SetupTestDb(t)

	participant := make(map[string]ParticipantData)
	participant["test"] = ParticipantData{UserId: "test", Leave: false, IsAdmin: false}

	for i := 0; i < 10; i++ {
		meeting := Meeting{SeasonId: "seasonTest", Title: "title", Description: "desc", StartCheckinTime: time.Now().Unix(), Participants: participant, Id: bson.NewObjectId()}
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

	participant := make(map[string]ParticipantData)
	participant["test"] = ParticipantData{UserId: "test", Leave: false, IsAdmin: false}

	meeting := Meeting{SeasonId: "seasonTest", Title: "title", Description: "desc", StartCheckinTime: time.Now().Unix(), Participants: participant, Id: bson.NewObjectId()}

	_, err := database.SaveMeeting(&meeting)
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)

	meeting2, err := database.GetMeetingById(meeting.Id.Hex())
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)

	assert.NotNil(t, meeting2)
	assert.Equal(t, meeting2.Id.Hex(), meeting.Id.Hex())

	log.Print(meeting2.StartTime, meeting.StartTime)

	assert.Equal(t, meeting2.Participants, meeting.Participants)
	assert.Equal(t, meeting2.Title, meeting.Title)

	err = database.DeleteMeeting(meeting2)
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)
}

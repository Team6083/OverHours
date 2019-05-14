package models

import (
	"errors"
	"fmt"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"time"
)

type Meeting struct {
	MeetId           string
	StartTime        int64
	SeasonId         string
	Title            string
	Description      string
	CheckinLevel     int
	StartCheckinTime int64
	Participants     []string
	Id               bson.ObjectId `bson:"_id,omitempty"`
}

// Check auth status
var UserNotInMeeting = errors.New("this user is not a participant of the meeting")

func (meeting *Meeting) GetMeetingLogId() string {
	return fmt.Sprintf("meet:%s", meeting.MeetId)
}

func (meeting *Meeting) CheckUserParticipate(userId string) int {
	for index, participant := range meeting.Participants {
		if participant == userId {
			return index
		}
	}
	return -1
}

func (database *Database) ParticipantCheckin(meeting *Meeting, user User) error {
	userIndex := meeting.CheckUserParticipate(user.GetIdentify())

	if userIndex == -1 {
		return UserNotInMeeting
	}

	timeLog := NewTimeLogAtNow(user.GetIdentify(), meeting.GetMeetingLogId())

	_, err := database.SaveTimeLog(&timeLog)
	if err != nil {
		return err
	}

	return nil
}

func (database *Database) GetAllMeeting() ([]Meeting, error) {
	var meet []Meeting
	err := database.DB.C("meetings").Find(bson.M{}).Sort("-starttime").All(&meet)
	if err != nil {
		return nil, err
	}
	return meet, nil
}

func (database *Database) GetMeetingByMeetId(meetId string) (*Meeting, error) {
	var meet Meeting
	err := database.DB.C("meetings").Find(bson.M{"meetid": meetId}).One(&meet)
	if err != nil {
		return nil, err
	}
	return &meet, nil
}

func (database *Database) GetMeetingsBySeasonId(seasonId string) ([]Meeting, error) {
	var meet []Meeting
	err := database.DB.C("meetings").Find(bson.M{"seasonid": seasonId}).All(&meet)
	if err != nil {
		return nil, err
	}
	return meet, nil
}

func (database *Database) GetMeetingsByUserId(userId string) ([]Meeting, error) {
	meetings, err := database.GetAllMeeting()
	if err != nil {
		return nil, err
	}

	for index, meet := range meetings {
		if meet.CheckUserParticipate(userId) == -1 {
			meetings = append(meetings[:index], meetings[index+1:]...)
		}
	}
	return meetings, nil
}

func (database *Database) GetLastMeetingsByUserId(userId string) (*Meeting, error) {
	meetings, err := database.GetAllMeeting()
	if err != nil {
		return nil, err
	}

	for index, meet := range meetings {
		if meet.CheckUserParticipate(userId) == -1 {
			if index+1 < len(meetings) {
				copy(meetings[index:], meetings[index+1:])
				meetings = meetings[:len(meetings)-1]
			} else {
				meetings = meetings[:len(meetings)-1]
			}

		}
	}

	if len(meetings) == 0 {
		return nil, nil
	}

	return &meetings[0], nil
}

func (meeting *Meeting) CheckIfMeetingCanCheckInNow(user *User) bool {
	StartCheckinTime := time.Unix(meeting.StartCheckinTime, 0)
	if time.Now().After(StartCheckinTime) {
		if meeting.CheckinLevel == 0 || user.CheckPermissionLevel(PermissionLeader) {
			return true
		}
	}

	return false
}

func (database *Database) SaveMeeting(meeting *Meeting) (*mgo.ChangeInfo, error) {
	change, err := database.DB.C("meetings").UpsertId(meeting.Id, meeting)
	if err != nil {
		return nil, err
	}
	return change, nil
}

func (database *Database) DeleteMeeting(meeting *Meeting) error {
	err := database.DB.C("meetings").RemoveId(meeting.Id)
	if err != nil {
		return err
	}
	return nil
}

package models

import (
	"errors"
	"fmt"
	"time"

	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
)

type Meeting struct {
	TeamId           bson.ObjectId `json:"teamId" bson:"teamId"`
	Title            string        `json:"title"`
	Description      string        `json:"description"`
	StartTime        int64         `json:"startTime" bson:"startTime"`
	StartCheckinTime int64         `json:"startCheckinTime" bson:"startCheckinTime"`
	FinishTime       int64         `json:"finishTime" bson:"finishTime"`
	Participants     []ParticipantData
	Id               bson.ObjectId `bson:"_id,omitempty"`
}

type ParticipantData struct {
	UserId      bson.ObjectId
	Present     bool
	PresentTime int64
	IsAdmin     bool
}

// Any change of this struct are required to update the hidden form part of meetings_form.html

var UserNotInMeeting = errors.New("this user is not a participant of the meeting")
var CantCheckinError = errors.New("can't checkin right now")

func (meeting *Meeting) GetMeetingLogId() string {
	return fmt.Sprintf("m:%s", meeting.Id.Hex())
}

func (meeting *Meeting) ParticipantAdmin(userId string, admin bool) {
	index := -1
	for i, v := range meeting.Participants {
		if v.UserId.Hex() == userId {
			index = i
			break
		}
	}
	if index >= 0 {
		meeting.Participants[index].IsAdmin = admin
	}
}

func (meeting *Meeting) ParticipantPresent(userId string, present bool) {
	index := -1
	for i, v := range meeting.Participants {
		if v.UserId.Hex() == userId {
			index = i
			break
		}
	}
	if index >= 0 {
		meeting.Participants[index].Present = present
	}
}

func (meeting *Meeting) ParticipantPresentTime(userId string, presentTime int64) {
	index := -1
	for i, v := range meeting.Participants {
		if v.UserId.Hex() == userId {
			index = i
			break
		}
	}
	if index >= 0 {
		meeting.Participants[index].PresentTime = presentTime
	}
}

func (meeting *Meeting) CheckUserParticipate(userId string) bool {
	for _, v := range meeting.Participants {
		if v.UserId.Hex() == userId {
			return true
		}
	}
	return false
}

func (meeting *Meeting) CheckUserAdmin(userId string) bool {
	for _, v := range meeting.Participants {
		if v.UserId.Hex() == userId {
			return v.IsAdmin
		}
	}
	return false
}

func (meeting *Meeting) CheckIfMeetingCanCheckInNow(user *User) bool {
	if meeting.CheckinStarted() && !meeting.MeetingFinished() {
		{
			return true
		}
	}

	return false
}

func (meeting *Meeting) CheckIfVisibleToUser(user *User) bool {
	if meeting.CheckUserParticipate(user.GetIdentify()) {
		return true
	}
	return false
}

func (meeting *Meeting) MeetingStarted() bool {
	StartTime := time.Unix(meeting.StartTime, 0)
	return time.Now().After(StartTime)
}

func (meeting *Meeting) MeetingFinished() bool {
	return meeting.FinishTime != 0
}

func (meeting *Meeting) CheckinStarted() bool {
	StartCheckinTime := time.Unix(meeting.StartCheckinTime, 0)
	return time.Now().After(StartCheckinTime)
}

func (meeting *Meeting) DeleteParticipant(userId string) {

}

func (database *Database) DeleteAllMeetingLog(meeting *Meeting) error {
	timeLogs, err := database.GetTimeLogsBySeason(meeting.GetMeetingLogId())
	if err != nil {
		return err
	}

	for _, timeLog := range timeLogs {
		err = database.DeleteTimeLog(&timeLog)
		if err != nil {
			return err
		}
	}

	return nil
}

func (database *Database) MeetingCheckin(meeting *Meeting, user *User) error {
	if !meeting.CheckUserParticipate(user.GetIdentify()) {
		return UserNotInMeeting
	}

	if !meeting.CheckIfMeetingCanCheckInNow(user) {
		return CantCheckinError
	}

	lastLog, err := database.GetLastLogByUserWithSpecificSeason(user.GetIdentify(), meeting.GetMeetingLogId())
	if err != nil && err != mgo.ErrNotFound {
		return err
	}

	if lastLog == nil || lastLog.IsOut() {
		if lastLog == nil {
			fmt.Printf("creating a new log for %s\n", user.GetIdentify())
		}

		timeLog := NewTimeLogAtNow(user.GetIdentify(), meeting.GetMeetingLogId())

		_, err = database.SaveTimeLog(&timeLog)
		if err != nil {
			return err
		}
	} else {
		return AlreadyCheckInError
	}

	return nil
}

func (database *Database) GetAllMeeting() ([]Meeting, error) {
	var meet []Meeting
	err := database.DB.C("meetings").Find(bson.M{}).Sort("-startTime").All(&meet)
	if err != nil {
		return nil, err
	}
	return meet, nil
}

func (database *Database) GetMeetingById(id string) (*Meeting, error) {
	var meet Meeting
	err := database.DB.C("meetings").FindId(bson.ObjectIdHex(id)).One(&meet)
	if err != nil {
		return nil, err
	}
	return &meet, nil
}

func (database *Database) GetMeetingsBySeasonId(seasonId string) ([]Meeting, error) {
	var meet []Meeting
	err := database.DB.C("meetings").Find(bson.M{"seasonId": seasonId}).All(&meet)
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
		if !meet.CheckUserParticipate(userId) {
			if index+1 < len(meetings) {
				copy(meetings[index:], meetings[index+1:])
				meetings = meetings[:len(meetings)-1]
			} else {
				meetings = meetings[:len(meetings)-1]
			}
		}
	}
	return meetings, nil
}

func (database *Database) GetOngoingMeetingsByUserId(userId string) ([]Meeting, error) {
	meetings, err := database.GetMeetingsByUserId(userId)
	if err != nil {
		return nil, err
	}

	for index, meet := range meetings {
		if !meet.CheckinStarted() || meet.MeetingFinished() {
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

	return meetings, nil
}

func (database *Database) GetLastOngoingMeetingsByUserId(userId string) (*Meeting, error) {
	meetings, err := database.GetOngoingMeetingsByUserId(userId)
	if err != nil {
		return nil, err
	}

	if len(meetings) == 0 {
		return nil, nil
	}

	return &meetings[0], nil
}

func (database *Database) GetLastMeetingsByUserId(userId string) (*Meeting, error) {
	meetings, err := database.GetMeetingsByUserId(userId)
	if err != nil {
		return nil, err
	}

	if len(meetings) == 0 {
		return nil, nil
	}

	return &meetings[0], nil
}

func (database *Database) SaveMeeting(meeting *Meeting) (*mgo.ChangeInfo, error) {
	change, err := database.DB.C("meetings").UpsertId(meeting.Id, meeting)
	if err != nil {
		return nil, err
	}
	return change, nil
}

func (database *Database) DeleteMeeting(meeting *Meeting) error {
	err := database.DeleteAllMeetingLog(meeting)
	if err != nil {
		return err
	}

	err = database.DB.C("meetings").RemoveId(meeting.Id)
	if err != nil {
		return err
	}
	return nil
}

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
	FinishTime       int64
	Participants     map[string]ParticipantData
	Id               bson.ObjectId `bson:"_id,omitempty"`
}

type ParticipantData struct {
	UserId  string
	Leave   bool
	IsAdmin bool
}

// Any change of this struct are required to update the hidden form part of meetings_form.html

// Check auth status
var UserNotInMeeting = errors.New("this user is not a participant of the meeting")
var CantCheckinError = errors.New("can't checkin right now")
var UserLeaveError = errors.New("user already marked leave")

func GetNewMeeting() *Meeting {
	meeting := new(Meeting)
	meeting.Participants = make(map[string]ParticipantData)
	return meeting
}

func (meeting *Meeting) GetMeetingLogId() string {
	return fmt.Sprintf("m:%s", meeting.MeetId)
}

func (meeting *Meeting) ParticipantAdmin(userId string, admin bool) {
	data := meeting.Participants[userId]
	data.Leave = admin
	meeting.Participants[userId] = data
}

func (meeting *Meeting) ParticipantLeave(userId string, leave bool) {
	data := meeting.Participants[userId]
	data.Leave = leave
	meeting.Participants[userId] = data
}

func (meeting *Meeting) CheckUserParticipate(userId string) bool {
	if _, ok := meeting.Participants[userId]; ok {
		return true
	}
	return false
}

func (meeting *Meeting) CheckUserAdmin(userId string) bool {
	if val, ok := meeting.Participants[userId]; ok {
		return val.IsAdmin
	}
	return false
}

func (meeting *Meeting) CheckIfMeetingCanCheckInNow(user *User) bool {
	if meeting.CheckinStarted() && !meeting.MeetingFinished() {
		if meeting.CheckinLevel == 0 || user.CheckPermissionLevel(PermissionLeader) {
			return true
		}
	}

	return false
}

func (meeting *Meeting) CheckIfVisibleToUser(user *User) bool {
	if user.CheckPermissionLevel(PermissionLeader) || meeting.CheckUserParticipate(user.GetIdentify()) {
		return true
	}
	return false
}

func (meeting *Meeting) MeetingStarted() bool {
	StartTime := time.Unix(meeting.StartTime, 0)
	return time.Now().After(StartTime)
}

func (meeting *Meeting) MeetingFinished() bool {
	return meeting.FinishTime != 0 && time.Now().After(time.Unix(meeting.FinishTime, 0))
}

func (meeting *Meeting) CheckinStarted() bool {
	StartCheckinTime := time.Unix(meeting.StartCheckinTime, 0)
	return time.Now().After(StartCheckinTime)
}

func (meeting *Meeting) DeleteParticipant(userId string) {
	delete(meeting.Participants, userId)
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

	if meeting.Participants[user.GetIdentify()].Leave {
		return UserLeaveError
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
	err := database.DB.C("meetings").Find(bson.M{}).Sort("-starttime").All(&meet)
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

	var out []Meeting

	for _, meet := range meetings {
		if meet.CheckUserParticipate(userId) {
			out = append(out, meet)
		}
	}
	return out, nil
}

func (database *Database) GetOngoingMeetingsByUserId(userId string) ([]Meeting, error) {
	meetings, err := database.GetMeetingsByUserId(userId)
	if err != nil {
		return nil, err
	}

	var out []Meeting

	for _, meet := range meetings {
		if meet.CheckinStarted() && !meet.MeetingFinished() {
			out = append(out, meet)
		}
	}

	if len(out) == 0 {
		return nil, nil
	}

	return out, nil
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

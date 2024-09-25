package punchclock

import (
	"time"

	"github.com/Team6083/OverHours/internal/errors"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal/event"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal/timelog"
)

var ErrAlreadyIn = errors.NewInvalidArgumentsError("already in")
var ErrNotIn = errors.NewInvalidArgumentsError("not in")
var ErrInvTime = errors.NewInvalidArgumentsError("invalid time")

type GetTimeLogsOptions struct {
	UserID    internal.UserID
	Status    timelog.Status
	StartTime time.Time
	EndTime   time.Time
}

type Service interface {
	PunchIn(userID internal.UserID, t time.Time, executor internal.UserID) (*event.Event, error)
	PunchOut(userID internal.UserID, t time.Time, executor internal.UserID) (*event.Event, error)
	Lock(userID internal.UserID, t time.Time, executor internal.UserID) (*event.Event, error)

	GetTimeLogs(options GetTimeLogsOptions) ([]timelog.TimeLog, error)
}

type service struct {
	eventRepo event.Repository
}

func (s *service) PunchIn(userID internal.UserID, t time.Time, executor internal.UserID) (*event.Event, error) {
	return s.addEvent(event.PunchIn, userID, t, executor)
}

func (s *service) PunchOut(userID internal.UserID, t time.Time, executor internal.UserID) (*event.Event, error) {
	return s.addEvent(event.PunchOut, userID, t, executor)
}

func (s *service) Lock(userID internal.UserID, t time.Time, executor internal.UserID) (*event.Event, error) {
	return s.addEvent(event.Locked, userID, t, executor)
}

func (s *service) GetTimeLogs(options GetTimeLogsOptions) ([]timelog.TimeLog, error) {
	var eventRepoFindAllOptFunctions []event.FindOptionFunc

	if options.UserID != "" {
		eventRepoFindAllOptFunctions = append(eventRepoFindAllOptFunctions, event.WhereUserID(options.UserID))
	}

	if !time.Time.IsZero(options.StartTime) {
		eventRepoFindAllOptFunctions = append(eventRepoFindAllOptFunctions, event.WhereTimeStart(options.StartTime))
	}

	if !time.Time.IsZero(options.EndTime) {
		eventRepoFindAllOptFunctions = append(eventRepoFindAllOptFunctions, event.WhereTimeEnd(options.EndTime))
	}

	events, err := s.eventRepo.FindAll(eventRepoFindAllOptFunctions...)
	if err != nil {
		return nil, err
	}

	logs, fi, li, err := timelog.ProcessEventsToTimeLogs(events)
	if err != nil {
		return nil, err
	}

	if fi != nil {
		// TODO: find prev event
	}

	if li != nil {
		// TODO: find next event

		log, err := timelog.NewTimeLog(li, nil)
		if err != nil {
			return nil, err
		}

		logs = append(logs, log)
	}

	return logs, nil
}

func (s *service) addEvent(eventType event.Type, userID internal.UserID, t time.Time, executor internal.UserID) (*event.Event, error) {
	last, err := s.eventRepo.FindLast(event.WhereUserID(userID))
	if err != nil {
		return nil, err
	}

	if last != nil && !last.Time.Before(t) {
		// last event is not earlier than this
		return nil, ErrInvTime
	}

	if eventType == event.PunchIn {
		if last != nil && last.Type == event.PunchIn {
			return nil, ErrAlreadyIn
		}
	} else {
		// For PunchOut, Lock
		if last == nil || last.Type != event.PunchIn {
			return nil, ErrNotIn
		}
	}

	ev := event.NewEvent(s.eventRepo.NewId(), userID, eventType, t, executor, time.Now())
	err = s.eventRepo.Store(&ev)
	if err != nil {
		return nil, err
	}

	return &ev, nil
}

func NewService(eventRepo event.Repository) Service {
	return &service{eventRepo}
}

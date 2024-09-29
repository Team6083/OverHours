package punchclock

import (
	"time"

	"github.com/Team6083/OverHours/internal/errors"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal"
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
	PunchIn(userID internal.UserID, t time.Time) (*timelog.TimeLog, error)
	PunchOut(userID internal.UserID, t time.Time) (*timelog.TimeLog, error)
	Lock(userID internal.UserID, t time.Time, notes string) (*timelog.TimeLog, error)

	GetTimeLogs(options GetTimeLogsOptions) ([]*timelog.TimeLog, error)
}

type service struct {
	timeLogRepo timelog.Repository
}

func (s *service) PunchIn(userID internal.UserID, t time.Time) (*timelog.TimeLog, error) {
	last, err := s.timeLogRepo.FindLast(timelog.WhereUserID(userID))
	if err != nil {
		return nil, err
	}

	if last != nil {
		if last.Status == timelog.CurrentlyIn {
			return nil, ErrAlreadyIn
		}

		// only for Done and Lock, error if time is not before OutTime
		if !last.OutTime.Before(t) {
			return nil, ErrInvTime
		}
	}

	tl := timelog.NewCurrentlyInTimeLog(s.timeLogRepo.NewId(), userID, t)
	err = s.timeLogRepo.Store(&tl)
	if err != nil {
		return nil, err
	}

	return &tl, nil
}

func (s *service) PunchOut(userID internal.UserID, t time.Time) (*timelog.TimeLog, error) {
	last, err := s.timeLogRepo.FindLast(timelog.WhereUserID(userID))
	if err != nil {
		return nil, err
	}

	if last == nil {
		return nil, ErrNotIn
	}

	err = last.FinishLog(t, true)
	if err != nil {
		return nil, err
	}

	err = s.timeLogRepo.Store(last)
	if err != nil {
		return nil, err
	}

	return last, nil
}

func (s *service) Lock(userID internal.UserID, t time.Time, notes string) (*timelog.TimeLog, error) {
	last, err := s.timeLogRepo.FindLast(timelog.WhereUserID(userID))
	if err != nil {
		return nil, err
	}

	if last == nil {
		return nil, ErrNotIn
	}

	err = last.FinishLog(t, true)
	if err != nil {
		return nil, err
	}

	last.SetNotes(notes)

	err = s.timeLogRepo.Store(last)
	if err != nil {
		return nil, err
	}

	return last, nil
}

func (s *service) GetTimeLogs(options GetTimeLogsOptions) ([]*timelog.TimeLog, error) {
	var findOptFunctions []timelog.FindOptionFunc

	if options.UserID != "" {
		findOptFunctions = append(findOptFunctions, timelog.WhereUserID(options.UserID))
	}

	if options.Status != timelog.Zero {
		findOptFunctions = append(findOptFunctions, timelog.WhereStatus(options.Status))
	}

	var zeroTime time.Time
	if !options.StartTime.IsZero() {
		findOptFunctions = append(findOptFunctions, timelog.WhereInTime(options.StartTime, options.EndTime))
	}

	if !options.EndTime.IsZero() {
		findOptFunctions = append(findOptFunctions, timelog.WhereOutTime(zeroTime, options.EndTime))
	}

	all, err := s.timeLogRepo.FindAll(findOptFunctions...)
	if err != nil {
		return nil, err
	}

	return all, nil
}

func NewService(timeLogRepo timelog.Repository) Service {
	return &service{timeLogRepo}
}

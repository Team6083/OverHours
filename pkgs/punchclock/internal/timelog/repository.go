package timelog

import (
	"time"

	"github.com/Team6083/OverHours/pkgs/punchclock/internal"
)

type TimeFindOption struct {
	Start time.Time
	End   time.Time
}

type FindOptions struct {
	UserID  internal.UserID
	Status  Status
	InTime  TimeFindOption
	OutTime TimeFindOption
}

type FindOptionFunc func(opt FindOptions) FindOptions

type Repository interface {
	NewId() ID
	Store(timeLog *TimeLog) error
	Find(id ID) (*TimeLog, error)
	FindAll(optionFunctions ...FindOptionFunc) ([]*TimeLog, error)
	FindLast(optionFunctions ...FindOptionFunc) (*TimeLog, error)
}

func WhereUserID(uid internal.UserID) FindOptionFunc {
	return func(opt FindOptions) FindOptions {
		opt.UserID = uid
		return opt
	}
}

func WhereStatus(s Status) FindOptionFunc {
	return func(opt FindOptions) FindOptions {
		opt.Status = s
		return opt
	}
}

func WhereInTime(start time.Time, end time.Time) FindOptionFunc {
	return func(opt FindOptions) FindOptions {
		opt.InTime = TimeFindOption{start, end}
		return opt
	}
}

func WhereOutTime(start time.Time, end time.Time) FindOptionFunc {
	return func(opt FindOptions) FindOptions {
		opt.OutTime = TimeFindOption{start, end}
		return opt
	}
}

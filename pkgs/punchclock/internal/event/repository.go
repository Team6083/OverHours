package event

import (
	"github.com/Team6083/OverHours/pkgs/punchclock/internal"
	"time"
)

type FindOptions struct {
	UserID internal.UserID
	Type   Type

	TimeStart time.Time
	TimeEnd   time.Time

	Executor internal.UserID
}

type FindOptionFunc func(opt FindOptions) FindOptions

type Repository interface {
	NewId() ID
	Store(event *Event) error
	Find(id ID) (*Event, error)
	FindAll(optionFunctions ...FindOptionFunc) ([]*Event, error)
	FindLast(optionFunctions ...FindOptionFunc) (*Event, error)
}

func WhereUserID(uid internal.UserID) FindOptionFunc {
	return func(opt FindOptions) FindOptions {
		opt.UserID = uid
		return opt
	}
}

func WhereType(et Type) FindOptionFunc {
	return func(opt FindOptions) FindOptions {
		opt.Type = et
		return opt
	}
}

func WhereTimeStart(t time.Time) FindOptionFunc {
	return func(opt FindOptions) FindOptions {
		opt.TimeStart = t
		return opt
	}
}

func WhereTimeEnd(t time.Time) FindOptionFunc {
	return func(opt FindOptions) FindOptions {
		opt.TimeEnd = t
		return opt
	}
}

func WhereExecutor(executor internal.UserID) FindOptionFunc {
	return func(opt FindOptions) FindOptions {
		opt.Executor = executor
		return opt
	}
}

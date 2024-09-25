package event

import (
	"github.com/Team6083/OverHours/internal/ddd"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal"
	"time"
)

type ID string
type Type int

const (
	Empty Type = 0

	PunchIn Type = iota
	PunchOut
	Locked
)

type Event struct {
	ddd.AggregateRootBase

	ID ID

	UserID internal.UserID
	Type   Type
	Time   time.Time

	Executor   internal.UserID
	LastEditAt time.Time
}

func NewEvent(id ID, userId internal.UserID, eventType Type, time time.Time, executor internal.UserID, lastEditAt time.Time) Event {

	return Event{
		ID: id,

		UserID: userId,
		Type:   eventType,
		Time:   time,

		Executor:   executor,
		LastEditAt: lastEditAt,
	}
}

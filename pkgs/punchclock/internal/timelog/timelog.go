package timelog

import (
	"errors"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal/event"
	"sort"
	"time"
)

type Status int

const (
	CurrentlyIn Status = iota
	Done
	Locked
)

var ErrInvalidInEvent = errors.New("invalid in event")
var ErrInvalidOutEvent = errors.New("invalid out event")
var CorruptedEvents = errors.New("corrupted events")

type TimeLog struct {
	UserID  internal.UserID
	Status  Status
	InTime  time.Time
	OutTime time.Time

	RelatedEventIDs []event.ID
}

func NewTimeLog(inEvent *event.Event, outEvent *event.Event) (TimeLog, error) {

	if inEvent == nil || inEvent.Type != event.PunchIn {
		return TimeLog{}, ErrInvalidInEvent
	}

	if outEvent != nil && outEvent.Type != event.PunchOut && outEvent.Type != event.Locked {
		return TimeLog{}, ErrInvalidOutEvent
	}

	var status Status
	if outEvent == nil {
		status = CurrentlyIn
	} else if outEvent.Type == event.PunchOut {
		status = Done
	} else if outEvent.Type == event.Locked {
		status = Locked
	}

	relatedEventIDs := []event.ID{inEvent.ID}
	userID := inEvent.UserID
	var outTime time.Time
	if outEvent != nil {
		outTime = outEvent.Time
		relatedEventIDs = append(relatedEventIDs, outEvent.ID)

		if outEvent.UserID != userID {
			return TimeLog{}, ErrInvalidOutEvent
		}
	}

	return TimeLog{
		UserID:          userID,
		Status:          status,
		InTime:          inEvent.Time,
		OutTime:         outTime,
		RelatedEventIDs: relatedEventIDs,
	}, nil
}

func ProcessEventsToTimeLogs(events []*event.Event) ([]TimeLog, *event.Event, *event.Event, error) {
	var logs []TimeLog
	var firstIgnored, lastIgnored *event.Event

	sort.SliceStable(events, func(i, j int) bool {
		return events[i].Time.Before(events[j].Time)
	})

	var inEvent *event.Event
	for i, nextEvent := range events {
		// Ignore first event if not punch
		if i == 0 && nextEvent.Type != event.PunchIn {
			firstIgnored = nextEvent
			continue
		}

		if inEvent == nil {
			if nextEvent.Type != event.PunchIn {
				// If current not in, and next not in
				return logs, nil, nil, CorruptedEvents
			}

			inEvent = nextEvent
		} else {
			if nextEvent.Type == event.PunchIn {
				// If current in, and next in
				return logs, nil, nil, CorruptedEvents
			}

			log, err := NewTimeLog(inEvent, nextEvent)
			if err != nil {
				return logs, nil, nil, err
			}

			inEvent = nil
			logs = append(logs, log)
		}
	}

	if inEvent != nil {
		lastIgnored = inEvent
	}

	return logs, firstIgnored, lastIgnored, nil
}

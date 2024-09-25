package inmem

import (
	"time"

	"github.com/lithammer/shortuuid/v4"

	"github.com/Team6083/OverHours/internal/inmem"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal/event"
)

type EventInMemRepo struct {
	inMem *inmem.Repository
}

func (r *EventInMemRepo) NewId() event.ID {
	return event.ID(shortuuid.New())
}

func (r *EventInMemRepo) Store(event *event.Event) error {
	return r.inMem.Store(string(event.ID), event)
}

func (r *EventInMemRepo) Find(id event.ID) (*event.Event, error) {
	res, err := r.inMem.Find(string(id))
	if err != nil {
		return nil, err
	}

	return res.(*event.Event), nil
}

func (r *EventInMemRepo) FindAll(optionFunctions ...event.FindOptionFunc) ([]*event.Event, error) {
	option := event.FindOptions{}

	for _, optionFunction := range optionFunctions {
		option = optionFunction(option)
	}

	res, err := r.inMem.FindAll(func(e interface{}) bool {
		value := e.(*event.Event)
		if (option.UserID != "" && value.UserID != option.UserID) ||
			(option.Type != event.Empty && value.Type != option.Type) ||
			(option.Executor != "" && value.Executor != option.Executor) {
			return false
		}

		if (!time.Time.IsZero(option.TimeStart) && value.Time.Before(option.TimeStart)) ||
			(!time.Time.IsZero(option.TimeEnd) && value.Time.After(option.TimeEnd)) {
			return false
		}

		return true
	})
	if err != nil {
		return nil, err
	}

	result := make([]*event.Event, 0, len(res))
	for _, value := range res {
		result = append(result, value.(*event.Event))
	}

	return result, nil
}

func (r *EventInMemRepo) FindLast(optionFunctions ...event.FindOptionFunc) (*event.Event, error) {
	events, err := r.FindAll(optionFunctions...)
	if err != nil {
		return nil, err
	}

	if len(events) == 0 {
		return nil, nil
	}

	var result *event.Event
	for _, e := range events {
		if result == nil || result.Time.Before(e.Time) {
			result = e
		}
	}

	return result, nil
}

func NewEventRepository() event.Repository {
	return &EventInMemRepo{
		inMem: inmem.NewInMemRepository(),
	}
}

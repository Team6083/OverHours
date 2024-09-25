package punchclock

import (
	"context"
	"errors"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal/timelog"
	"time"

	"github.com/go-kit/kit/endpoint"

	"github.com/Team6083/OverHours/pkgs/punchclock/internal/event"
)

var (
	ErrMissingParam = errors.New("missing parameter")
)

type EventDTO struct {
	ID string `json:"id"`

	UserID string    `json:"userId"`
	Type   string    `json:"type"`
	Time   time.Time `json:"time"`

	Executor   string    `json:"executor"`
	LastEditAt time.Time `json:"lastEditAt"`
}

func NewEventDTO(ev *event.Event) EventDTO {
	var eventType string
	if ev.Type == event.PunchIn {
		eventType = "PunchIn"
	} else if ev.Type == event.PunchOut {
		eventType = "PunchOut"
	} else if ev.Type == event.Locked {
		eventType = "Locked"
	} else {
		eventType = "Unknown"
	}

	return EventDTO{
		string(ev.ID),
		string(ev.UserID),
		eventType,
		ev.Time,
		string(ev.Executor),
		ev.LastEditAt,
	}
}

type TimeLogDTO struct {
	UserID  string    `json:"userId"`
	Status  string    `json:"status"`
	InTime  time.Time `json:"inTime"`
	OutTime time.Time `json:"outTime"`

	RelatedEventIDs []string `json:"relatedEventIds"`
}

func NewTimeLogDTO(l timelog.TimeLog) TimeLogDTO {
	var status string
	if l.Status == timelog.CurrentlyIn {
		status = "CurrentlyIn"
	} else if l.Status == timelog.Done {
		status = "Done"
	} else if l.Status == timelog.Locked {
		status = "Locked"
	} else {
		status = "Unknown"
	}

	rIds := make([]string, len(l.RelatedEventIDs))
	for i, id := range l.RelatedEventIDs {
		rIds[i] = string(id)
	}

	return TimeLogDTO{
		string(l.UserID),
		status,
		l.InTime,
		l.OutTime,
		rIds,
	}
}

type basicEventRequest struct {
	UserId   string    `json:"userId"`
	Time     time.Time `json:"time"`
	Executor string    `json:"executor"`
}

type punchInRequest struct {
	basicEventRequest
}

type punchInResponse struct {
	Event EventDTO `json:"event"`
}

func makePunchInEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(*punchInRequest)

		if req.UserId == "" || time.Time.IsZero(req.Time) || req.Executor == "" {
			return nil, ErrMissingParam
		}

		ev, err := s.PunchIn(internal.UserID(req.UserId), req.Time, internal.UserID(req.Executor))
		if err != nil {
			return nil, err
		}

		return punchInResponse{NewEventDTO(ev)}, nil
	}
}

type punchOutRequest struct {
	basicEventRequest
}

type punchOutResponse struct {
	Event EventDTO `json:"event"`
}

func makePunchOutEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(*punchOutRequest)

		if req.UserId == "" || time.Time.IsZero(req.Time) || req.Executor == "" {
			return nil, ErrMissingParam
		}

		ev, err := s.PunchOut(internal.UserID(req.UserId), req.Time, internal.UserID(req.Executor))
		if err != nil {
			return nil, err
		}

		return punchOutResponse{NewEventDTO(ev)}, nil
	}
}

type lockRequest struct {
	basicEventRequest
}

type lockResponse struct {
	Event EventDTO `json:"event"`
}

func makeLockEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(*lockRequest)

		if req.UserId == "" || time.Time.IsZero(req.Time) || req.Executor == "" {
			return nil, ErrMissingParam
		}

		ev, err := s.Lock(internal.UserID(req.UserId), req.Time, internal.UserID(req.Executor))
		if err != nil {
			return nil, err
		}

		return lockResponse{NewEventDTO(ev)}, nil
	}
}

type getTimeLogsRequest struct {
}

type getTimeLogsResponse struct {
	Logs []TimeLogDTO `json:"logs"`
}

func makeGetTimeLogsEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {

		var opts GetTimeLogsOptions
		logs, err := s.GetTimeLogs(opts)
		if err != nil {
			return nil, err
		}

		dtos := make([]TimeLogDTO, len(logs))
		for i, log := range logs {
			dtos[i] = NewTimeLogDTO(log)
		}

		return getTimeLogsResponse{dtos}, nil
	}
}

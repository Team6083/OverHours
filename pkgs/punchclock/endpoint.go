package punchclock

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-kit/kit/endpoint"

	internalErrors "github.com/Team6083/OverHours/internal/errors"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal/timelog"
)

var (
	ErrMissingParam = errors.New("missing parameter")
)

const (
	StatusCurrentlyIn = "currently-in"
	StatusDone        = "done"
	StatusLocked      = "locked"
	StatusUnknown     = "unknown"
)

type TimeLogDTO struct {
	ID     string `json:"id"`
	UserID string `json:"userId"`

	Status  string     `json:"status"`
	InTime  time.Time  `json:"inTime"`
	OutTime *time.Time `json:"outTime"`

	Notes string `json:"notes"`
}

func NewTimeLogDTO(l *timelog.TimeLog) TimeLogDTO {
	var status string
	if l.Status == timelog.CurrentlyIn {
		status = StatusCurrentlyIn
	} else if l.Status == timelog.Done {
		status = StatusDone
	} else if l.Status == timelog.Locked {
		status = StatusLocked
	} else {
		status = StatusUnknown
	}

	var outTime *time.Time
	if !l.OutTime.IsZero() {
		outTime = &l.OutTime
	}

	return TimeLogDTO{
		string(l.ID),
		string(l.UserID),
		status,
		l.InTime,
		outTime,
		l.Notes,
	}
}

type generalInOutRequest struct {
	UserId string    `json:"userId"`
	Time   time.Time `json:"time"`
}

type generalInOutResponse struct {
	TimeLog TimeLogDTO `json:"timeLog"`
}

type punchInRequest struct {
	generalInOutRequest
}

type punchInResponse struct {
	generalInOutResponse
}

func makePunchInEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(*punchInRequest)

		if req.UserId == "" || time.Time.IsZero(req.Time) {
			return nil, fmt.Errorf("%w: userId, time is required", ErrMissingParam)
		}

		tl, err := s.PunchIn(internal.UserID(req.UserId), req.Time)
		if err != nil {
			return nil, err
		}

		return punchInResponse{generalInOutResponse{NewTimeLogDTO(tl)}}, nil
	}
}

type punchOutRequest struct {
	generalInOutRequest
}

type punchOutResponse struct {
	generalInOutResponse
}

func makePunchOutEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(*punchOutRequest)

		if req.UserId == "" || time.Time.IsZero(req.Time) {
			return nil, fmt.Errorf("%w: userId, time is required", ErrMissingParam)
		}

		tl, err := s.PunchOut(internal.UserID(req.UserId), req.Time)
		if err != nil {
			return nil, err
		}

		return punchOutResponse{generalInOutResponse{NewTimeLogDTO(tl)}}, nil
	}
}

type lockRequest struct {
	generalInOutRequest
	Notes string `json:"notes"`
}

type lockResponse struct {
	generalInOutResponse
}

func makeLockEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(*lockRequest)

		if req.UserId == "" || time.Time.IsZero(req.Time) {
			return nil, fmt.Errorf("%w: userId, time is required", ErrMissingParam)
		}

		tl, err := s.Lock(internal.UserID(req.UserId), req.Time, req.Notes)
		if err != nil {
			return nil, err
		}

		return lockResponse{generalInOutResponse{NewTimeLogDTO(tl)}}, nil
	}
}

type getTimeLogsRequest struct {
	Status string
	UserID string
}

type getTimeLogsResponse struct {
	Logs []TimeLogDTO `json:"logs"`
}

func makeGetTimeLogsEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(*getTimeLogsRequest)

		var opts GetTimeLogsOptions
		if req.Status != "" {
			switch req.Status {
			case StatusCurrentlyIn:
				opts.Status = timelog.CurrentlyIn
			case StatusDone:
				opts.Status = timelog.Done
			case StatusLocked:
				opts.Status = timelog.Locked
			default:
				return nil, internalErrors.NewInvalidArgumentsError("invalid status")
			}
		}

		if req.UserID != "" {
			opts.UserID = internal.UserID(req.UserID)
		}

		timeLogs, err := s.GetTimeLogs(opts)
		if err != nil {
			return nil, err
		}

		timeLogDTOs := make([]TimeLogDTO, len(timeLogs))
		for i, log := range timeLogs {
			timeLogDTOs[i] = NewTimeLogDTO(log)
		}

		return getTimeLogsResponse{timeLogDTOs}, nil
	}
}

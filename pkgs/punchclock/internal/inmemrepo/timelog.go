package inmemrepo

import (
	"github.com/lithammer/shortuuid/v4"

	"github.com/Team6083/OverHours/internal/inmem"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal/timelog"
)

type TimeLogInMemRepository struct {
	inMem *inmem.Repository
}

func (r *TimeLogInMemRepository) NewId() timelog.ID {
	return timelog.ID(shortuuid.New())
}

func (r *TimeLogInMemRepository) Store(timeLog *timelog.TimeLog) error {
	return r.inMem.Store(string(timeLog.ID), timeLog)
}

func (r *TimeLogInMemRepository) Find(id timelog.ID) (*timelog.TimeLog, error) {
	res, err := r.inMem.Find(string(id))
	if err != nil {
		return nil, err
	}

	return res.(*timelog.TimeLog), nil
}

func (r *TimeLogInMemRepository) FindAll(optionFunctions ...timelog.FindOptionFunc) ([]*timelog.TimeLog, error) {
	option := timelog.FindOptions{}

	for _, optionFunction := range optionFunctions {
		option = optionFunction(option)
	}

	res, err := r.inMem.FindAll(func(e interface{}) bool {
		value := e.(*timelog.TimeLog)
		if (option.UserID != "" && value.UserID != option.UserID) ||
			(option.Status != timelog.Zero && value.Status != option.Status) {
			return false
		}

		if (!option.InTime.Start.IsZero() && value.InTime.Before(option.InTime.Start)) ||
			(!option.InTime.End.IsZero() && value.InTime.After(option.InTime.End)) {
			return false
		}

		if (!option.OutTime.Start.IsZero() && value.OutTime.Before(option.OutTime.Start)) ||
			(!option.OutTime.End.IsZero() && value.OutTime.After(option.OutTime.End)) {
			return false
		}

		return true
	})
	if err != nil {
		return nil, err
	}

	result := make([]*timelog.TimeLog, 0, len(res))
	for _, value := range res {
		result = append(result, value.(*timelog.TimeLog))
	}

	return result, nil
}

func (r *TimeLogInMemRepository) FindLast(optionFunctions ...timelog.FindOptionFunc) (*timelog.TimeLog, error) {
	events, err := r.FindAll(optionFunctions...)
	if err != nil {
		return nil, err
	}

	if len(events) == 0 {
		return nil, nil
	}

	var result *timelog.TimeLog
	for _, e := range events {
		if result == nil || result.InTime.Before(e.InTime) {
			result = e
		}
	}

	return result, nil
}

func NewTimeLogRepository() *TimeLogInMemRepository {
	return &TimeLogInMemRepository{
		inMem: inmem.NewInMemRepository(),
	}
}

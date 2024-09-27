package timelog

import (
	"time"

	"github.com/Team6083/OverHours/internal/errors"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal"
)

var (
	ErrInvStatus = errors.NewInvalidArgumentsError("invalid status")
	ErrInvTime   = errors.NewInvalidArgumentsError("invalid time")
)

type ID string

type Status int

const (
	Zero Status = 0

	CurrentlyIn Status = iota
	Done
	Locked
)

type TimeLog struct {
	ID     ID
	UserID internal.UserID

	Status  Status
	InTime  time.Time
	OutTime time.Time

	Notes string
}

func (tl *TimeLog) FinishLog(t time.Time, isLocked bool) error {
	if tl.Status != CurrentlyIn {
		return ErrInvStatus
	}

	// if OutTime is not after InTime
	if !t.After(tl.InTime) {
		return ErrInvTime
	}

	tl.OutTime = t

	if isLocked {
		tl.Status = Locked
	} else {
		tl.Status = Done
	}

	return nil
}

func (tl *TimeLog) SetNotes(notes string) {
	tl.Notes = notes
}

func NewTimeLog(id ID, userID internal.UserID, status Status, inTime time.Time, outTime time.Time) TimeLog {
	return TimeLog{
		ID:      id,
		UserID:  userID,
		Status:  status,
		InTime:  inTime,
		OutTime: outTime,
	}
}

func NewCurrentlyInTimeLog(id ID, userID internal.UserID, t time.Time) TimeLog {
	var zeroTime time.Time
	return NewTimeLog(id, userID, CurrentlyIn, t, zeroTime)
}

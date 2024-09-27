package punchclock

import (
	"github.com/Team6083/OverHours/pkgs/punchclock/internal"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal/timelog"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/Team6083/OverHours/pkgs/punchclock/internal/event"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal/inmemrepo"
)

func setup() (Service, event.Repository) {
	repo := inmemrepo.NewTimeLogRepository()
	return NewService(repo), repo
}

func assertEvent(t *testing.T, ev *event.Event,
	userId internal.UserID, ti time.Time, eventType event.Type, startTestTime time.Time) {
	assert.NotNil(t, ev)
	assert.NotEmpty(t, ev.ID)
	assert.Equal(t, userId, ev.UserID)
	assert.Equal(t, eventType, ev.Type)
	assert.Equal(t, ti, ev.Time)
	assert.Equal(t, userId, ev.Executor)
	assert.Condition(t, func() (success bool) {
		return ev.LastEditAt.Before(time.Now()) && ev.LastEditAt.After(startTestTime)
	})
}

func TestService_PunchIn(t *testing.T) {
	svc, repo := setup()
	startTestTime := time.Now()

	userId := internal.UserID("abc")
	ti := time.Now()

	ev, err := svc.PunchIn(userId, ti, userId)
	if err != nil {
		t.Fatal(err)
		return
	}

	all, err := repo.FindAll()
	if err != nil {
		t.Fatal(err)
		return
	}

	assertEvent(t, ev, userId, ti, event.PunchIn, startTestTime)
	assert.Equal(t, 1, len(all))
}

func TestService_PunchOut(t *testing.T) {
	svc, repo := setup()

	userId := internal.UserID("abc")
	inTime := time.Now()

	_, err := svc.PunchIn(userId, inTime, userId)
	if err != nil {
		t.Fatal(err)
		return
	}

	t.Run("Should create PunchOut event", func(t *testing.T) {
		startTestTime := time.Now()
		outTime := time.Now()

		ev, err := svc.PunchOut(userId, outTime, userId)
		if err != nil {
			t.Fatal(err)
			return
		}

		assertEvent(t, ev, userId, outTime, event.PunchOut, startTestTime)

		all, err := repo.FindAll()
		if err != nil {
			t.Fatal(err)
			return
		}

		assert.Equal(t, 2, len(all))
	})

	t.Run("Should return error if user is not in", func(t *testing.T) {
		_, err := svc.PunchOut("def", time.Now(), userId)
		if err != nil {
			assert.ErrorIs(t, err, ErrNotIn)
			return
		}
	})

	t.Run("Should return error if time before last event", func(t *testing.T) {
		_, err := svc.PunchOut(userId, inTime.Truncate(time.Hour), userId)
		if err != nil {
			assert.ErrorIs(t, err, ErrInvTime)
			return
		}
	})
}

func TestService_GetTimeLogs(t *testing.T) {
	svc, _ := setup()
	userId := internal.UserID("abc")

	t.Run("Should get time logs", func(t *testing.T) {
		t1 := time.Now()
		t2 := t1.Add(time.Hour)
		t3 := t2.Add(time.Hour)
		t4 := t3.Add(time.Hour)
		t5 := t4.Add(time.Hour)

		_, err := svc.PunchIn(userId, t1, userId)
		assert.NoError(t, err)
		_, err = svc.PunchOut(userId, t2, userId)
		assert.NoError(t, err)

		_, err = svc.PunchIn(userId, t3, userId)
		assert.NoError(t, err)
		_, err = svc.Lock(userId, t4, userId)
		assert.NoError(t, err)

		_, err = svc.PunchIn(userId, t5, userId)
		assert.NoError(t, err)

		// Test
		opts := GetTimeLogsOptions{}
		logs, err := svc.GetTimeLogs(opts)

		// Check
		assert.NoError(t, err)
		assert.Equal(t, 3, len(logs))

		// [0]
		assert.Equal(t, userId, logs[0].UserID)
		assert.Equal(t, t1, logs[0].InTime)
		assert.Equal(t, t2, logs[0].OutTime)
		assert.Equal(t, timelog.Done, logs[0].Status)

		// [1]
		assert.Equal(t, userId, logs[1].UserID)
		assert.Equal(t, t3, logs[1].InTime)
		assert.Equal(t, t4, logs[1].OutTime)
		assert.Equal(t, timelog.Locked, logs[1].Status)

		// [2]
		assert.Equal(t, userId, logs[2].UserID)
		assert.Equal(t, t5, logs[2].InTime)
		assert.True(t, time.Time.IsZero(logs[2].OutTime))
		assert.Equal(t, timelog.CurrentlyIn, logs[2].Status)
	})
}

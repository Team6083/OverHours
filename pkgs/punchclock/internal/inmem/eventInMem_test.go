package inmem

import (
	"github.com/Team6083/OverHours/pkgs/punchclock/internal/event"
	"github.com/stretchr/testify/suite"
	"testing"
	"time"
)

type EventInMemTestSuite struct {
	suite.Suite
	repo event.Repository
}

func (s *EventInMemTestSuite) NewEvent() event.Event {
	t := time.Now()
	t2 := t.Add(time.Second)
	id := s.repo.NewId()

	return event.NewEvent(id, "abc", event.PunchIn, t, "def", t2)
}

func (s *EventInMemTestSuite) SetupTest() {
	s.repo = NewEventRepository()
}

func (s *EventInMemTestSuite) TestStoreAndFind() {
	ev := s.NewEvent()

	err := s.repo.Store(&ev)
	if err != nil {
		s.T().Error(err)
		return
	}

	result, err := s.repo.Find(ev.ID)
	if err != nil {
		s.T().Error(err)
		return
	}

	s.Equal(&ev, result)
}

func (s *EventInMemTestSuite) TestFindAllWhereUserID() {
	ev1 := s.NewEvent()
	ev2 := s.NewEvent()

	err := s.repo.Store(&ev1)
	if err != nil {
		s.T().Error(err)
		return
	}

	err = s.repo.Store(&ev2)
	if err != nil {
		s.T().Error(err)
		return
	}

	result, err := s.repo.FindAll(event.WhereUserID("abc"))
	if err != nil {
		s.T().Error(err)
		return
	}

	s.Len(result, 2)
	s.Equal(&ev1, result[0])
	s.Equal(&ev2, result[1])

	result2, err := s.repo.FindAll(event.WhereUserID("def"))
	if err != nil {
		s.T().Error(err)
		return
	}

	s.Len(result2, 0)
}

// TODO: more tests

func TestEventInMem(t *testing.T) {
	suite.Run(t, new(EventInMemTestSuite))
}

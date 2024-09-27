package inmemrepo

import (
	"testing"
	"time"

	"github.com/stretchr/testify/suite"

	"github.com/Team6083/OverHours/pkgs/punchclock/internal/timelog"
)

type TimeLogInMemRepositoryTestSuite struct {
	suite.Suite
	repo timelog.Repository
}

func (s *TimeLogInMemRepositoryTestSuite) NewTimeLog() timelog.TimeLog {
	t := time.Now()
	t2 := t.Add(time.Second * 10)
	id := s.repo.NewId()

	return timelog.NewTimeLog(id, "abc", timelog.Done, t, t2)
}

func (s *TimeLogInMemRepositoryTestSuite) SetupTest() {
	s.repo = NewTimeLogRepository()
}

func (s *TimeLogInMemRepositoryTestSuite) TestStoreAndFind() {
	tl := s.NewTimeLog()

	err := s.repo.Store(&tl)
	if err != nil {
		s.T().Error(err)
		return
	}

	result, err := s.repo.Find(tl.ID)
	if err != nil {
		s.T().Error(err)
		return
	}

	s.Equal(&tl, result)
}

func (s *TimeLogInMemRepositoryTestSuite) TestFindAllWhereUserID() {
	tl1 := s.NewTimeLog()
	tl2 := s.NewTimeLog()

	err := s.repo.Store(&tl1)
	if err != nil {
		s.T().Error(err)
		return
	}

	err = s.repo.Store(&tl2)
	if err != nil {
		s.T().Error(err)
		return
	}

	result, err := s.repo.FindAll(timelog.WhereUserID("abc"))
	if err != nil {
		s.T().Error(err)
		return
	}

	s.Len(result, 2)
	s.Equal(&tl1, result[0])
	s.Equal(&tl2, result[1])

	result2, err := s.repo.FindAll(timelog.WhereUserID("def"))
	if err != nil {
		s.T().Error(err)
		return
	}

	s.Len(result2, 0)
}

// TODO: more tests

func TestEventInMem(t *testing.T) {
	suite.Run(t, new(TimeLogInMemRepositoryTestSuite))
}

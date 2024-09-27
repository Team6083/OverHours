package punchclock

import "github.com/Team6083/OverHours/pkgs/punchclock/internal/inmemrepo"

func NewInMemTimeLogRepository() *inmemrepo.TimeLogInMemRepository {
	return inmemrepo.NewTimeLogRepository()
}

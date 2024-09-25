package punchclock

import (
	"github.com/Team6083/OverHours/pkgs/punchclock/internal/event"
	"github.com/Team6083/OverHours/pkgs/punchclock/internal/inmem"
)

func NewInMemEventRepository() event.Repository {
	return inmem.NewEventRepository()
}

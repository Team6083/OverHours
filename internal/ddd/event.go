package ddd

import (
	"context"
	"sync"
)

type DomainEvent interface {
	Name() string
	AggregateId() string
	IsAsynchronous() bool
}

type DomainEventHandler interface {
	HandleEvent(ctx context.Context, event DomainEvent) error
}

type DomainEventPublisher struct {
	mut      sync.RWMutex
	handlers map[string][]DomainEventHandler
}

func NewDomainEventPublisher() *DomainEventPublisher {
	return &DomainEventPublisher{
		handlers: make(map[string][]DomainEventHandler),
	}
}

func (e *DomainEventPublisher) Subscribe(handler DomainEventHandler, events ...DomainEvent) {
	e.mut.Lock()
	defer e.mut.Unlock()

	for _, event := range events {
		handlers := e.handlers[event.Name()]
		handlers = append(handlers, handler)
		e.handlers[event.Name()] = handlers
	}
}

func (e *DomainEventPublisher) Notify(ctx context.Context, event DomainEvent, errorHandler func(err error)) {
	if event.IsAsynchronous() {
		go func() {
			err := e.notify(ctx, event)
			if err != nil {
				errorHandler(err)
			}
		}()
	}

	err := e.notify(ctx, event)
	if err != nil {
		errorHandler(err)
	}
}

func (e *DomainEventPublisher) notify(ctx context.Context, event DomainEvent) error {
	e.mut.RLock()
	defer e.mut.RUnlock()

	for _, handler := range e.handlers[event.Name()] {
		err := handler.HandleEvent(ctx, event)
		if err != nil {
			return err
		}
	}

	return nil
}

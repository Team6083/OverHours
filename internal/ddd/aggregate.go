package ddd

import "context"

type AggregateRootBase struct {
	events []DomainEvent
}

func (ar *AggregateRootBase) Events() []DomainEvent {
	return ar.events
}

func (ar *AggregateRootBase) AddEvent(event DomainEvent) {
	ar.events = append(ar.events, event)
}

func (ar *AggregateRootBase) Dispatch(ctx context.Context, publisher *DomainEventPublisher, errorHandler func(err error)) {
	for _, event := range ar.events {
		publisher.Notify(ctx, event, errorHandler)
	}
}

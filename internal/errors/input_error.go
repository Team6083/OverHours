package errors

import (
	"errors"
	"fmt"
)

var (
	ErrInvalidArguments = errors.New("invalid arguments")
)

func NewInvalidArgumentsError(msg string) error {
	return fmt.Errorf("%w: %s", ErrInvalidArguments, msg)
}

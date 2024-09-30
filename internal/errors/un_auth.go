package errors

import (
	"errors"
	"fmt"
)

var ErrUnAuth = errors.New("un authorized")

func NewUnAuthError(msg string) error {
	return fmt.Errorf("%w: %s", ErrUnAuth, msg)
}

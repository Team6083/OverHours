package user

import (
	"golang.org/x/crypto/bcrypt"

	"github.com/Team6083/OverHours/internal/ddd"
	internalErrors "github.com/Team6083/OverHours/internal/errors"
)

type ID string

type User struct {
	ddd.AggregateRootBase

	ID       ID
	Name     string
	Email    string
	Password string
}

func NewUser(id ID, name string, email string) (User, error) {
	if len(id) == 0 {
		return User{}, internalErrors.NewInvalidArgumentsError("id is required")
	}

	return User{
		ID:    id,
		Name:  name,
		Email: email,
	}, nil
}

type UpdateUserInput struct {
	Name *string
}

func (u *User) Update(input UpdateUserInput) {
	if input.Name != nil {
		u.Name = *input.Name
	}
}

func (u *User) SetPassword(password string) error {
	if len(password) == 0 {
		u.Password = ""
		return nil
	}

	hash, err := hashPassword(password)
	if err != nil {
		return err
	}

	u.Password = hash
	return nil
}

func (u *User) ValidatePassword(password string) (bool, error) {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	if err != nil {
		if err == bcrypt.ErrMismatchedHashAndPassword {
			return false, nil
		}

		return false, err
	}

	return true, nil
}

func hashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hashed), nil
}

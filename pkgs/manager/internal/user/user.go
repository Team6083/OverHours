package user

import "github.com/Team6083/OverHours/internal/ddd"

type ID string

type User struct {
	ddd.AggregateRootBase

	ID    ID
	Name  string
	Email string

	IsSiteAdmin bool
}

func NewUser(id ID, name string, email string, isSiteAdmin bool) User {
	return User{
		ID:          id,
		Name:        name,
		Email:       email,
		IsSiteAdmin: isSiteAdmin,
	}
}

type UpdateUserInput struct {
	Name        *string
	IsSiteAdmin *bool
}

func (u *User) Update(input UpdateUserInput) {
	if input.Name != nil {
		u.Name = *input.Name
	}

	if input.IsSiteAdmin != nil {
		u.IsSiteAdmin = *input.IsSiteAdmin
	}
}

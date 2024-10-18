package inmemrepo

import (
	"github.com/lithammer/shortuuid/v4"

	"github.com/Team6083/OverHours/internal/inmem"
	"github.com/Team6083/OverHours/pkgs/identity/internal/user"
)

type InMemUserRepo struct {
	inMem *inmem.Repository
}

func (i *InMemUserRepo) NewId() user.ID {
	return user.ID(shortuuid.New())
}

func (i *InMemUserRepo) Store(user *user.User) error {
	return i.inMem.Store(string(user.ID), user)
}

func (i *InMemUserRepo) Find(id user.ID) (*user.User, error) {
	result, err := i.inMem.Find(string(id))
	if err != nil {
		return nil, err
	}

	return result.(*user.User), nil
}

func (i *InMemUserRepo) FindAll() ([]*user.User, error) {
	data, err := i.inMem.FindAll(func(e interface{}) bool {
		return true
	})

	if err != nil {
		return nil, err
	}

	users := make([]*user.User, len(data))
	for i := range data {
		users[i] = data[i].(*user.User)
	}

	return users, nil
}

func NewUserRepo() *InMemUserRepo {
	return &InMemUserRepo{
		inMem: inmem.NewInMemRepository(),
	}
}

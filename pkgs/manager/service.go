package manager

import (
	"errors"

	internalErrors "github.com/Team6083/OverHours/internal/errors"
	"github.com/Team6083/OverHours/pkgs/manager/internal/user"
)

type Service interface {
	CreateUser(id user.ID, name string, email string, password string) (*user.User, error)
	UpdateUser(id user.ID, input user.UpdateUserInput) (*user.User, error)
	DeleteUser(id user.ID) error

	GetUser(id user.ID) (*user.User, error)
	GetAllUsers() ([]*user.User, error)
}

type service struct {
	userRepo user.Repository
}

func NewService(userRepo user.Repository) Service {
	return &service{
		userRepo: userRepo,
	}
}

func (s *service) CreateUser(id user.ID, name string, email string, password string) (*user.User, error) {
	_, err := s.userRepo.Find(id)
	if err == nil {
		return nil, internalErrors.NewInvalidArgumentsError("user with id already exists")
	}

	if !errors.Is(err, internalErrors.ErrNotFound) {
		return nil, err
	}

	newUser, err := user.NewUser(id, name, email)
	if err != nil {
		return nil, err
	}

	if password != "" {
		err := newUser.SetPassword(password)
		if err != nil {
			return nil, err
		}
	}

	err = s.userRepo.Store(&newUser)
	if err != nil {
		return nil, err
	}

	return &newUser, nil
}

func (s *service) UpdateUser(id user.ID, input user.UpdateUserInput) (*user.User, error) {
	u, err := s.userRepo.Find(id)
	if err != nil {
		return nil, err
	}

	if u == nil {
		return nil, internalErrors.NewInvalidArgumentsError("user not found")
	}

	u.Update(input)
	err = s.userRepo.Store(u)
	if err != nil {
		return nil, err
	}

	return u, nil
}

func (s *service) DeleteUser(id user.ID) error {
	u, err := s.userRepo.Find(id)
	if err != nil {
		return err
	}

	if u == nil {
		return internalErrors.NewInvalidArgumentsError("user not found")
	}

	//TODO implement me
	panic("implement me")
}

func (s *service) GetUser(id user.ID) (*user.User, error) {
	u, err := s.userRepo.Find(id)
	if err != nil {
		return nil, err
	}

	return u, nil
}

func (s *service) GetAllUsers() ([]*user.User, error) {
	return s.userRepo.FindAll()
}

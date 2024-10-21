package identity

import (
	"errors"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/ed25519"

	internalErrors "github.com/Team6083/OverHours/internal/errors"
	"github.com/Team6083/OverHours/pkgs/identity/internal/user"
)

type Service interface {
	CreateUser(id user.ID, name string, email string, password string) (*user.User, error)
	UpdateUser(id user.ID, input user.UpdateUserInput) (*user.User, error)
	DeleteUser(id user.ID) error

	GetUser(id user.ID) (*user.User, error)
	GetAllUsers() ([]*user.User, error)

	Login(id user.ID, password string) (token string, err error)
}

type service struct {
	userRepo user.Repository

	tokenSigningKey *ed25519.PrivateKey
}

func (s *service) issueToken(userID string) (token string, err error) {
	claims := jwt.RegisteredClaims{
		Issuer:  "overhours/identity",
		Subject: userID,
	}

	t := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)

	str, err := t.SignedString(s.tokenSigningKey)
	if err != nil {
		return "", err
	}

	return str, nil
}

func NewService(userRepo user.Repository, tokenSigningKey *ed25519.PrivateKey) Service {
	return &service{
		userRepo:        userRepo,
		tokenSigningKey: tokenSigningKey,
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

func (s *service) Login(id user.ID, password string) (string, error) {
	u, err := s.userRepo.Find(id)
	if err != nil {
		return "", err
	}

	loginFailErr := internalErrors.NewUnAuthError("wrong username or password")
	if u == nil {
		return "", loginFailErr
	}

	ok, err := u.ValidatePassword(password)
	if err != nil {
		return "", err
	}

	if !ok {
		return "", loginFailErr
	}

	token, err := s.issueToken(string(u.ID))
	if err != nil {
		return "", err
	}

	return token, nil
}

package identity

import (
	"context"
	"github.com/Team6083/OverHours/internal/kitutil/transport"

	"github.com/go-kit/kit/endpoint"

	"github.com/Team6083/OverHours/pkgs/identity/internal/user"
)

type UserDTO struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func NewUserDTO(u *user.User) UserDTO {
	return UserDTO{
		ID:    string(u.ID),
		Name:  u.Name,
		Email: u.Email,
	}
}

type createUserRequest struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type createUserResponse struct {
	User UserDTO `json:"user"`
}

func makeCreateUserEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(*createUserRequest)

		if len(req.ID) == 0 {
			return nil, transport.NewMissingParam("id is required")
		}

		u, err := s.CreateUser(user.ID(req.ID), req.Name, req.Email, req.Password)
		if err != nil {
			return nil, err
		}

		return createUserResponse{NewUserDTO(u)}, nil
	}
}

type getUserRequest struct {
	ID string `json:"id"`
}

type getUserResponse struct {
	User UserDTO `json:"user"`
}

func makeGetUserEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(*getUserRequest)

		u, err := s.GetUser(user.ID(req.ID))
		if err != nil {
			return nil, err
		}

		return getUserResponse{NewUserDTO(u)}, nil
	}
}

type getAllUsersRequest struct {
}

type getAllUsersResponse struct {
	Users []UserDTO `json:"users"`
}

func makeGetAllUsersEndpoint(s Service) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {

		users, err := s.GetAllUsers()
		if err != nil {
			return nil, err
		}

		userDTOs := make([]UserDTO, len(users))
		for i, u := range users {
			userDTOs[i] = NewUserDTO(u)
		}

		return getAllUsersResponse{userDTOs}, nil
	}
}

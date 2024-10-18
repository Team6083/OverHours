package identity

import "github.com/Team6083/OverHours/pkgs/identity/internal/inmemrepo"

func NewInMemUserRepository() *inmemrepo.InMemUserRepo {
	return inmemrepo.NewUserRepo()
}

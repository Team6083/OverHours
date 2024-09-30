package manager

import "github.com/Team6083/OverHours/pkgs/manager/internal/inmemrepo"

func NewInMemUserRepository() *inmemrepo.InMemUserRepo {
	return inmemrepo.NewUserRepo()
}

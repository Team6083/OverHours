package user

type Repository interface {
	NewId() ID
	Store(user *User) error
	Find(id ID) (*User, error)
	FindAll() ([]*User, error)
}

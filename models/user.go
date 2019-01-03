package models

import (
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
)

type User struct {
	Name            string
	Username        string
	Password        string
	Email           string
	UUID            string
	PermissionLevel int
	FirstYear       int
	GraduationYear  int
	Id              bson.ObjectId `bson:"_id,omitempty"`
}

const (
	PermissionMember = 0
	PermissionLeader = 1
	PermissionAdmin  = 2
	PermissionSuper  = 3
)

func (database *Database) CheckUserExist(studentName string) (bool, error) {
	_, err := database.GetUserByUserName(studentName)
	if err == mgo.ErrNotFound {
		return false, nil
	} else if err != nil {
		return false, err
	}

	return true, nil
}

func (database *Database) GetUserNameMap() (map[string]string, error) {
	names := make(map[string]string)

	users, err := database.GetAllUsers()
	if err != nil {
		return nil, err
	}

	for _, user := range users {
		names[user.Username] = user.Name
	}

	return names, nil
}

func (user *User) CheckPermissionLevel(level int) bool {
	if user.PermissionLevel >= level {
		return true
	} else {
		return false
	}
}

func (database *Database) GetAllUsers() ([]User, error) {
	var users []User
	err := database.DB.C("users").Find(bson.M{}).All(&users)
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (database *Database) GetUserByUserName(name string) (*User, error) {
	user := User{}
	err := database.DB.C("users").Find(bson.M{"username": name}).One(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (database *Database) GetUserByUID(uid string) (*User, error) {
	user := User{}
	err := database.DB.C("users").Find(bson.M{"uuid": uid}).One(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (database *Database) SaveUser(user User) (*mgo.ChangeInfo, error) {
	change, err := database.DB.C("users").UpsertId(user.Id, user)
	if err != nil {
		return nil, err
	}
	return change, nil
}

func (database *Database) DeleteUser(user User) error {
	err := database.DB.C("users").RemoveId(user.Id)
	if err != nil {
		return err
	}
	return nil
}

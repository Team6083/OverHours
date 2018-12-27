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
	UID             string
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
	err := database.DB.C("users").Find(bson.M{"uid": uid}).One(&user)
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

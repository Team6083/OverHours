package models

import (
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

func (database *Database) GetAllUsers() ([]User, error) {
	var users []User
	err := database.DB.C("users").Find(bson.M{}).All(&users)
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (database *Database) GetUserByName(name string) (*User, error) {
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

func (database *Database) SaveUser(user User) error {
	_, err := database.DB.C("users").UpsertId(user.Id, user)
	if err != nil {
		return err
	}
	return nil
}

func (database *Database) DeleteUser(user User) error {
	err := database.DB.C("users").RemoveId(user.Id)
	if err != nil {
		return err
	}
	return nil
}

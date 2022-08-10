package models

import (
	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
)

type User struct {
	DisplayName string        `json:"displayName"`
	Email       string        `json:"email"`
	IsSiteAdmin bool          `json:"isSiteAdmin"`
	Id          bson.ObjectId `bson:"_id,omitempty" json:"id"`
}

func (user *User) GetIdentify() string {
	return user.Id.String()
}

func (database *Database) CheckUserExist(userId string) (bool, error) {
	_, err := database.GetUserByID(userId)
	if err == mgo.ErrNotFound {
		return false, nil
	} else if err != nil {
		return false, err
	}

	return true, nil
}

func (database *Database) GetAllUsers() ([]User, error) {
	var users []User
	err := database.DB.C("users").Find(bson.M{}).All(&users)
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (database *Database) GetUserByEmail(email string) (*User, error) {
	user := User{}
	err := database.DB.C("users").Find(bson.M{"email": email}).One(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (database *Database) GetUserByUUID(name string) (*User, error) {
	// TODO: implement this
	return nil, nil
}

func (database *Database) GetUserByID(id string) (*User, error) {
	user := User{}
	err := database.DB.C("users").FindId(bson.ObjectIdHex(id)).One(&user)
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

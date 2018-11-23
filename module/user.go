package module

import "gopkg.in/mgo.v2/bson"

type User struct {
	Name     string
	Username string
	Password string
	Email    string
	UID      string
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

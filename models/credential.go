package models

import (
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
)

type Credential struct {
	uuid     string        `json:"uuid"`
	password string        `json:"password"`
	salt     string        `json:"salt"`
	userId   bson.ObjectId `json:"userId"`
	Id       bson.ObjectId `bson:"_id,omitempty" json:"Id"`
}

func (database *Database) GetCredentialById(id string) (*Credential, error) {
	credential := Credential{}
	err := database.DB.C("credentials").FindId(bson.ObjectIdHex(id)).One(&credential)
	if err != nil {
		return nil, err
	}
	return &credential, nil
}

func (database *Database) GetCredentialByUserId(userId string) (*Credential, error) {
	credential := Credential{}
	err := database.DB.C("credentials").Find(bson.M{"userId": bson.ObjectIdHex(userId)}).One(&credential)
	if err != nil {
		return nil, err
	}
	return &credential, nil
}

func (database *Database) GetCredentialByUUID(uuid string) (*Credential, error) {
	credential := Credential{}
	err := database.DB.C("credentials").Find(bson.M{"uuid": uuid}).One(&credential)
	if err != nil {
		return nil, err
	}
	return &credential, nil
}

func (database *Database) SaveCredential(cred Credential) (*mgo.ChangeInfo, error) {
	change, err := database.DB.C("credentials").UpsertId(cred.Id, cred)
	if err != nil {
		return nil, err
	}
	return change, nil
}

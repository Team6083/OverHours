package models

import (
	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
	"golang.org/x/crypto/bcrypt"
)

type Credential struct {
	Uuid     string        `json:"uuid"`
	Password string        `json:"password"`
	UserId   bson.ObjectId `json:"userId"`
	Id       bson.ObjectId `bson:"_id,omitempty" json:"Id"`
}

func (database *Database) GetCredentialById(id bson.ObjectId) (*Credential, error) {
	credential := Credential{}
	err := database.DB.C("credentials").FindId(id).One(&credential)
	if err != nil {
		return nil, err
	}
	return &credential, nil
}

func CreateCredential(userId bson.ObjectId, password string) (*Credential, error) {

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	cred := Credential{
		Id:       bson.NewObjectId(),
		UserId:   userId,
		Password: string(hashed),
	}

	return &cred, nil
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

package models

import "github.com/globalsign/mgo/bson"

type Season struct {
	Name   string
	TeamId bson.ObjectId
	Id     bson.ObjectId `bson:"_id,omitempty" json:"id"`
}

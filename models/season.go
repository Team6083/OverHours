package models

import (
	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
)

type Season struct {
	Name      string        `json:"name"`
	TeamId    bson.ObjectId `json:"teamId"`
	Id        bson.ObjectId `bson:"_id,omitempty" json:"id"`
	StartTime int64         `json:"startTime"`
	EndTime   int64         `json:"endTime"`
}

func (database *Database) GetSeasonsByTeamId(teamId string) ([]Season, error) {
	var seasons []Season
	err := database.DB.C("seasons").Find(bson.M{"teamId": teamId}).All(&seasons)
	if err != nil {
		return nil, err
	}
	return seasons, nil
}

func (database *Database) GetSeasonById(seasonId string) (*Season, error) {
	var season Season
	err := database.DB.C("seasons").FindId(bson.ObjectIdHex(seasonId)).One(&season)
	if err != nil {
		return nil, err
	}
	return &season, nil
}

func (database *Database) SaveSeason(season *Season) (*mgo.ChangeInfo, error) {
	change, err := database.DB.C("seasons").UpsertId(season.Id, season)
	if err != nil {
		return nil, err
	}
	return change, nil
}

func (database *Database) DeleteSeason(season Season) error {
	err := database.DB.C("seasons").RemoveId(season.Id)
	if err != nil {
		return err
	}
	return nil
}

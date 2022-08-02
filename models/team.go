package models

import (
	"github.com/globalsign/mgo"
	"github.com/globalsign/mgo/bson"
)

type Team struct {
	Name         string `json:"name"`
	IsActive     bool   `json:"isActive"`
	TeamMember   []TeamMemberInfo
	TeamSetting  TeamSetting
	ParentTeamId string        `json:"parentTeamId"`
	Id           bson.ObjectId `bson:"_id,omitempty" json:"id"`
}

const (
	TeamPermissionAdmin  = 3
	TeamPermissionLeader = 2
	TeamPermissionMember = 1
)

type TeamMemberInfo struct {
	UserId          bson.ObjectId `json:"userId"`
	TeamId          bson.ObjectId `json:"teamId"`
	PermissionLevel int           `json:"permissionLevel"`
	Category        string        `json:"category"`
	FirstYear       int           `json:"firstYear"`
	GraduationYear  int           `json:"graduationYear"`
}

type TeamSetting struct {
	SeasonId bson.ObjectId
	LastOut  int
	TimeZone string
}

func (database *Database) GetAllTeams() ([]Team, error) {
	var teams []Team
	err := database.DB.C("teams").Find(bson.M{}).All(&teams)

	if err != nil {
		return nil, err
	}

	return teams, nil
}

func (database *Database) GetTeamsByUserId(userId string) ([]Team, error) {
	var teams []Team
	err := database.DB.C("teams").Find(bson.M{"teamMember.userId": bson.ObjectIdHex(userId)}).All(&teams)

	if err != nil {
		return nil, err
	}

	return teams, nil
}

func (database *Database) GetTeamById(id string) (*Team, error) {
	team := Team{}
	err := database.DB.C("teams").FindId(bson.ObjectIdHex(id)).One(&team)
	if err != nil {
		return nil, err
	}

	return &team, nil
}

func (t *Team) AddUserToTeam(user *User) {
	teamMemberInfo := TeamMemberInfo{
		UserId:          user.Id,
		TeamId:          t.Id,
		PermissionLevel: TeamPermissionMember,
	}

	t.TeamMember = append(t.TeamMember, teamMemberInfo)
}

func (database *Database) SaveTeam(team Team) (*mgo.ChangeInfo, error) {
	change, err := database.DB.C("teams").UpsertId(team.Id, team)

	if err != nil {
		return nil, err
	}

	return change, nil
}

func (database *Database) DeleteTeam(team Team) error {
	err := database.DB.C("teams").RemoveId(team.Id)
	return err
}

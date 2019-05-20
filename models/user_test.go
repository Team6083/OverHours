package models

import (
	"github.com/stretchr/testify/assert"
	"gopkg.in/mgo.v2/bson"
	"testing"
)

func TestUser(t *testing.T) {
	database := SetupTestDb(t)

	user := User{"TestUser", "testuser", "password", "user@user.team6083", "testUID", 0, 2019, 2019, false, bson.NewObjectId()}

	_, err := database.SaveUser(user)
	if err != nil {
		panic(err)
	}

	user1, err := database.GetUserByUUID(user.UUID)
	if err != nil {
		panic(err)
	}

	assert.NotNil(t, user1)
	assert.Equal(t, user.Username, user1.Username)
	assert.Equal(t, user.Password, user1.Password)
	assert.Equal(t, user.Name, user1.Name)
	assert.Equal(t, user.Email, user1.Email)
	assert.Equal(t, user.FirstYear, user1.FirstYear)
	assert.Equal(t, user.GraduationYear, user1.GraduationYear)
	assert.Equal(t, user.PermissionLevel, user1.PermissionLevel)

	err = database.DeleteUser(*user1)
	if err != nil {
		panic(err)
	}
}

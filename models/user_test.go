package models

import (
	"github.com/globalsign/mgo/bson"
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestUser(t *testing.T) {
	database := SetupTestDb(t)

	user := User{"TestUser", "testuser", "user@user.team6083", 0, 2019, 2019, false, "category" +
		"", bson.NewObjectId()}

	_, err := database.SaveUser(user)
	if err != nil {
		panic(err)
	}

	user1, err := database.GetUserByID(user.Id.Hex())
	if err != nil {
		panic(err)
	}

	assert.NotNil(t, user1)
	assert.Equal(t, user.Username, user1.Username)
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

package models

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func SetupTestDb(t *testing.T) *Database {
	database, err := OpenDataBase("localhost", "", "", "OverHoursTest")
	if err != nil {
		panic(err)
	}
	assert.Nil(t, err)
	return database
}

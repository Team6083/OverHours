package web

import (
	"github.com/gin-gonic/gin"
	"math/rand"
	"time"
)

// Random string util

const charset = "abcdefghijklmnopqrstuvwxyz" +
	"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

var seededRand = rand.New(
	rand.NewSource(time.Now().UnixNano()))

func stringWithCharset(length int, charset string) string {
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(b)
}

func RandomString(length int) string {
	return stringWithCharset(length, charset)
}

// AuthMiddleware function, which will be called for each request
func (web *Web) AuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		//TODO: add auth middleware

		ctx.Next()
	}
}

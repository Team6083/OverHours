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
		//tokenString := ctx.GetHeader("token")
		//
		//token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		//	// Don't forget to validate the alg is what you expect:
		//	if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
		//		return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		//	}
		//
		//	return web.hmac, nil
		//})
		//
		//if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		//	// TODO: get login token
		//	fmt.Print(claims["jti"])
		//} else {
		//	handleWebErr(ctx, err)
		//	return
		//}

		ctx.Next()
	}
}

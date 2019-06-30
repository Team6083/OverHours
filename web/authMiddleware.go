package web

import (
	"fmt"
	"math/rand"
	"net/http"
	"strings"
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
func (web *Web) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		pages := web.GetPageInfos()
		url := strings.Split(r.RequestURI, "?")[0]

		for _, pageInfo := range pages {
			if pageInfo.path == url {
				fmt.Println(pageInfo)
				session, err := web.pageAccessManage(w, r, pageInfo.pageLevel, pageInfo.autoRedirect)
				if err != nil {
					handleWebErr(w, err)
					return
				}

				if session == nil && pageInfo.pageLevel != PageOpen {
					http.Error(w, "Forbidden", http.StatusForbidden)
					return
				}

				next.ServeHTTP(w, r)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

package web

import (
	"fmt"
	"github.com/Team6083/OverHours/models"
	"github.com/getsentry/sentry-go"
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

		session, err := web.checkAuth(w, r)
		if err != nil && !(err == AuthWrongSession || err == AuthSessionNotProvided) {
			handleWebErr(w, err)
			return
		}

		for _, pageInfo := range pages {
			if pageInfo.path == url {
				fmt.Println(pageInfo)

				if pageInfo.pageLevel == PageOpen {
					next.ServeHTTP(w, r)
					return
				}

				if err == AuthWrongSession || err == AuthSessionNotProvided || session == nil {
					if pageInfo.autoRedirect {
						web.redirectToLoginPage(w, r)
						return
					}
				}

				err = web.renewSession(w, session)
				if err != nil {
					handleWebErr(w, err)
				}

				user, err := web.database.GetUserByUserName(session.Username)
				if err != nil {
					handleWebErr(w, err)
					return
				}

				sentry.ConfigureScope(func(scope *sentry.Scope) {
					scope.SetUser(sentry.User{Email: user.Email, Username: user.Username, ID: user.UUID})
				})

				if user.PasswordNeedChange && !strings.Contains(r.URL.Path, "/users/form") {
					http.Redirect(w, r, fmt.Sprintf("/users/form?edit=%s", user.GetIdentify()), http.StatusFound)
					return
				}

				var targetLevel int
				if pageInfo.pageLevel == PageLeader {
					sentry.CaptureMessage(fmt.Sprintf("User access leader level page"))
					targetLevel = models.PermissionLeader
				}

				if !user.CheckPermissionLevel(targetLevel) {
					if pageInfo.autoRedirect {
						web.handle401(w, r)
						return
					}
					handleWebErr(w, AuthNoPermission)
					return
				}

				next.ServeHTTP(w, r)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

package web

import (
	"fmt"
	"github.com/satori/go.uuid"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"net/http"
	"strconv"
	"time"
)

var users = map[string]string{
	"user1": "password1",
	"user2": "password2",
}

type LoginSession struct {
	Username     string
	SessionToken string
}

const (
	AuthPass             = 0
	AuthErr              = 1
	AuthNoSessionProvide = 2
	AuthUnAuth           = 3
)

// Check auth status
func (web *Web) checkAuth(w http.ResponseWriter, r *http.Request) (int, error) {

	sessionToken, err := getSessionToken(r)
	if err != nil {
		return AuthErr, err
	}
	if sessionToken == nil {
		return AuthNoSessionProvide, nil
	}

	result := LoginSession{}
	err = web.database.DB.C("session").Find(bson.M{"sessiontoken": sessionToken}).One(&result)

	if err != nil {
		if err == mgo.ErrNotFound {
			return AuthUnAuth, nil
		}
		return AuthErr, err
	}

	return AuthPass, nil
}

// Get Session Token from Cookie
func getSessionToken(r *http.Request) (*string, error) {
	c, err := r.Cookie("session_token")
	if err != nil {
		if err == http.ErrNoCookie {
			return nil, nil
		}
		return nil, err
	}
	sessionToken := c.Value
	return &sessionToken, nil
}

const (
	PageOpen  = 0
	PageLogin = 1
	PageAdmin = 2
)

// Manage page access with different level
func (web *Web) pageAccessManage(w http.ResponseWriter, r *http.Request, level int, useDefault bool) {
	if level == PageOpen {
		w.WriteHeader(http.StatusOK)
		return
	}

	authStatus, err := web.checkAuth(w, r)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if authStatus == AuthNoSessionProvide || authStatus == AuthUnAuth {
		if useDefault {
			http.Redirect(w, r, "/login?status=1&redirect="+r.RequestURI, http.StatusSeeOther)
		} else {
			w.WriteHeader(http.StatusUnauthorized)
		}
		return
	}

}

// Handle login page
func (web *Web) LoginHandler(w http.ResponseWriter, r *http.Request) {

	data := struct {
		Status int
	}{0}
	status, ok := r.URL.Query()["status"]
	if ok && len(status[0]) >= 1 {
		data.Status, _ = strconv.Atoi(status[0])
	}

	template, err := web.parseFiles("templates/login.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	err = template.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

// Handle login POST request
func (web *Web) LoginPOST(w http.ResponseWriter, r *http.Request) {

	cred := struct {
		Password string
		Username string
	}{}

	r.ParseForm()
	if r.Form["loginUsername"] == nil || r.Form["loginPassword"] == nil {
		http.Redirect(w, r, "/login?status=2", 303)
		return
	}

	cred.Username = r.Form["loginUsername"][0]
	cred.Password = r.Form["loginPassword"][0]

	user, err := web.database.GetUserByName(cred.Username)

	var expectedPassword string
	ok := false
	if err != nil && err != mgo.ErrNotFound {
		handleWebErr(w, err)
		return
	}

	if err == nil {
		expectedPassword = user.Password
		ok = true
	}

	if !ok || expectedPassword != cred.Password {
		http.Redirect(w, r, "/login?status=2", 303)
		return
	}

	// Create a new random session token
	v4UUID, err := uuid.NewV4()
	if err != nil {
		fmt.Printf("Something went wrong: %s", err)
		return
	}
	sessionToken := v4UUID.String()

	// Finally, we set the client cookie for "session_token" as the session token we just generated
	// we also set an expiry time of 120 seconds, the same as the cache
	http.SetCookie(w, &http.Cookie{
		Name:    "session_token",
		Value:   sessionToken,
		Expires: time.Now().Add(120 * time.Second),
	})

	web.database.DB.C("session").Insert(LoginSession{cred.Username, sessionToken})

	http.Redirect(w, r, "/", 303)
}
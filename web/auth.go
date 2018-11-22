package web

import (
	"fmt"
	"github.com/satori/go.uuid"
	"gopkg.in/mgo.v2/bson"
	"net/http"
	"time"
)

type Credentials struct {
	Password string `json:"password"`
	Username string `json:"username"`
}

var users = map[string]string{
	"user1": "password1",
	"user2": "password2",
}

type LoginSession struct {
	Username     string
	SessionToken string
}

func (web *Web) LoginPOST(w http.ResponseWriter, r *http.Request) {
	cred := Credentials{}

	r.ParseForm()
	if r.Form["username"] == nil || r.Form["password"] == nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	cred.Password = r.Form["password"][0]
	cred.Username = r.Form["username"][0]

	// Get the expected password from our in memory map
	expectedPassword, ok := users[cred.Username]

	// If a password exists for the given user
	// AND, if it is the same as the password we received, the we can move ahead
	// if NOT, then we return an "Unauthorized" status
	if !ok || expectedPassword != cred.Password {
		w.WriteHeader(http.StatusUnauthorized)
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

func (web *Web) checkAuth(w http.ResponseWriter, r *http.Request) (*string, error) {
	c, err := r.Cookie("session_token")
	if err != nil {
		if err == http.ErrNoCookie {
			w.WriteHeader(http.StatusUnauthorized)
			return nil, nil
		}

		w.WriteHeader(http.StatusBadRequest)
		return nil, err
	}
	sessionToken := c.Value

	result := LoginSession{}
	err = web.database.DB.C("session").Find(bson.M{"sessiontoken": sessionToken}).One(&result)

	if err != nil {
		//if err == mgo.ErrNotFound{
		//	w.WriteHeader(http.StatusUnauthorized)
		//	return nil, nil
		//}
		w.WriteHeader(http.StatusInternalServerError)
		return nil, err
	}

	return &sessionToken, nil
}

func (web *Web) LoginHandler(w http.ResponseWriter, r *http.Request) {

	template, err := web.parseFiles("templates/login.html", "templates/base.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}
	data := struct {
		Response string
	}{"test"}
	err = template.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

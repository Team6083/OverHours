package web

import (
	"errors"
	"github.com/satori/go.uuid"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"net/http"
	"time"
)

const sessionTimeout = 20 * time.Minute

type LoginSession struct {
	Username     string
	SessionToken string
	Validate     int64
}

// Define error
var (
	AuthSessionNotProvided = errors.New("no session provided")
	AuthWrongSession       = errors.New("wrong session")
	AuthNoPermission       = errors.New("no permission")
	AuthTimeExpired        = errors.New("valid time expired")
)

// DB
func (web *Web) getSession(sessionToken string) (*LoginSession, error) {
	result := LoginSession{}
	err := web.database.DB.C("session").Find(bson.M{"sessiontoken": sessionToken}).One(&result)

	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (web *Web) storeSession(session *LoginSession) (*mgo.ChangeInfo, error) {
	diff, err := web.database.DB.C("session").Upsert(bson.M{"username": session.Username}, session)
	if err != nil {
		return nil, err
	}

	return diff, nil
}

func (web *Web) DeleteSession(session *LoginSession) error {
	err := web.database.DB.C("session").Remove(bson.M{"username": session.Username})
	return err
}

func (web *Web) checkAuth(w http.ResponseWriter, r *http.Request) (*LoginSession, error) {
	sessionToken := new(string)
	if sessionToken == nil {
		return nil, AuthSessionNotProvided
	}

	result, err := web.getSession(*sessionToken)
	if err != nil {
		if err == mgo.ErrNotFound {
			return nil, AuthWrongSession
		}
		return nil, err
	}

	if result.Validate < time.Now().Unix() && result.Validate != 0 {
		return nil, AuthTimeExpired
	}

	return result, nil
}

// Handle login POST request
//func (web *Web) LoginPOST(w http.ResponseWriter, r *http.Request) {
//
//	cred := struct {
//		Password string
//		Username string
//	}{}
//
//	err := r.ParseForm()
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//	if r.Form["loginUsername"] == nil || r.Form["loginPassword"] == nil {
//		http.Redirect(w, r, "/login?status=2", http.StatusSeeOther)
//		return
//	}
//
//	rememberMe := false
//
//	if r.Form["rememberMe"] != nil && r.Form["rememberMe"][0] == "on" {
//		rememberMe = true
//	}
//
//	cred.Username = r.Form["loginUsername"][0]
//	cred.Password = r.Form["loginPassword"][0]
//
//	user, err := web.database.GetUserByUserName(cred.Username)
//
//	var expectedPassword string
//	ok := false
//	if err != nil && err != mgo.ErrNotFound {
//		handleWebErr(w, err)
//		return
//	}
//
//	if err == nil {
//		expectedPassword = user.Password
//		ok = true
//	}
//
//	if !ok || expectedPassword != cred.Password {
//		http.Redirect(w, r, "/login?status=2", 303)
//		return
//	}
//
//	loginSession := newLoginSession(cred.Username)
//
//	if rememberMe {
//		loginSession.Validate = 0
//	}
//
//	//setSessionTokenCookie(w, *loginSession)
//
//	_, err = web.storeSession(loginSession)
//	if err != nil {
//		handleWebErr(w, err)
//		return
//	}
//
//	if user.PasswordNeedChange && false {
//		//TODO add change psw
//		http.Redirect(w, r, "/", 303)
//	} else if r.Form["redirect"] != nil {
//		http.Redirect(w, r, r.Form["redirect"][0], 303)
//	} else {
//		http.Redirect(w, r, "/", 303)
//	}
//}

func newLoginSession(username string) *LoginSession {
	session := new(LoginSession)

	session.Username = username
	session.SessionToken = newSessionToken()
	session.Validate = time.Now().Add(sessionTimeout).Unix()

	return session
}

func (session *LoginSession) renew(onlyTime bool) {
	if !onlyTime {
		session.SessionToken = newSessionToken()
	}

	if session.Validate != 0 {
		session.Validate = time.Now().Add(sessionTimeout).Unix()
	}
}

func newSessionToken() string {
	// Create a new random session token
	v4UUID := uuid.NewV4()
	sessionToken := v4UUID.String()
	return sessionToken
}

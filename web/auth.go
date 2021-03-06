package web

import (
	"errors"
	"github.com/satori/go.uuid"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"net/http"
	"strconv"
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

// Cookie
func getSessionTokenCookie(r *http.Request) (*string, error) {
	c, err := r.Cookie("session_jwt")
	if err != nil {
		if err == http.ErrNoCookie {
			return nil, nil
		}
		return nil, err
	}
	sessionToken := c.Value
	return &sessionToken, nil
}

func setSessionTokenCookie(w http.ResponseWriter, session LoginSession) {

	expTime := time.Unix(session.Validate, 0)

	sessionCookie := http.Cookie{
		Name:     "session_jwt",
		Value:    session.SessionToken,
		Path:     "/",
		HttpOnly: true,
	}

	usernameCookie := http.Cookie{
		Name:  "userName",
		Value: session.Username,
		Path:  "/",
	}

	if session.Validate == 0 {
		expTime = time.Now().Add(168 * time.Hour)
	}

	sessionCookie.Expires = expTime
	usernameCookie.Expires = expTime

	http.SetCookie(w, &sessionCookie)

	http.SetCookie(w, &usernameCookie)
}

func resetSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session_jwt",
		Value:    "",
		Path:     "/",
		Expires:  time.Now(),
		HttpOnly: true,
	})

	http.SetCookie(w, &http.Cookie{
		Name:    "userName",
		Value:   "",
		Path:    "/",
		Expires: time.Now(),
	})
}

// Handle pages

const (
	PageOpen   = 0
	PageLogin  = 1
	PageLeader = 2
)

func (web *Web) checkAuth(w http.ResponseWriter, r *http.Request) (*LoginSession, error) {
	sessionToken, err := getSessionTokenCookie(r)
	if err != nil {
		return nil, err
	}
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

func (web *Web) redirectToLoginPage(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/login?status=1&redirect="+r.RequestURI, http.StatusSeeOther)
}

func (web *Web) handle401(w http.ResponseWriter, r *http.Request) {
	webTemplate, err := web.parseFiles("templates/errorBase.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	data := struct {
		Title   string
		ErrCode string
		ErrMsg  string
	}{"Unauthorized", "401", "Access to this resource is denied."}

	err = webTemplate.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

func (web *Web) handle403(w http.ResponseWriter, r *http.Request) {
	webTemplate, err := web.parseFiles("templates/errorBase.html")
	if err != nil {
		handleWebErr(w, err)
		return
	}

	data := struct {
		Title   string
		ErrCode string
		ErrMsg  string
	}{"Forbidden", "403", "You doesn't have the access to this resource."}

	err = webTemplate.ExecuteTemplate(w, "base", data)
	if err != nil {
		handleWebErr(w, err)
		return
	}
}

func (web *Web) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	sessionToken, err := getSessionTokenCookie(r)
	if err != nil {
		handleWebErr(w, err)
		return
	}
	if sessionToken == nil {
		handleBadRequest(w, AuthSessionNotProvided)
		return
	}

	session, err := web.getSession(*sessionToken)
	if err != nil {
		if err != mgo.ErrNotFound {
			handleWebErr(w, err)
			return
		}
	}

	if session != nil {
		err = web.DeleteSession(session)
		if err != nil {
			handleWebErr(w, err)
			return
		}
	}

	resetSessionCookie(w)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// Handle login page
func (web *Web) LoginHandler(w http.ResponseWriter, r *http.Request) {
	names, err := web.database.GetUserNameMap()
	if err != nil {
		handleWebErr(w, err)
		return
	}

	data := struct {
		Status    int
		Redirect  string
		UserNames map[string]string
	}{0, "", names}
	status, ok := r.URL.Query()["status"]
	if ok && len(status[0]) >= 1 {
		data.Status, _ = strconv.Atoi(status[0])
	}

	redirect, ok := r.URL.Query()["redirect"]
	if ok && len(redirect[0]) >= 1 {
		data.Redirect = redirect[0]
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

	err := r.ParseForm()
	if err != nil {
		handleWebErr(w, err)
		return
	}
	if r.Form["loginUsername"] == nil || r.Form["loginPassword"] == nil {
		http.Redirect(w, r, "/login?status=2", http.StatusSeeOther)
		return
	}

	rememberMe := false

	if r.Form["rememberMe"] != nil && r.Form["rememberMe"][0] == "on" {
		rememberMe = true
	}

	cred.Username = r.Form["loginUsername"][0]
	cred.Password = r.Form["loginPassword"][0]

	user, err := web.database.GetUserByUserName(cred.Username)

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

	loginSession := newLoginSession(cred.Username)

	if rememberMe {
		loginSession.Validate = 0
	}

	setSessionTokenCookie(w, *loginSession)

	_, err = web.storeSession(loginSession)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if user.PasswordNeedChange && false {
		//TODO add change psw
		http.Redirect(w, r, "/", 303)
	} else if r.Form["redirect"] != nil {
		http.Redirect(w, r, r.Form["redirect"][0], 303)
	} else {
		http.Redirect(w, r, "/", 303)
	}
}

func (web *Web) renewSession(w http.ResponseWriter, session *LoginSession) error {
	session.renew(true)
	resetSessionCookie(w)
	_, err := web.storeSession(session)
	setSessionTokenCookie(w, *session)
	return err
}

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

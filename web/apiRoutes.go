package web

import (
	"net/http"
)

type Route struct {
	Name        string
	Method      string
	Pattern     string
	HandlerFunc http.HandlerFunc
}

type Routes []Route

func (web *Web) GetAPIRoutes() Routes {
	var apiRoutes = Routes{
		Route{
			"UsersIndex",
			"GET",
			"/users",
			web.APIGetUsers,
		},
		Route{
			"SingleUser",
			"GET",
			"/users/{id}",
			web.APIGetUser,
		},
		Route{
			"TimeLogsIndex",
			"GET",
			"/timeLogs",
			web.APIGetTimeLogs,
		},
		Route{
			"TimeLogNew",
			"POST",
			"/timeLogs",
			web.APIPostTimeLog,
		},
		Route{
			"TimeLogsGet",
			"GET",
			"/timeLogs/{id}",
			web.APIGetTimeLog,
		},
		Route{
			"TimeLogsUpdate",
			"PUT",
			"/timeLogs/{id}",
			web.APIPutTimeLog,
		},
		Route{
			"TimeLogCheckin",
			"GET",
			"/timeLog/checkin",
			web.APICheckin,
		},
		Route{
			"TimeLogCheckout",
			"GET",
			"/timeLog/checkout",
			web.APICheckout,
		},
	}

	return apiRoutes
}

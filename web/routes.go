package web

func (web *Web) GetPageInfos() []PageInfo {
	pages := make([]PageInfo, 1)
	pages[0] = PageInfo{"/", web.IndexHandler, "GET", PageLogin, true}

	// Setting
	pages = append(pages, PageInfo{"/settings", web.SettingsGET, "GET", PageLeader, true})
	pages = append(pages, PageInfo{"/settings/submit", web.SettingsPOST, "POST", PageLeader, true})
	pages = append(pages, PageInfo{"/settings/renew", web.RenewSettingsGET, "GET", PageLeader, true})
	//Time Logs
	pages = append(pages, PageInfo{"/timeLog", web.TimeLogGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/timeLog/datatable", web.TimeLogDatatable, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/timeLog/form", web.TimeLogFormGET, "GET", PageLeader, true})
	pages = append(pages, PageInfo{"/timeLog/form/submit", web.TimeLogFormPOST, "POST", PageLeader, true})
	pages = append(pages, PageInfo{"/timeLog/checkinPost", web.TimeLogCheckinPOST, "POST", PageLogin, true})
	pages = append(pages, PageInfo{"/timeLog/checkout", web.TimeLogCheckoutGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/timeLog/delete/{id}", web.TimeLogDelete, "GET", PageLeader, true})
	pages = append(pages, PageInfo{"/timeLog/rfid", web.TimeLogRFIDPOST, "POST", PageOpen, true})
	pages = append(pages, PageInfo{"/timeLog/rfidreg", web.TimeLogRFIDREGPOST, "POST", PageOpen, true})
	pages = append(pages, PageInfo{"/timeLog/seasons", web.TimeLogGetAllSeasonsGET, "GET", PageLogin, false})
	//Meetings
	pages = append(pages, PageInfo{"/meeting", web.MeetingGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/meeting/detail/{meetId}", web.MeetingDetailGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/meeting/checkin/{meetId}", web.MeetingCheckinGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/meeting/checkin/{meetId}/{userId}", web.MeetingCheckinGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/meeting/participant/leave/{meetId}/{userId}", web.MeetingParticipantLeaveGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/meeting/participant/leave/batch/{meetId}", web.MeetingParticipantLeaveBatchPOST, "POST", PageLeader, true})
	pages = append(pages, PageInfo{"/meeting/participant/deleteLog/{meetId}/{userId}", web.MeetingParticipantDeleteLogGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/meeting/participant/delete/{meetId}/{userId}", web.MeetingParticipantDeleteGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/meeting/form", web.MeetingFormGET, "GET", PageLeader, true})
	pages = append(pages, PageInfo{"/meeting/form/submit", web.MeetingFormPOST, "POST", PageLeader, true})
	pages = append(pages, PageInfo{"/meeting/delete/{id}", web.MeetingDeleteGET, "GET", PageLeader, true})
	pages = append(pages, PageInfo{"/meeting/modify/{meetId}/openCheckin", web.MeetingModifyOpenCheckinGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/meeting/modify/{meetId}/removeAllLog", web.MeetingModifyRmAllLogGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/meeting/modify/{meetId}/finish", web.MeetingModifyFinishGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/meeting/util/getMeeting/{meetId}", web.MeetingUtilGetMeetingGET, "GET", PageLogin, true})
	// Users
	pages = append(pages, PageInfo{"/users", web.UsersGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/users/form", web.UsersFormGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/users/form/password", web.UserChangePasswordGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/users/form/password/submit", web.UserChangePasswordPOST, "POST", PageLogin, true})
	pages = append(pages, PageInfo{"/users/form/submit", web.UsersFormPOST, "POST", PageLogin, true})
	pages = append(pages, PageInfo{"/users/delete/{userName}", web.UsersDeleteGET, "GET", PageLeader, true})
	// Boards
	pages = append(pages, PageInfo{"/board/ranking", web.leaderboardGET, "GET", PageLogin, true})
	pages = append(pages, PageInfo{"/board/chart", web.ChartGet, "GET", PageLeader, true})
	pages = append(pages, PageInfo{"/board/chart/data", web.ChartDataGet, "GET", PageOpen, true})

	return pages
}

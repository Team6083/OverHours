package web

import (
	"fmt"
	"net/http"
)

func (web *Web) StudentCheckinPOST(w http.ResponseWriter, r *http.Request) {
	session, err := web.pageAccessManage(w, r, PageLogin, false)
	if err != nil {
		handleWebErr(w, err)
		return
	}

	if session != nil {
		err := r.ParseForm()
		if err != nil {
			handleWebErr(w, err)
			return
		}

		if r.Form["studentName"] == nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		stuName := r.Form["studentName"][0]

		fmt.Printf("%s login\n", stuName)
	} else {
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
	return
}

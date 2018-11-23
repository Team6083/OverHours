package web

import (
	"fmt"
	"net/http"
)

func (web *Web) StudentCheckinPOST(w http.ResponseWriter, r *http.Request) {
	status, err := web.pageAccessManage(w, r, PageLogin, false)

	if err != nil {
		handleWebErr(w, err)
		return
	}

	if status == AccOK {
		r.ParseForm()
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

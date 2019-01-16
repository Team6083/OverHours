function generatePassword() {
    let length = 8,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

function createCookie(name, value, secs) {
    let expires;
    if (secs) {
        const date = new Date();
        date.setTime(date.getTime() + (secs * 1000));
        expires = "; expires=" + date.toGMTString();
    } else {
        expires = "";
    }

    document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name, "", -1);
}

function secondToString(sec) {
    const day = 60 * 60 * 24;
    const hr = 60 * 60;
    const min = 60;

    let out = "";
    if (sec / day >= 1) {
        let calc = Math.floor(sec / day);
        out += calc + "d ";
        sec = sec - calc * day;
    }
    if (sec / hr >= 1) {
        let calc = Math.floor(sec / hr);
        out += calc + "h ";
        sec = sec - calc * hr;
    }
    if (sec / min >= 1) {
        let calc = Math.floor(sec / min);
        out += calc + "m ";
        sec = sec - calc * min;
    }
    out += sec + "s";

    return out;
}

function renderTimeLogsTimeStamp(data, type, checkoutLink) {
    if (type === 'display') {
        let date = new Date(data * 1000);
        if (data === 0) {
            return checkoutLink;
        } else if (data === -1) {
            return "<span class=\"badge badge-danger\">Last checkout time exceed. (Please contact Moderators)</span>";
        }
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } else {
        return data;
    }
}
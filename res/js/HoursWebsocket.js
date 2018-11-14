var HoursWebsocket = function(port, path, events) {
    var that = this;
    var url = "ws://" + window.location.hostname;
    if (port !== "") {
        url += ":" + port;
    }
    url += path;
    // Resolve URL

    // Insert a default error-handling event if a custom one doesn't already exist.
    if (!events.hasOwnProperty("error")) {
        events.error = function(event) {
            // Data is just an error string.
            console.log(event.data);
            alert("Error:"+event.data);
        };
    }

    // Insert an event to allow the server to force-reload the client for any display.
    events.reload = function(event) {
        if (event.data === null) {
            location.reload();
        }
    };

    this.connect = function() {
        this.websocket = $.websocket(url, {
            open: function() {
                console.log("Websocket connected to the server at " + url + ".")
                if(events.onload != null){
                    events.onload();
                }
            },
            close: function() {
                console.log("Websocket lost connection to the server. Reconnecting in 5 seconds...");
                setTimeout(that.connect, 5000);
            },
            notFound: function (event) {
                console.log(event.type, event.data);
            },
            events: events
        });
    };

    this.send = function(type, data) {
        this.websocket.send(type, data);
    };

    this.connect();
};
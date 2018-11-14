package web

import (
	"github.com/gorilla/websocket"
	"net/http"
	"sync"
)

type Websocket struct {
	conn       *websocket.Conn
	writeMutex *sync.Mutex
}

type WebsocketMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

var websocketUpgrader = websocket.Upgrader{ReadBufferSize: 1024, WriteBufferSize: 2014}

// Upgrades the given HTTP request to a websocket connection.
func NewWebsocket(w http.ResponseWriter, r *http.Request) (*Websocket, error) {
	conn, err := websocketUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return nil, err
	}
	return &Websocket{conn, new(sync.Mutex)}, nil
}

func (websocket *Websocket) Close() {
	websocket.conn.Close()
}

func (websocket *Websocket) Read() (string, interface{}, error) {
	var message WebsocketMessage
	err := websocket.conn.ReadJSON(&message)
	return message.Type, message.Data, err
}

func (websocket *Websocket) Write(messageType string, data interface{}) error {
	websocket.writeMutex.Lock()
	defer websocket.writeMutex.Unlock()
	return websocket.conn.WriteJSON(WebsocketMessage{messageType, data})
}

func (websocket *Websocket) WriteError(errorMessage string) error {
	websocket.writeMutex.Lock()
	defer websocket.writeMutex.Unlock()
	return websocket.conn.WriteJSON(WebsocketMessage{"error", errorMessage})
}

func (websocket *Websocket) ShowDialog(message string) error {
	websocket.writeMutex.Lock()
	defer websocket.writeMutex.Unlock()
	return websocket.conn.WriteJSON(WebsocketMessage{"dialog", message})
}
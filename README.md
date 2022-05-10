[![CircleCI](https://circleci.com/gh/Team6083/OverHours.svg?style=shield)](https://circleci.com/gh/Team6083/OverHours)

# OverHours

A simple hour tracking software for CMS Robotics teams.

## How to run this

### Backend

You need a running MongoDB server to run backend of OverHours.

#### Install dependencies
1. Run `go mod download` to download all required modules.
2. Run `go install github.com/swaggo/swag/cmd/swag@v1.7.1` to get `swag`.

#### Running backend
1. Run `swag init` to generate the docs.
2. Use `go run main.go` to start the server.
(Use environment variable `PORT` to select the port)

### Frontend

1. First, use `cd client` to go into `client` directory.
2. Then use `npm install` to install all required dependencies.
3. Run `npm run generate` to generate SDK files for the backend API.
4. Finally, run `npm run dev` to start the frontend APP.

[![CircleCI](https://circleci.com/gh/Team6083/OverHours.svg?style=shield)](https://circleci.com/gh/Team6083/OverHours)

# OverHours

A simple hour tracking software for CMS Robotics teams.

## How to run this

### Backend

First you need a running MongoDB server.

Then run `go mod download` to download all required modules.

And run `go run main.go` to start the server.
(Use environment variable `PORT` to select the port)

### Frontend

1. First, use `cd client` to go into `client` directory.
2. Then use `npm install` to install all required dependencies.
3. Run `npm run generate` to generate SDK files for the backend API.
4. Finally, run `npm run dev` to start the frontend APP.

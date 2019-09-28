# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.4] - 2019-09-29

# Fixed

- Fix slice element removal bug of `GetMeetingsByUserId` and `GetOngoingMeetingsByUserId`

## [1.3.3] - 2019-09-08

### Add

- Autofill seasonId when adding a new meeting
- Add currentCheckin display
- Add MeetingUtilGetMeetingGET

### Fixed

- Fix meeting details participants CheckinTime display error 

### Security

- Improve password safety

## [1.3.2] - 2019-09-06

### Add

- Add search box for meeting participants selector
- Add category for user
- Add support of user category in meeting participants selector

### Fixed

- Wrong meeting finish checker

## [1.3.1] - 2019-08-30

### Add

- Add participants stat at meeting detail

### Changed

- Show first year in Users list
- Sort participants with leave
- Change redirect of meeting checkin in the participants part to the meeting detail page

### Security

- Fix password exposed issue

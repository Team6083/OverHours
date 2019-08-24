import React, { Component } from 'react'

export class Home extends Component {


    render() {
        return (
            <div className="container">
                <div className="row">
                    <div className="col">
                        <h2>Team 6083 - OverHours</h2>
                        <h4>
                            Current login: <span className="badge badge-dark">{"KennHuang"}</span> /
                            Season: <span className="badge badge-primary badge-pill">{"Season"}</span>
                        </h4>
                        <form method="post" action="/timeLog/checkinPost">
                            <div className="input-group mb-3 mt-3">
                                <input type="text" className="form-control" id="usernameInput" name="studentId" placeholder="Students's Id" />
                                <div className="input-group-append">
                                    <button className="btn btn-outline-secondary" type="submit" id="stu-submit">
                                        Checkin
                                    </button>

                                    <button className="btn btn-outline-dark dropdown-toggle dropdown-toggle-split" type="button" data-toggle="dropdown">
                                        <span className="sr-only">Select...</span>
                                    </button>
                                    <div className="dropdown-menu" id="usernameDropdown">

                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )
    }
}

export default Home

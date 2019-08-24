import React, { Component } from 'react'
import { NavLink } from 'react-router-dom'
import Links from './Links'
import { Navbar } from 'react-bootstrap'


export class NavBar extends Component {

    state = {
        isOpen: false
    };

    toggleCollapse = () => {
        this.setState({ isOpen: !this.state.isOpen });
    }

    render() {
        return (
            <Navbar bg="light" expand="lg">
                <Navbar.Brand><NavLink to="/" className="text-dark">OverHours</NavLink></Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Links links={this.props.links} />
            </Navbar>
        )
    }
}

export default NavBar
import React from 'react'
import { NavLink } from 'react-router-dom'
import roles from '../../../constant/userRoles'
import permissionCheck from '../../auth/permissionCheck';
import { Navbar, Nav } from 'react-bootstrap'

const Links = (props) => {
    const { links } = props
    const userLogined = true

    const linkList = links.map((route, i) => {
        const { path, name, permission, hideOnNav } = route;
        const renderLink = () => {
            return (
                <Nav.Item key={i}>
                    <NavLink className="nav-link" to={path}>{name}</NavLink>
                </Nav.Item>
            )
        }

        let role = roles.UnAuth;
        if (userLogined) {
            role = roles.Student;
        }

        if (hideOnNav === true) return null;

        if (permission) {
            return permissionCheck(permission, role) ? renderLink() : null;
        } else {
            return renderLink();
        }
    })

    const getName = () => {
        // if (profile.name !== "" && profile.name !== null && profile.name !== undefined) return profile.name;
        // else return auth.uid;
        return "NULL"
    }

    return (
        <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="mr-auto">
                {linkList}
            </Nav>

            <Nav>
                {
                    userLogined ?
                        <div id="userBar">
                            <span className="navbar-text text-dark mr-md-2" id="navUser">
                                <NavLink to="/profile">
                                    <span className="badge badge-pill badge-primary" style={{ fontSize: '90%' }}>
                                        {getName()}
                                    </span>
                                </NavLink>
                            </span>
                        </div>
                        :
                        null
                }
                {
                    userLogined ?
                        <button className="btn btn-outline-dark" onClick={props.signOut}>Sign out</button>
                        : null
                }
            </Nav>
        </Navbar.Collapse>
    )
}

export default Links;
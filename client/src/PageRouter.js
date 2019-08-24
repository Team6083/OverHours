import React, { Component } from 'react'
import { Switch, Route, Redirect } from 'react-router-dom'
import permissionCheck from './component/auth/permissionCheck'
import roles from './constant/userRoles'
import NotFound from './component/layout/errPages/NotFound'

class PageRouter extends Component {
    render() {
        const { routes, perfix } = this.props;

        let role = roles.Student;
        // if (this.props.auth.uid !== undefined) {
        //     role = roles.Student;
        // }

        return (
            <Switch>
                {routes.map((route, i) => {
                    const { path, exact, routes, permission } = route;
                    return (
                        <Route
                            key={i}
                            path={perfix ? (perfix + path) : path}
                            exact={exact}
                            render={(routeProps) => {
                                if (permission) {
                                    if (!permissionCheck(permission, role)) {
                                        if (permission.redirect) {
                                            return (<Redirect to={permission.redirect} />);
                                        } else {
                                            return (<Redirect to="/login" />);
                                        }
                                    } else {
                                        return (<route.component routes={routes} {...routeProps} />);
                                    }
                                } else {
                                    return (<route.component routes={routes} {...routeProps} />);
                                }
                            }}
                        />
                    );
                })}
                <Route component={NotFound}></Route>
            </Switch>
        )
    }
}

export default PageRouter;
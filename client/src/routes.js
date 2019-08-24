import Home from './component/pages/Home';
import roles from './constant/userRoles';

const routes = [
    {
        path: '/',
        exact: true,
        component: Home,
        name: 'Home',
        permission: {
            allow: true,
            deny: [roles.UnAuth]
        }
    }
];

export default routes;
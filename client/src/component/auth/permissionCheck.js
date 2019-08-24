const permissionCheck = function(permission, role) {
    let { allow, deny } = permission;

    // console.log('allow', allow);
    // console.log('deny', deny);

    if (allow === undefined) allow = true;
    if (deny === undefined) deny = false;

    if (allow === true && deny === false) {
        return true;
    }

    if (Array.isArray(deny)) {
        if (deny.includes(role)) return false;
    }

    if (Array.isArray(allow)) {
        if (allow.includes(role)) return true;
    }

    if (allow === false || deny === true) {
        return false;
    }

    return true;
}

export default permissionCheck;
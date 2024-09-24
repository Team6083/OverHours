
export function stringToColor(string: string) {
    let hash = 0;
    let i;

    /* eslint-disable no-bitwise */
    for (i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = '#';

    for (i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.substr(-2);
    }
    /* eslint-enable no-bitwise */

    return color;
}

export function stringAvatar(name: string) {
    return {
        sx: {
            bgcolor: stringToColor(name),
        },
        children: `${name.split(' ')[0][0]}${name.split(' ')[1] ? name.split(' ')[1][0] : ""}`,
    };
}

export function secondToString(sec: number): string {
    const day = 60 * 60 * 24;
    const hr = 60 * 60;
    const min = 60;

    let out = "";
    if (sec / day >= 1) {
        const calc = Math.floor(sec / day);
        out += calc + "d ";
        sec = sec - calc * day;
    }
    if (sec / hr >= 1) {
        const calc = Math.floor(sec / hr);
        out += calc + "h ";
        sec = sec - calc * hr;
    }
    if (sec / min >= 1) {
        const calc = Math.floor(sec / min);
        out += calc + "m ";
        sec = sec - calc * min;
    }
    out += sec + "s";

    return out;
}
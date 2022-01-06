import type {NextPage} from 'next'
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Grid, IconButton,
    Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow,
    Typography
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import theme from "../src/theme";

function stringToColor(string: string) {
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

function stringAvatar(name: string) {
    return {
        sx: {
            bgcolor: stringToColor(name),
        },
        children: `${name.split(' ')[0][0]}${name.split(' ')[1] ? name.split(' ')[1][0] : ""}`,
    };
}

const Home: NextPage = () => {

    let isCurrentIn = true;

    return (
        <Container maxWidth={"xl"} sx={{marginTop: theme.spacing(3)}}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant={"h4"}>Team 6083 - OverHours</Typography>
                </Grid>
            </Grid>
            <Grid container spacing={2} marginTop={2}>
                <Grid item md={4} xs={12}>
                    <Card>
                        <CardContent>
                            <Typography gutterBottom variant={"h5"}>
                                Season - {"N/A"}
                            </Typography>

                            <Box textAlign={"center"}>
                                <Box marginY={2}>
                                    <Avatar style={{margin: ".5em auto"}} {...stringAvatar("Kenn Huang")} />
                                    <Typography variant={"h6"} fontWeight={400}>KennHuang</Typography>
                                    <Chip label={"9d 15h 48m 28s"}/>
                                </Box>

                                {
                                    isCurrentIn ?
                                        <>
                                            <Typography gutterBottom variant={"body1"}>Check in
                                                at {(new Date()).toLocaleString()}</Typography>

                                            <Button
                                                color={"success"}
                                                variant={"contained"}
                                                size={"large"}
                                                fullWidth={true}>
                                                Check out
                                            </Button>
                                        </> :
                                        <>
                                            <Button
                                                color={"secondary"}
                                                variant={"contained"}
                                                size={"large"}
                                                fullWidth={true}>
                                                Check in
                                            </Button>
                                        </>
                                }
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item md={8} xs={12}>
                    <Card>
                        <CardContent>
                            <Typography gutterBottom variant={"h5"}>
                                Checkin List
                            </Typography>

                            <TableContainer>
                                <Table sx={{minWidth: 650}} aria-label="simple table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>User</TableCell>
                                            <TableCell>Time in</TableCell>
                                            <TableCell>Time out</TableCell>
                                            <TableCell>Season</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {["KennHuang"].map((row, i) => (
                                            <TableRow
                                                key={i}
                                            >
                                                <TableCell component="th" scope="row">
                                                    {row}
                                                </TableCell>
                                                <TableCell>{new Date().toLocaleString()}</TableCell>
                                                <TableCell>{new Date().toLocaleString()}</TableCell>
                                                <TableCell>{"2021 Season"}</TableCell>
                                                <TableCell>
                                                    <IconButton aria-label="delete">
                                                        <DeleteIcon />
                                                    </IconButton>
                                                    <IconButton aria-label="logout">
                                                        <LogoutIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    )
}

export default Home

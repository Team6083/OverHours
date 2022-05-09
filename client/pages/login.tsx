import {NextPage} from "next";
import theme from "../src/theme";
import {Box, Button, Card, CardContent, Container, Grid, TextField, Typography} from "@mui/material";


const Home: NextPage = () => {
    return <>
        <Container maxWidth={"sm"} sx={{marginTop: theme.spacing(3)}}>
            <Grid container>
                <Grid item xs={12}>
                </Grid>
            </Grid>
            <Grid container spacing={2} marginTop={2}>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box textAlign={"center"}>
                                <Typography gutterBottom variant={"h4"}>Login</Typography>

                                <Box marginX={2} marginTop={2}>
                                    <TextField label="UserName" variant="outlined" color="secondary" fullWidth
                                               margin="normal"/>
                                    <TextField label="Password" variant="outlined" color="secondary" fullWidth type="password"
                                               margin="normal"/>

                                    <Button variant="contained" color="secondary" sx={{marginTop: 4}}
                                            fullWidth>Login</Button>

                                    <Box marginTop={2}>
                                        <Typography variant="subtitle1" sx={{color: "gray", cursor: "pointer"}}>Forget
                                            password?</Typography>
                                    </Box>

                                    {/*<Divider sx={{marginY: 3}}>OR</Divider>*/}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    </>
}

export default Home;
"use client";

import {
  Container,
  Typography,
  useTheme,
  Grid2 as Grid,
  CardContent,
  Box,
  Avatar,
  Chip,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
} from "@mui/material";

import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import { CardWithShadow } from "@/components/CardWithShadow";
import { useState } from "react";

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

export default function Home() {
  const theme = useTheme();

  const [isCurrentIn, setIsCurrentIn] = useState(true);

  return (
    <Container maxWidth="xl" sx={{ marginTop: theme.spacing(3), marginBottom: theme.spacing(3) }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Typography variant={"h4"}>Team 6083</Typography>
        </Grid>
      </Grid>
      <Grid container spacing={2} marginTop={2}>
        <Grid size={{ md: 4, xs: 12 }}>
          <CardWithShadow>
            <CardContent>
              <Typography gutterBottom variant={"h5"}>
                Current Season - {"N/A"}
              </Typography>

              <Box textAlign={"center"}>
                <Box marginY={2}>
                  <Avatar style={{ margin: ".5em auto" }} {...stringAvatar("Kenn Huang")} />
                  <Typography variant="h6" gutterBottom>KennHuang</Typography>
                  <Chip label={"9d 15h 48m 28s"} />
                </Box>


                <Button
                  color={isCurrentIn ? "secondary" : "success"}
                  variant="contained"
                  size="large"
                  fullWidth={true}
                  onClick={() => setIsCurrentIn(!isCurrentIn)}
                >
                  {isCurrentIn ? "Sign-out" : "Sign-in"}
                </Button>

                {isCurrentIn ?
                  <Typography variant="caption">
                    Sign-in at {(new Date()).toLocaleString()}
                  </Typography> : null}
              </Box>
            </CardContent>
          </CardWithShadow>
        </Grid>
        <Grid size={{ md: 8, xs: 12 }}>
          <CardWithShadow>
            <CardContent>
              <Typography gutterBottom variant={"h5"}>
                Sign-In List
              </Typography>

              <TableContainer>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Sign-In Time</TableCell>
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
          </CardWithShadow>
        </Grid>
      </Grid>
    </Container>
  );
}
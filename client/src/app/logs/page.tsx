"use client";

import { CardContent, Container, Typography, useTheme } from "@mui/material";

import { CardWithShadow } from "@/components/CardWithShadow";
import LogsTable from "@/components/LogsTable";
import { SignInLog } from "@/types";


const data: SignInLog[] = [
    {
        id: "66e92e53cef77100011f60be",
        name: "Alice Johnson",
        signInTime: new Date("2023-10-01T08:00:00"),
        signOutTime: new Date("2023-10-01T12:00:00"),
        season: "2023 Season",
    },
    {
        id: "66e92e53cef77100011f60bf",
        name: "Bob Smith",
        signInTime: new Date("2023-10-01T09:00:00"),
        signOutTime: new Date("2023-10-01T17:00:00"),
        lockStatus: "auto",
        season: "2023 Season",
        accumSec: 10,
    },
    {
        id: "66e92e53cef77100311f60be",
        name: "Charlie Brown",
        signInTime: new Date("2023-10-01T10:00:00"),
        signOutTime: new Date("2023-10-01T17:00:00"),
        season: "2023 Season",
        accumSec: 70,
        accumNotes: "Processed by KennHuang",
    },
    {
        id: "66e92e53cef77120011f60be",
        name: "Bob Smith",
        signInTime: new Date("2023-10-03T11:00:00"),
        signOutTime: new Date("2023-10-03T14:00:00"),
        lockStatus: "manual",
        lockedBy: "Alice Johnson",
        season: "2023 Season",
    },
    {
        id: "66e92e52cef77100011f60be",
        name: "Charlie Brown",
        signInTime: new Date("2023-10-01T10:00:00"),
        season: "2023 Season",
    }
];

export default function LogsPage() {
    const theme = useTheme();

    return <Container maxWidth="xl" sx={{ marginTop: theme.spacing(3), marginBottom: theme.spacing(3) }}>
        <CardWithShadow>
            <CardContent>
                <Typography gutterBottom variant={"h5"}>
                    Sign-In Logs
                </Typography>

                <LogsTable mode="history" data={data} />
            </CardContent>
        </CardWithShadow>
    </Container>
}
"use client";

import { CardContent, Container, Typography, useTheme } from "@mui/material";

import { CardWithShadow } from "@/components/CardWithShadow";
import LogsTable from "@/components/LogsTable";


export default function LogsPage() {
    const theme = useTheme();

    return <Container maxWidth="xl" sx={{ marginTop: theme.spacing(3), marginBottom: theme.spacing(3) }}>
        <CardWithShadow>
            <CardContent>
                <Typography gutterBottom variant={"h5"}>
                    Sign-In Logs
                </Typography>

                <LogsTable mode="history" />
            </CardContent>
        </CardWithShadow>
    </Container>
}
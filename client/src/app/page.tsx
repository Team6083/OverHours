'use client';

import { useState } from 'react';

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
} from '@mui/material';

import CardWithShadow from '@/components/CardWithShadow';
import LogsTable from '@/components/LogsTable';
import { stringAvatar } from '@/utils';

export default function Home() {
  const theme = useTheme();

  const [isCurrentIn, setIsCurrentIn] = useState(true);

  return (
    <Container maxWidth="xl" sx={{ marginTop: theme.spacing(3), marginBottom: theme.spacing(3) }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="h4">FRC Team 6083</Typography>
        </Grid>
      </Grid>
      <Grid container spacing={2} marginTop={2}>
        <Grid size={{ md: 4, xs: 12 }}>
          <CardWithShadow>
            <CardContent>
              <Typography gutterBottom variant="h5">
                Current Season -
                {' '}
                N/A
              </Typography>

              <Box textAlign="center">
                <Box marginY={2}>
                  <Avatar style={{ margin: '.5em auto' }} {...stringAvatar('Kenn Huang')} />
                  <Typography variant="h6" gutterBottom>KennHuang</Typography>
                  <Chip label="9d 15h 48m 28s" />
                </Box>

                <Button
                  color={isCurrentIn ? 'secondary' : 'success'}
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={() => setIsCurrentIn(!isCurrentIn)}
                >
                  {isCurrentIn ? 'Clock-out' : 'Clock-in'}
                </Button>

                {isCurrentIn
                  ? (
                    <Typography variant="caption">
                      Sign-in at
                      {' '}
                      {(new Date('2024-09-07')).toLocaleString()}
                    </Typography>
                  ) : null}
              </Box>
            </CardContent>
          </CardWithShadow>
        </Grid>
        <Grid size={{ md: 8, xs: 12 }}>
          <CardWithShadow>
            <CardContent>
              <Typography gutterBottom variant="h5">
                Current Sign-In Members
              </Typography>

              <LogsTable
                mode="current-in"
                data={[
                  {
                    id: '1',
                    name: 'Kenn Huang',
                    signInTime: new Date('2024-09-07'),
                    season: '2021',
                  },
                ]}
              />
            </CardContent>
          </CardWithShadow>
        </Grid>
      </Grid>
    </Container>
  );
}

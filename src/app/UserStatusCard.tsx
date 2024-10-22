'use client';

import { useState } from 'react';
import {
  CardContent, Typography, Box, Avatar, Chip,
} from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import { LoadingButton } from '@mui/lab';

import CardWithShadow from '@/components/CardWithShadow';
import { stringAvatar } from '@/utils';
import { } from '@/auth';
import { UserInfo } from '@/types';
import { punchIn, punchOut } from './actions';

export interface UserStatusCardProps {
  userInfo: UserInfo;
  currentSeason: string;
  isCurrentIn: boolean;
}

export default function UserStatusCard(
  { userInfo, currentSeason, isCurrentIn }: UserStatusCardProps,
) {
  const [loading, setLoading] = useState<boolean>(false);

  const handlePunchButtonClick = async () => {
    setLoading(true);
    try {
      if (isCurrentIn) {
        await punchOut(userInfo.id);
      } else {
        await punchIn(userInfo.id);
      }
    } catch (error) {
      enqueueSnackbar((error as Error).message, { variant: 'error' });
    }
    setLoading(false);
  };

  return (
    <CardWithShadow>
      <CardContent>
        <Typography gutterBottom variant="h5">
          Current Season -
          {' '}
          {currentSeason}
        </Typography>

        <Box textAlign="center">
          <Box marginY={2}>
            <Avatar style={{ margin: '.5em auto' }} {...(userInfo.name ? stringAvatar(userInfo.name) : {})} />
            <Typography variant="h6" gutterBottom>{userInfo.name}</Typography>
            <Chip label="9d 15h 48m 28s" />
          </Box>

          <LoadingButton
            loading={loading}
            color={isCurrentIn ? 'secondary' : 'success'}
            variant="contained"
            size="large"
            fullWidth
            onClick={handlePunchButtonClick}
          >
            {isCurrentIn ? 'Clock-out' : 'Clock-in'}
          </LoadingButton>

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
  );
}

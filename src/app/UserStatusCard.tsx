'use client';

import { useState } from 'react';
import {
  CardContent, Typography, Box, Avatar, Chip,
} from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import { LoadingButton } from '@mui/lab';

import CardWithShadow from '@/components/CardWithShadow';
import { secondToString, stringAvatar } from '@/utils';
import { } from '@/auth';
import { UserInfo } from '@/types';
import { punchIn, punchOut } from './actions';

export interface UserStatusCardProps {
  userInfo?: UserInfo;
  userAccumulatedTime?: number;
  inTime?: Date;
}

export default function UserStatusCard(
  { userInfo, userAccumulatedTime, inTime }: UserStatusCardProps,
) {
  const [loading, setLoading] = useState<boolean>(false);
  const isCurrentIn = inTime !== undefined;

  return (
    <CardWithShadow>
      <CardContent>
        {userInfo ?
          <Box textAlign="center">
            <Box marginY={2}>
              <Avatar
                style={{ margin: '.5em auto' }}
                {...(userInfo.avatar ? { src: userInfo.avatar } : stringAvatar(userInfo.name ?? ''))}
              />
              <Typography variant="h6" gutterBottom>{userInfo.name}</Typography>
              {typeof userAccumulatedTime === 'number' ? <Chip label={secondToString(userAccumulatedTime)} /> : null}
            </Box>

            <LoadingButton
              loading={loading}
              color={isCurrentIn ? 'secondary' : 'success'}
              variant="contained"
              size="large"
              fullWidth
              onClick={async () => {
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
              }}
            >
              {isCurrentIn ? 'Clock-out' : 'Clock-in'}
            </LoadingButton>

            {isCurrentIn
              ? (
                <Box marginTop={1}>
                  <Typography variant="caption">
                    Clock-in at
                    {' '}
                    {inTime.toLocaleString()}
                  </Typography>
                </Box>
              ) : null}
          </Box> :
          <Typography variant="h6" gutterBottom>
            Login to see your status
          </Typography>}
      </CardContent>
    </CardWithShadow>
  );
}

'use client';

import {
  Box, TextField, MenuItem, Button,
  Alert,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { TimeLog, User } from '@prisma/client';
import { useFormState } from 'react-dom';
import { saveTimeLog } from './actions';

export default function TimeLogForm({ timeLog }:
  {
    timeLog: TimeLog & { user: Pick<User, 'id' | 'name'> }
  }) {
  const [state, action] = useFormState(saveTimeLog, undefined);
  const errors = state && 'errors' in state && state?.errors ? state.errors : undefined;
  const message = state && 'message' in state && state?.message ? state.message : undefined;

  const inTimeError = !!(errors?.inTime && errors?.inTime?.length > 0);
  const inTimeErrorMessage = errors?.inTime?.join(', ');

  const outTimeError = !!(errors?.outTime && errors?.outTime?.length > 0);
  const outTimeErrorMessage = errors?.outTime?.join(', ');

  const statusError = !!(errors?.status && errors?.status?.length > 0);
  const statusErrorMessage = errors?.status?.join(', ');

  const notesError = !!(errors?.notes && errors?.notes?.length > 0);
  const notesErrorMessage = errors?.notes?.join(', ');

  const user = timeLog.user.name;

  const defaultInTime = timeLog?.inTime.toISOString().slice(0, 19);
  const defaultOutTime = timeLog?.status !== 'CurrentlyIn' ? timeLog?.outTime?.toISOString().slice(0, 19) : undefined;

  return (
    <Box
      component="form"
      action={action}
      noValidate
    >
      {
        message
        && <Alert severity="error">{message}</Alert>
      }
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <TextField
            type="text"
            label="ID"
            name="id"
            fullWidth
            variant="outlined"
            color="primary"
            sx={{ ariaLabel: 'id' }}
            value={timeLog.id}
            slotProps={{
              htmlInput: {
                readOnly: true,
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <TextField
            type="text"
            label="User ID"
            name="userId"
            fullWidth
            disabled
            variant="outlined"
            color="primary"
            sx={{ ariaLabel: 'userId' }}
            value={`${user} (${timeLog.user.id})`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <TextField
            error={inTimeError}
            helperText={inTimeErrorMessage}
            type="datetime-local"
            label="In Time"
            name="inTime"
            fullWidth
            variant="outlined"
            color="primary"
            sx={{ ariaLabel: 'inTime' }}
            defaultValue={defaultInTime}
            slotProps={{
              htmlInput: {
                step: 1,
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <TextField
            error={outTimeError}
            helperText={outTimeErrorMessage}
            type="datetime-local"
            label="Out Time"
            name="outTime"
            fullWidth
            variant="outlined"
            color="primary"
            sx={{ ariaLabel: 'outTime' }}
            defaultValue={defaultOutTime}
            slotProps={{
              htmlInput: {
                step: 1,
              },
            }}
          />
          <FormControlLabel
            control={<Checkbox name="clearOutTime" color="primary" />}
            label="Clear out time"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <TextField
            error={statusError}
            helperText={statusErrorMessage}
            select
            label="Status"
            name="status"
            fullWidth
            defaultValue={timeLog.status}
          >
            <MenuItem value="CurrentlyIn">
              Currently In
            </MenuItem>
            <MenuItem value="Done">
              Done
            </MenuItem>
            <MenuItem value="Locked">
              Locked
            </MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            error={notesError}
            helperText={notesErrorMessage}
            type="text"
            label="Notes"
            name="notes"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            color="primary"
            sx={{ ariaLabel: 'notes' }}
            defaultValue={timeLog.notes}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Button type="submit" variant="contained" fullWidth>Save</Button>
        </Grid>
      </Grid>
    </Box>
  );
}

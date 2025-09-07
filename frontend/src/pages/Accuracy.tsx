import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

const Accuracy: React.FC = () => {
  const [sessionFilter, setSessionFilter] = useState<string>('All Sessions');

  const handleRefresh = () => console.log('Refresh Graph');
  const handleClear = () => console.log('Clear History');

  return (
    <Box sx={{ p: 3, overflowY: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Accuracy
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Track model accuracy across all training sessions. This graph shows Monte Carlo test results
        from background testing during training.
      </Typography>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Stack direction="row" spacing={2}>
          <Button size="small" variant="outlined" onClick={handleRefresh}>
            Refresh Graph
          </Button>
          <Button size="small" variant="outlined" onClick={handleClear}>
            Clear History
          </Button>
        </Stack>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Show</InputLabel>
          <Select
            label="Show"
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value as string)}
          >
            <MenuItem value="All Sessions">All Sessions</MenuItem>
            <MenuItem value="Last 10">Last 10</MenuItem>
            <MenuItem value="Current">Current</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Graph Placeholder */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" align="center" gutterBottom>
          Monte Carlo Test Results by Training Block: {sessionFilter}
        </Typography>
        <Box
          sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}
        >
          <Typography variant="caption">Line chart placeholder</Typography>
        </Box>
        {/* Legend */}
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="caption">Mean Median Best Worst Range</Typography>
        </Box>
      </Paper>

      {/* Current Statistics */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2">Training Blocks: 24</Typography>
            <Typography variant="body2">Overall Best: 95.6%</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2">Overall Mean: 82.5%</Typography>
            <Typography variant="body2">Overall Worst: 55.4%</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2">Overall Median: 88.2%</Typography>
            <Typography variant="body2">Range: 40.2%</Typography>
          </Grid>
        </Grid>
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="body2" color="success.main">
            📈 Improving
          </Typography>
        </Box>
      </Paper>

      {/* Bottom status bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2">Neural training: Epoch 4/1, Loss: 0.0593</Typography>
        <Typography variant="body2">Auto-save: ON</Typography>
      </Box>
    </Box>
  );
};

export default Accuracy;

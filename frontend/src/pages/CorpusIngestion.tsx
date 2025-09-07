import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Stack,
  LinearProgress,
} from '@mui/material';

const CorpusIngestion: React.FC = () => {
  const datasets = [
    { name: 'The Pile', desc: '~825 GB from multiple sources. Extremely diverse content.' },
    { name: 'Wikipedia', desc: 'English Wikipedia dump.' },
    { name: 'Books3', desc: 'Large collection of books.' },
  ];

  const [selected, setSelected] = useState<string>(datasets[0].name);
  const [blockSize, setBlockSize] = useState<number>(50000);
  const [maxChars, setMaxChars] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');

  const handleStart = () => {
    setRunning(true);
    setProgress(0);
    setStatus('Processing block 1 (' + blockSize.toLocaleString() + ' characters)');
    // fake progress
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setRunning(false);
      }
      setProgress(p);
    }, 300);
  };

  return (
    <Box sx={{ p: 3, overflowY: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Corpus Ingestion
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Select and ingest text from large-scale datasets. Data is processed in blocks and not stored
        locally – only the model is updated.
      </Typography>

      {/* Dataset Selection */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Dataset Selection
        </Typography>
        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel>Select Dataset</InputLabel>
          <Select
            label="Select Dataset"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            {datasets.map(d => (
              <MenuItem key={d.name} value={d.name}>
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ ml: 1 }}>
          {datasets.find(d => d.name === selected)?.desc}
        </Typography>
      </Paper>

      {/* Ingestion Settings */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Ingestion Settings
        </Typography>
        <Stack spacing={2} maxWidth={300}>
          <TextField
            label="Block size (characters)"
            type="number"
            size="small"
            value={blockSize}
            onChange={e => setBlockSize(Number(e.target.value))}
          />
          <TextField
            label="Max characters (0 = unlimited)"
            type="number"
            size="small"
            value={maxChars}
            onChange={e => setMaxChars(Number(e.target.value))}
          />
        </Stack>
      </Paper>

      {/* Buttons */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" disabled={running} onClick={handleStart}>
          Start Ingestion
        </Button>
        <Button variant="outlined" disabled>
          Stop
        </Button>
      </Stack>

      {/* Progress */}
      <Box sx={{ mb: 2 }}>
        {running || progress > 0 ? <LinearProgress variant="determinate" value={progress} /> : null}
      </Box>
      {status && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          {status}
        </Typography>
      )}

      {/* Bottom status bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2">Ready. Configure neural layers and add training text to begin.</Typography>
        <Typography variant="body2">Auto-save: ON</Typography>
      </Box>
    </Box>
  );
};

export default CorpusIngestion;

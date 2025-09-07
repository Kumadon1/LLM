import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  FormControl,
  Chip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  PlayArrow as PlayArrowIcon,
  AutoFixHigh as AutoFixHighIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useTrainingStore } from '../store/trainingStore';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
}));

const TrainingTextArea = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
  },
}));

const StatusCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#0d1117' : '#f6f8fa',
  border: `1px solid ${theme.palette.divider}`,
  marginTop: theme.spacing(2),
}));

const AddTextNew: React.FC = () => {
  const [trainingText, setTrainingText] = useState('');
  const [blockSize, setBlockSize] = useState(100000);
  const [saveAfterBlocks, setSaveAfterBlocks] = useState(1);
  const [neuralEpochs, setNeuralEpochs] = useState(5);
  const [enableBlockProcessing, setEnableBlockProcessing] = useState(true);
  // Global training store
  const { jobId, progress, status, message, start, resume } = useTrainingStore((s) => ({
    jobId: s.jobId,
    progress: s.progress,
    status: s.status,
    message: s.message,
    start: s.start,
    resume: s.resume,
  }));
  const isTraining = status === 'queued' || status === 'running';
  const progressMsg = message;
  const [modelAccuracy, setModelAccuracy] = useState<string>('No data yet');
  const [processingStats, setProcessingStats] = useState({
    totalPatterns: 26,
    uniquePatterns: 0,
    memoryUsage: '0 MB',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleText = `Mahananda has met with world leaders from the Emperor of Japan to the President of the United States, four-star generals, the leaders of many spiritual traditions, billionaires, movie producers, distinguished professors, athletes and coaches, actors and actresses, authors, and philanthropists, and has personally taught and mentored countless individuals to regain their physical health, fix their businesses, and let go of outdated paradigms that were holding them back. His presence and loving voice have been the source of countless transformations and remain a beacon of hope for many.`;

  const handleImportFile = () => fileInputRef.current?.click();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setTrainingText(text);
      updateProcessingStats(text);
    };
    reader.readAsText(file);
  };

  const updateProcessingStats = (text: string) => {
    const cleanedText = text.toUpperCase().replace(/[^A-Z ]/g, '');
    const patterns = cleanedText.split(/\s+/).filter((w) => w.length > 0);
    setProcessingStats({
      totalPatterns: patterns.length,
      uniquePatterns: new Set(patterns).size,
      memoryUsage: `${(new Blob([cleanedText]).size / 1024 / 1024).toFixed(2)} MB`,
    });
  };

  const handleClearText = () => {
    setTrainingText('');
    setProcessingStats({ totalPatterns: 0, uniquePatterns: 0, memoryUsage: '0 MB' });
    setModelAccuracy('No data yet');
  };

  const handleUpdateModel = async () => {
    if (!trainingText.trim()) return;
    await start({ text: trainingText, block_size: blockSize, epochs: neuralEpochs });
  };

  const loadSampleText = () => {
    setTrainingText(sampleText);
    updateProcessingStats(sampleText);
  };

  useEffect(() => {
    if (trainingText) updateProcessingStats(trainingText);
  }, [trainingText]);

  // Ensure global store resumes on initial mount
  useEffect(() => { resume(); }, [resume]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Add Text
      </Typography>

      {isTraining && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="caption">{progressMsg} ({progress}%)</Typography>
        </Box>
      )}

      <StyledPaper>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Enter or import text to train the model. The text will be cleaned to contain only letters A-Z and spaces.
          </Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
            Training Text
          </Typography>
          <TrainingTextArea
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            placeholder={sampleText}
            value={trainingText}
            onChange={(e) => setTrainingText(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".txt,.md" onChange={handleFileUpload} />
            <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={handleImportFile} size="small">
              Import from File...
            </Button>
            <Button variant="outlined" startIcon={<ClearIcon />} onClick={handleClearText} size="small">
              Clear Text
            </Button>
            <Button variant="contained" disabled={isTraining} startIcon={<AutoFixHighIcon />} onClick={loadSampleText} size="small">
              Load Sample Text
            </Button>
          </Box>
        </Box>
      </StyledPaper>

      <StyledPaper>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Processing Settings
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Block size (characters):
              </Typography>
              <TextField type="number" value={blockSize} onChange={(e) => setBlockSize(Number(e.target.value))} fullWidth />
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Save after blocks:
              </Typography>
              <TextField type="number" value={saveAfterBlocks} onChange={(e) => setSaveAfterBlocks(Number(e.target.value))} fullWidth />
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Neural epochs:
              </Typography>
              <TextField type="number" value={neuralEpochs} onChange={(e) => setNeuralEpochs(Number(e.target.value))} fullWidth />
            </FormControl>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={<Checkbox checked={enableBlockProcessing} onChange={(e) => setEnableBlockProcessing(e.target.checked)} />}
            label="Enable block processing"
          />
        </Box>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={handleUpdateModel}
            disabled={isTraining || !trainingText}
            sx={{ px: 6, py: 1.5 }}
          >
            Update Model
          </Button>
        </Box>
      </StyledPaper>

      <StyledPaper>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Training Status
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {progressMsg || 'Idle'}
          </Typography>
          {isTraining && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" sx={{ mt: 1 }}>
                {progressMsg} ({progress}%)
              </Typography>
            </Box>
          )}
        </Box>
        <Alert severity={!isTraining && progress === 100 && (progressMsg.startsWith('Completed')) ? 'success' : (progressMsg.startsWith('Failed') ? 'error' : 'info')} sx={{ mt: 2 }}>
          <Typography variant="body2">{progressMsg || modelAccuracy}</Typography>
        </Alert>
      </StyledPaper>

      <StatusCard>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Loaded existing training data from database ({processingStats.totalPatterns} patterns)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label="Auto-save: ON" color="success" size="small" icon={<SaveIcon />} />
            </Box>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Total Patterns
              </Typography>
              <Typography variant="h6">{processingStats.totalPatterns.toLocaleString()}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Unique Patterns
              </Typography>
              <Typography variant="h6">{processingStats.uniquePatterns.toLocaleString()}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Memory Usage
              </Typography>
              <Typography variant="h6">{processingStats.memoryUsage}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </StatusCard>
    </Box>
  );
};

export default AddTextNew;


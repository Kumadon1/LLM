import React, { useState, useEffect, useRef } from 'react';
import {
  LinearProgress,
  Alert,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Grid,
  Card,
  CardContent,
  FormControl,
  Chip,
  Snackbar,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  PlayArrow as PlayArrowIcon,
  AutoFixHigh as AutoFixHighIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { TrainingService } from '../services';
import type { TrainingProgress, TrainingStats } from '../services';

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

const AddText: React.FC = () => {
  const [trainingText, setTrainingText] = useState('');
  const [blockSize, setBlockSize] = useState(100000);
  const [saveAfterBlocks, setSaveAfterBlocks] = useState(1);
  const [neuralEpochs, setNeuralEpochs] = useState(5);
  const [enableBlockProcessing, setEnableBlockProcessing] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [modelAccuracy, setModelAccuracy] = useState<string>('No data yet');
  const [processingStats, setProcessingStats] = useState<TrainingStats>({
    total_patterns: 0,
    unique_patterns: 0,
    memory_usage: '0 MB',
  });
  const [corpusStats, setCorpusStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopPolling, setStopPolling] = useState<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample text for demonstration
  const sampleText = `Mahananda has met with world leaders from the Emperor of Japan to the President of the United States, four-star generals, the leaders of many spiritual traditions, billionaires, movie producers, distinguished professors, athletes and coaches, actors and actresses, authors, and philanthropists, and has personally taught and mentored countless individuals to regain their physical health, fix their businesses, and let go of outdated paradigms that were holding them back. His presence and loving voice have been the source of countless transformations and remain a beacon of hope for many.`;

  const handleImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setTrainingText(text);
        updateProcessingStats(text);
      };
      reader.readAsText(file);
    }
  };

  const updateProcessingStats = (text: string) => {
    const stats = TrainingService.calculateStats(text);
    setProcessingStats(stats);
  };

  const handleClearText = () => {
    setTrainingText('');
    setProcessingStats({
      total_patterns: 0,
      unique_patterns: 0,
      memory_usage: '0 MB',
    });
    setModelAccuracy('No data yet');
    setError(null);
    
    // Stop any ongoing polling
    if (stopPolling) {
      stopPolling();
      setStopPolling(null);
    }
  };

  const handleUpdateModel = async () => {
    if (!trainingText.trim()) return;
    
    // Validate configuration
    const validationErrors = TrainingService.validateConfig({
      text: trainingText,
      block_size: blockSize,
      epochs: neuralEpochs,
    });
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }
    
    setIsTraining(true);
    setProgress(0);
    setProgressMsg('Submitting job...');
    setError(null);

    try {
      const jobId = await TrainingService.startTraining({
        text: trainingText,
        block_size: blockSize,
        epochs: neuralEpochs,
      });
      
      setJobId(jobId);
      setProgressMsg('Job queued');
      
      // Start polling for progress
      const stop = await TrainingService.pollProgress(
        jobId,
        (progress: TrainingProgress) => {
          setProgress(progress.progress);
          setProgressMsg(progress.message);
          
          if (progress.status === 'success') {
            setIsTraining(false);
            setModelAccuracy('Model updated successfully');
            setJobId(null);
          } else if (progress.status === 'error') {
            setIsTraining(false);
            setError(progress.error || 'Training failed');
            setJobId(null);
          }
        },
        2000
      );
      
      setStopPolling(() => stop);
    } catch (err) {
      console.error(err);
      setIsTraining(false);
      setError(err instanceof Error ? err.message : 'Failed to start training');
      setProgressMsg('');
    }
  };

  const loadSampleText = () => {
    setTrainingText(sampleText);
    updateProcessingStats(sampleText);
  };

  useEffect(() => {
    if (trainingText) {
      updateProcessingStats(trainingText);
    }
  }, [trainingText]);

  // Load corpus stats on mount
  useEffect(() => {
    const loadCorpusStats = async () => {
      try {
        const stats = await TrainingService.getDataStats();
        setCorpusStats(stats);
      } catch (err) {
        console.error('Failed to load corpus stats:', err);
      }
    };
    loadCorpusStats();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (stopPolling) {
        stopPolling();
      }
    };
  }, [stopPolling]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Add Text
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {isTraining && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="caption">{progressMsg} ({progress}%)</Typography>
        </Box>
      )}

      {/* Main Training Text Input */}
      <StyledPaper elevation={1}>
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
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".txt,.md"
              onChange={handleFileUpload}
            />
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={handleImportFile}
              size="small"
            >
              Import from File...
            </Button>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearText}
              size="small"
            >
              Clear Text
            </Button>
<Button
              variant="contained"
              disabled={isTraining}
              startIcon={<AutoFixHighIcon />}
              onClick={loadSampleText}
              size="small"
            >
              Load Sample Text
            </Button>
          </Box>
        </Box>
      </StyledPaper>

      {/* Processing Settings */}
      <StyledPaper elevation={1}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Processing Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Block size (characters):
              </Typography>
              <TextField
                type="number"
                value={blockSize}
                onChange={(e) => setBlockSize(Number(e.target.value))}
                InputProps={{
                  inputProps: { min: 1000, max: 1000000 }
                }}
                fullWidth
              />
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Save after blocks:
              </Typography>
              <TextField
                type="number"
                value={saveAfterBlocks}
                onChange={(e) => setSaveAfterBlocks(Number(e.target.value))}
                InputProps={{
                  inputProps: { min: 1, max: 100 }
                }}
                fullWidth
              />
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Neural epochs:
              </Typography>
              <TextField
                type="number"
                value={neuralEpochs}
                onChange={(e) => setNeuralEpochs(Number(e.target.value))}
                InputProps={{
                  inputProps: { min: 1, max: 100 }
                }}
                fullWidth
              />
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={enableBlockProcessing}
                onChange={(e) => setEnableBlockProcessing(e.target.checked)}
                color="primary"
              />
            }
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

      {/* Training Status */}
      <StyledPaper elevation={1}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Training Status
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Training Status
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

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            {modelAccuracy}
          </Typography>
        </Alert>
      </StyledPaper>

      {/* Statistics Card - Shows both current text stats and accumulated corpus stats */}
      <StatusCard>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Accumulated Training Corpus
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="Persistent Storage"
                color="success"
                size="small"
                icon={<SaveIcon />}
              />
            </Box>
          </Box>
          
          {corpusStats && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">
                  Total Texts
                </Typography>
                <Typography variant="h6">
                  {corpusStats.total_texts}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">
                  Total Characters
                </Typography>
                <Typography variant="h6">
                  {(corpusStats.total_texts * corpusStats.average_text_length).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">
                  Generations
                </Typography>
                <Typography variant="h6">
                  {corpusStats.total_generations}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">
                  Avg Text Length
                </Typography>
                <Typography variant="h6">
                  {corpusStats.average_text_length}
                </Typography>
              </Grid>
            </Grid>
          )}
          
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Current Text Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Total Patterns
                </Typography>
                <Typography variant="body1">
                  {processingStats.total_patterns.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Unique Patterns
                </Typography>
                <Typography variant="body1">
                  {processingStats.unique_patterns.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Memory Usage
                </Typography>
                <Typography variant="body1">
                  {processingStats.memory_usage}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </StatusCard>
    </Box>
  );
};

export default AddText;

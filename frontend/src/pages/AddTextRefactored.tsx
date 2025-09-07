/**
 * AddText Page - Refactored with Component Library
 * Example of using the new reusable components
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Grid,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Clear as ClearIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';

// Import from component library
import {
  PageHeader,
  TextInput,
  ProgressCard,
  ErrorAlert,
  LoadingSpinner,
  StatCard,
} from '../components';

// Import services
import { TrainingService } from '../services';
import type { TrainingProgress, TrainingStats } from '../services';

const AddTextRefactored: React.FC = () => {
  const [trainingText, setTrainingText] = useState('');
  const [blockSize, setBlockSize] = useState(100000);
  const [neuralEpochs, setNeuralEpochs] = useState(5);
  const [enableBlockProcessing, setEnableBlockProcessing] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [processingStats, setProcessingStats] = useState<TrainingStats>({
    total_patterns: 0,
    unique_patterns: 0,
    memory_usage: '0 MB',
  });
  const [stopPolling, setStopPolling] = useState<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample text for demonstration
  const sampleText = `Mahananda has met with world leaders from the Emperor of Japan to the President of the United States...`;

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
    setError(null);
    
    if (stopPolling) {
      stopPolling();
      setStopPolling(null);
    }
  };

  const handleUpdateModel = async () => {
    if (!trainingText.trim()) return;
    
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
      
      const stop = await TrainingService.pollProgress(
        jobId,
        (progress: TrainingProgress) => {
          setProgress(progress.progress);
          setProgressMsg(progress.message);
          
          if (progress.status === 'success') {
            setIsTraining(false);
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

  useEffect(() => {
    return () => {
      if (stopPolling) {
        stopPolling();
      }
    };
  }, [stopPolling]);

  return (
    <Box>
      {/* Page Header */}
      <PageHeader
        title="Add Training Text"
        subtitle="Upload or enter text to train the model. The text will be cleaned to contain only letters A-Z and spaces."
        actions={
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={handleUpdateModel}
            disabled={isTraining || !trainingText}
          >
            Update Model
          </Button>
        }
        status={
          isTraining && (
            <LoadingSpinner
              inline
              size="small"
              message={`${progressMsg} (${progress}%)`}
            />
          )
        }
      />

      {/* Error Display */}
      {error && (
        <ErrorAlert
          severity="error"
          message={error}
          onClose={() => setError(null)}
          closable
        />
      )}

      {/* Training Progress */}
      {isTraining && (
        <Box sx={{ mb: 3 }}>
          <ProgressCard
            title="Training Progress"
            progress={progress}
            message={progressMsg}
            status={jobId ? 'running' : 'idle'}
            elevated
          />
        </Box>
      )}

      {/* Main Content */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextInput
            label="Training Text"
            value={trainingText}
            onChange={setTrainingText}
            placeholder="Enter or paste your training text here..."
            multiline
            rows={10}
            helperText="The text will be automatically cleaned to contain only A-Z and spaces"
            maxLength={1000000}
            clearable
          />
          
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={handleImportFile}
            >
              Import File
            </Button>
            <Button
              variant="outlined"
              onClick={loadSampleText}
            >
              Load Sample
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<ClearIcon />}
              onClick={handleClearText}
              disabled={!trainingText}
            >
              Clear
            </Button>
          </Box>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </Grid>

        {/* Training Parameters */}
        <Grid item xs={12} md={4}>
          <TextInput
            label="Block Size (characters)"
            value={blockSize.toString()}
            onChange={(value) => setBlockSize(Number(value) || 100000)}
            type="text"
            helperText="Size of text blocks for processing"
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <TextInput
            label="Neural Epochs"
            value={neuralEpochs.toString()}
            onChange={(value) => setNeuralEpochs(Number(value) || 5)}
            type="text"
            helperText="Number of training epochs"
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
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
        </Grid>

        {/* Statistics */}
        <Grid item xs={12} md={4}>
          <StatCard
            label="Total Patterns"
            value={processingStats.total_patterns}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <StatCard
            label="Unique Patterns"
            value={processingStats.unique_patterns}
            color="secondary"
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <StatCard
            label="Memory Usage"
            value={processingStats.memory_usage}
            color="info"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AddTextRefactored;

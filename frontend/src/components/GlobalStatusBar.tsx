import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  IconButton,
  Chip,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  FitnessCenter as TrainingIcon,
  Casino as MonteCarloIcon,
  TextFields as GenerateIcon,
  Close as CloseIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { useTrainingStore } from '../store/trainingStore';
import { useMonteCarloStore } from '../store/monteCarloStore';
import { useGenerationStore } from '../store/generationStore';

interface JobIndicatorProps {
  icon: React.ReactNode;
  title: string;
  progress: number;
  status: string;
  message: string;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onNavigate?: () => void;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

const JobIndicator: React.FC<JobIndicatorProps> = ({
  icon,
  title,
  progress,
  status,
  message,
  onPause,
  onResume,
  onStop,
  onNavigate,
  color = 'primary',
}) => {
  const isRunning = status === 'running' || status === 'queued';
  const isPaused = status === 'paused';
  
  if (status === 'idle' || status === 'success') return null;
  
  return (
    <Paper
      elevation={2}
      sx={{
        p: 1.5,
        minWidth: 250,
        maxWidth: 350,
        cursor: onNavigate ? 'pointer' : 'default',
      }}
      onClick={onNavigate}
    >
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            <Typography variant="subtitle2" fontWeight="bold">
              {title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {isRunning && onPause && (
              <Tooltip title="Pause">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPause();
                  }}
                >
                  <PauseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {isPaused && onResume && (
              <Tooltip title="Resume">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResume();
                  }}
                >
                  <PlayIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onStop && (
              <Tooltip title="Stop">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStop();
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        
        <LinearProgress
          variant="determinate"
          value={progress}
          color={color}
          sx={{ height: 6, borderRadius: 1 }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
            {message}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {Math.round(progress)}%
          </Typography>
        </Box>
        
        {status === 'error' && (
          <Chip
            label="Error"
            color="error"
            size="small"
            variant="filled"
          />
        )}
      </Stack>
    </Paper>
  );
};

interface GlobalStatusBarProps {
  onNavigateToTab?: (tabIndex: number) => void;
}

export const GlobalStatusBar: React.FC<GlobalStatusBarProps> = ({ onNavigateToTab }) => {
  
  // Training store
  const {
    status: trainingStatus,
    progress: trainingProgress,
    message: trainingMessage,
    stop: stopTraining,
    resume: resumeTraining,
  } = useTrainingStore();
  
  // Monte Carlo store
  const {
    status: mcStatus,
    progress: mcProgress,
    message: mcMessage,
    currentSimulation,
    totalSimulations,
    pause: pauseMC,
    resume: resumeMC,
    stop: stopMC,
  } = useMonteCarloStore();
  
  // Generation store
  const {
    status: genStatus,
    error: genError,
  } = useGenerationStore();
  
  const hasActiveJobs = 
    (trainingStatus !== 'idle' && trainingStatus !== 'success') ||
    (mcStatus !== 'idle' && mcStatus !== 'completed') ||
    genStatus === 'generating';
  
  if (!hasActiveJobs) return null;
  
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        maxHeight: '50vh',
        overflowY: 'auto',
      }}
    >
      {/* Training Job */}
      {trainingStatus !== 'idle' && trainingStatus !== 'success' && (
        <JobIndicator
          icon={<TrainingIcon color="primary" />}
          title="Training Model"
          progress={trainingProgress}
          status={trainingStatus}
          message={trainingMessage}
          onPause={trainingStatus === 'running' ? stopTraining : undefined}
          onResume={trainingStatus === 'paused' ? resumeTraining : undefined}
          onStop={trainingStatus === 'paused' ? () => {
            stopTraining();
            useTrainingStore.getState().clear();
          } : stopTraining}
          onNavigate={() => onNavigateToTab?.(1)}
          color="primary"
        />
      )}
      
      {/* Monte Carlo Simulation */}
      {mcStatus !== 'idle' && mcStatus !== 'completed' && (
        <JobIndicator
          icon={<MonteCarloIcon color="secondary" />}
          title="Monte Carlo Simulation"
          progress={mcProgress}
          status={mcStatus}
          message={`${mcMessage} (${currentSimulation}/${totalSimulations})`}
          onPause={mcStatus === 'running' ? pauseMC : undefined}
          onResume={mcStatus === 'paused' ? resumeMC : undefined}
          onStop={stopMC}
          onNavigate={() => onNavigateToTab?.(4)}
          color="secondary"
        />
      )}
      
      {/* Text Generation */}
      {genStatus === 'generating' && (
        <JobIndicator
          icon={<GenerateIcon color="info" />}
          title="Generating Text"
          progress={50}
          status={genStatus}
          message="Generating text..."
          onNavigate={() => onNavigateToTab?.(2)}
          color="info"
        />
      )}
    </Box>
  );
};

export default GlobalStatusBar;

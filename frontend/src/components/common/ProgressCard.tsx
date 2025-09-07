/**
 * ProgressCard Component
 * Displays progress with title, percentage, and message
 */
import React from 'react';
import { Card, CardContent, Typography, LinearProgress, Box, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { colors, borderRadius, shadows } from '../../styles/theme';

interface ProgressCardProps {
  title: string;
  progress: number;
  message?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  showPercentage?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'error';
  elevated?: boolean;
}

const StyledCard = styled(Card)<{ elevated?: boolean }>(({ elevated }) => ({
  borderRadius: borderRadius.lg,
  boxShadow: elevated ? shadows.lg : shadows.sm,
  transition: 'all 300ms ease-in-out',
  '&:hover': elevated ? {
    boxShadow: shadows.xl,
  } : {},
}));

const ProgressHeader = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
});

const ProgressInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

const StyledLinearProgress = styled(LinearProgress)({
  height: 8,
  borderRadius: 4,
});

const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  progress,
  message,
  status = 'idle',
  showPercentage = true,
  color = 'primary',
  elevated = false,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'running':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'success':
        return '✓ Complete';
      case 'error':
        return '⚠ Error';
      case 'running':
        return 'In Progress';
      default:
        return 'Idle';
    }
  };

  return (
    <StyledCard elevated={elevated}>
      <CardContent>
        <ProgressHeader>
          <Typography variant="h6" component="h3">
            {title}
          </Typography>
          <ProgressInfo>
            {showPercentage && (
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            )}
            <Chip
              label={getStatusLabel()}
              color={getStatusColor()}
              size="small"
              variant={status === 'running' ? 'filled' : 'outlined'}
            />
          </ProgressInfo>
        </ProgressHeader>
        
        <StyledLinearProgress
          variant="determinate"
          value={progress}
          color={status === 'error' ? 'error' : status === 'success' ? 'success' : color}
        />
        
        {message && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            {message}
          </Typography>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default ProgressCard;

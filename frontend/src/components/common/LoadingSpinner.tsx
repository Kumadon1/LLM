/**
 * LoadingSpinner Component
 * Reusable loading indicator with various sizes and styles
 */
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { colors, mixins } from '../../styles/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
  inline?: boolean;
  color?: 'primary' | 'secondary' | 'inherit';
}

const SpinnerContainer = styled(Box)<{ fullScreen?: boolean; inline?: boolean }>(({ fullScreen, inline }) => ({
  ...(!inline && mixins.flexCenter),
  ...(fullScreen && {
    ...mixins.absoluteFill,
    position: 'fixed',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 9999,
  }),
  ...(inline && {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  }),
  flexDirection: inline ? 'row' : 'column',
  padding: fullScreen ? '0' : '16px',
}));

const Message = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(2),
  color: colors.text.secondary,
}));

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  fullScreen = false,
  inline = false,
  color = 'primary',
}) => {
  const sizeMap = {
    small: 20,
    medium: 40,
    large: 60,
  };

  return (
    <SpinnerContainer fullScreen={fullScreen} inline={inline}>
      <CircularProgress size={sizeMap[size]} color={color} />
      {message && !inline && <Message variant="body2">{message}</Message>}
      {message && inline && (
        <Typography variant="body2" sx={{ ml: 1 }}>
          {message}
        </Typography>
      )}
    </SpinnerContainer>
  );
};

export default LoadingSpinner;

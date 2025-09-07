/**
 * StatCard Component
 * Display statistics with label, value, and optional trend
 */
import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';
import { colors, borderRadius, shadows } from '../../styles/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string | number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  dense?: boolean;
}

const StyledCard = styled(Card)<{ dense?: boolean }>(({ dense }) => ({
  borderRadius: borderRadius.lg,
  boxShadow: shadows.sm,
  transition: 'all 200ms ease-in-out',
  height: '100%',
  '&:hover': {
    boxShadow: shadows.md,
    transform: 'translateY(-2px)',
  },
  padding: dense ? 0 : undefined,
}));

const IconWrapper = styled(Box)<{ color?: string }>(({ color = colors.primary.main }) => ({
  width: 48,
  height: 48,
  borderRadius: borderRadius.md,
  backgroundColor: `${color}20`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 12,
  color: color,
}));

const ValueContainer = styled(Box)({
  display: 'flex',
  alignItems: 'baseline',
  gap: '4px',
  marginBottom: '8px',
});

const TrendContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  marginTop: '8px',
});

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  trend,
  trendValue,
  color = 'primary',
  icon,
  dense = false,
}) => {
  const getColorValue = () => {
    const colorMap = {
      primary: colors.primary.main,
      secondary: colors.secondary.main,
      success: colors.success.main,
      warning: colors.warning.main,
      error: colors.error.main,
      info: colors.info.main,
    };
    return colorMap[color];
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp fontSize="small" />;
      case 'down':
        return <TrendingDown fontSize="small" />;
      case 'flat':
        return <TrendingFlat fontSize="small" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return colors.success.main;
      case 'down':
        return colors.error.main;
      case 'flat':
        return colors.text.secondary;
      default:
        return colors.text.secondary;
    }
  };

  return (
    <StyledCard dense={dense}>
      <CardContent sx={{ padding: dense ? 2 : 3 }}>
        {icon && <IconWrapper color={getColorValue()}>{icon}</IconWrapper>}
        
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}
        >
          {label}
        </Typography>
        
        <ValueContainer>
          <Typography
            variant={dense ? "h5" : "h4"}
            component="div"
            sx={{ fontWeight: 600, color: getColorValue() }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          {unit && (
            <Typography variant="body2" color="text.secondary">
              {unit}
            </Typography>
          )}
        </ValueContainer>
        
        {trend && (
          <TrendContainer>
            <Box sx={{ color: getTrendColor(), display: 'flex', alignItems: 'center' }}>
              {getTrendIcon()}
            </Box>
            {trendValue && (
              <Typography variant="caption" sx={{ color: getTrendColor() }}>
                {trendValue}
              </Typography>
            )}
          </TrendContainer>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default StatCard;

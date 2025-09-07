/**
 * ErrorAlert Component
 * Reusable error alert with various styles and actions
 */
import React from 'react';
import { Alert, AlertTitle, IconButton, Collapse, Box, Typography } from '@mui/material';
import { Close as CloseIcon, ExpandMore, ExpandLess } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { borderRadius, shadows } from '../../styles/theme';

interface ErrorAlertProps {
  title?: string;
  message: string;
  details?: string | string[];
  severity?: 'error' | 'warning' | 'info' | 'success';
  onClose?: () => void;
  closable?: boolean;
  collapsible?: boolean;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'standard' | 'filled' | 'outlined';
}

const StyledAlert = styled(Alert)(({ theme }) => ({
  borderRadius: borderRadius.md,
  boxShadow: shadows.sm,
  '& .MuiAlert-message': {
    width: '100%',
  },
}));

const DetailsContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  paddingTop: theme.spacing(1),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const DetailsList = styled('ul')({
  margin: '8px 0 0 0',
  paddingLeft: '20px',
});

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title,
  message,
  details,
  severity = 'error',
  onClose,
  closable = true,
  collapsible = false,
  action,
  icon,
  variant = 'standard',
}) => {
  const [expanded, setExpanded] = React.useState(false);

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  const renderDetails = () => {
    if (!details) return null;

    if (Array.isArray(details)) {
      return (
        <DetailsList>
          {details.map((detail, index) => (
            <li key={index}>
              <Typography variant="body2">{detail}</Typography>
            </li>
          ))}
        </DetailsList>
      );
    }

    return (
      <Typography variant="body2" sx={{ mt: 1 }}>
        {details}
      </Typography>
    );
  };

  return (
    <StyledAlert
      severity={severity}
      variant={variant}
      icon={icon}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {action}
          {collapsible && details && (
            <IconButton
              size="small"
              onClick={handleToggleExpand}
              aria-label={expanded ? 'collapse' : 'expand'}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
          {closable && onClose && (
            <IconButton
              size="small"
              onClick={handleClose}
              aria-label="close"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      }
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
      
      {details && !collapsible && (
        <DetailsContainer>{renderDetails()}</DetailsContainer>
      )}
      
      {details && collapsible && (
        <Collapse in={expanded}>
          <DetailsContainer>{renderDetails()}</DetailsContainer>
        </Collapse>
      )}
    </StyledAlert>
  );
};

export default ErrorAlert;

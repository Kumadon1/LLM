/**
 * TextInput Component
 * Enhanced text input with validation and helper features
 */
import React from 'react';
import { TextField, InputAdornment, IconButton, Box } from '@mui/material';
import { Clear as ClearIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  type?: 'text' | 'email' | 'password' | 'url' | 'search';
  fullWidth?: boolean;
  clearable?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onBlur?: () => void;
  onFocus?: () => void;
  onEnter?: () => void;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
}

const CharacterCount = styled('span')(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  marginTop: '4px',
  display: 'block',
  textAlign: 'right',
}));

const TextInput: React.FC<TextInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  error = false,
  errorMessage,
  required = false,
  disabled = false,
  multiline = false,
  rows = 4,
  maxLength,
  type = 'text',
  fullWidth = true,
  clearable = false,
  startIcon,
  endIcon,
  onBlur,
  onFocus,
  onEnter,
  size = 'medium',
  variant = 'outlined',
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    if (!maxLength || newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !multiline && onEnter) {
      event.preventDefault();
      onEnter();
    }
  };

  const getInputType = () => {
    if (type === 'password') {
      return showPassword ? 'text' : 'password';
    }
    return type;
  };

  const getEndAdornment = () => {
    const elements: React.ReactNode[] = [];

    if (type === 'password') {
      elements.push(
        <IconButton
          key="password-toggle"
          onClick={handleTogglePassword}
          edge="end"
          size="small"
          disabled={disabled}
        >
          {showPassword ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      );
    }

    if (clearable && value && !disabled) {
      elements.push(
        <IconButton
          key="clear"
          onClick={handleClear}
          edge="end"
          size="small"
        >
          <ClearIcon />
        </IconButton>
      );
    }

    if (endIcon) {
      elements.push(endIcon);
    }

    return elements.length > 0 ? (
      <InputAdornment position="end">
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {elements}
        </Box>
      </InputAdornment>
    ) : null;
  };

  const displayHelperText = () => {
    if (error && errorMessage) {
      return errorMessage;
    }
    if (maxLength && value.length > maxLength * 0.8) {
      return (
        <>
          {helperText}
          <CharacterCount>
            {value.length}/{maxLength}
          </CharacterCount>
        </>
      );
    }
    return helperText;
  };

  return (
    <TextField
      label={label}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      helperText={displayHelperText()}
      error={error}
      required={required}
      disabled={disabled}
      multiline={multiline}
      rows={rows}
      type={getInputType()}
      fullWidth={fullWidth}
      onBlur={onBlur}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      size={size}
      variant={variant}
      InputProps={{
        startAdornment: startIcon ? (
          <InputAdornment position="start">{startIcon}</InputAdornment>
        ) : null,
        endAdornment: getEndAdornment(),
      }}
    />
  );
};

export default TextInput;

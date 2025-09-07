/**
 * Theme Constants and Style Utilities
 * Centralized theme configuration for consistent styling
 */

export const colors = {
  primary: {
    main: '#0068c9',
    light: '#4a9aff',
    dark: '#003a8c',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#ff6b6b',
    light: '#ff9999',
    dark: '#cc3333',
    contrastText: '#ffffff',
  },
  success: {
    main: '#52c41a',
    light: '#95de64',
    dark: '#389e0d',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#faad14',
    light: '#ffc53d',
    dark: '#d48806',
    contrastText: '#000000',
  },
  error: {
    main: '#f5222d',
    light: '#ff7875',
    dark: '#cf1322',
    contrastText: '#ffffff',
  },
  info: {
    main: '#1890ff',
    light: '#69c0ff',
    dark: '#0050b3',
    contrastText: '#ffffff',
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)',
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff',
    dark: '#0a0a0a',
    darkPaper: '#1a1a1a',
  },
  divider: 'rgba(0, 0, 0, 0.12)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: '50%',
};

export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  md: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
  lg: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
  xl: '0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05)',
};

export const transitions = {
  fast: '150ms ease-in-out',
  standard: '300ms ease-in-out',
  slow: '450ms ease-in-out',
};

export const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.6,
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.43,
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.66,
  },
};

export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
};

// Style utilities
export const getElevation = (level: 1 | 2 | 3 | 4) => {
  const elevations = {
    1: shadows.sm,
    2: shadows.md,
    3: shadows.lg,
    4: shadows.xl,
  };
  return elevations[level];
};

export const getSpacing = (...args: Array<keyof typeof spacing>) => {
  return args.map(key => `${spacing[key]}px`).join(' ');
};

export const fadeIn = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

export const slideIn = `
  @keyframes slideIn {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

export const spin = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Common mixins
export const mixins = {
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  absoluteFill: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  scrollbar: {
    '&::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: colors.background.default,
    },
    '&::-webkit-scrollbar-thumb': {
      background: colors.text.disabled,
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: colors.text.secondary,
    },
  },
};

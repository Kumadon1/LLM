import React, { useState, useEffect } from 'react';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
// Icons removed for simplicity - can be added later
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrainingStore } from './store/trainingStore';

// Import pages
import NeuralConfig from './pages/NeuralConfig';
import AddText from './pages/AddTextNew';
import Generate from './pages/Generate';
import DataViewer from './pages/DataViewer';
import MonteCarlo from './pages/MonteCarlo';
import Accuracy from './pages/Accuracy';
import CorpusIngestion from './pages/CorpusIngestion';

// Store imports removed for now - will add when needed

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <AnimatePresence mode="wait">
      {value === index && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Box sx={{ p: 3 }}>{children}</Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const training = useTrainingStore((s) => ({ jobId: s.jobId, progress: s.progress, resume: s.resume, status: s.status }));
  useEffect(() => { training.resume(); }, []);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#0068c9',
      },
      secondary: {
        main: '#ff6b6b',
      },
      background: {
        default: darkMode ? '#0a0a0a' : '#f5f5f5',
        paper: darkMode ? '#1a1a1a' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 700,
      },
    },
    shape: {
      borderRadius: 12,
    },
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const tabConfig = [
    { label: 'Neural Config', component: <NeuralConfig /> },
    { label: 'Add Text', component: <AddText /> },
    { label: 'Generate', component: <Generate /> },
    { label: 'Data Viewer', component: <DataViewer /> },
    { label: 'Monte Carlo', component: <MonteCarlo /> },
    { label: 'Accuracy', component: <Accuracy /> },
    { label: 'Corpus Ingestion', component: <CorpusIngestion /> },
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          {/* Header */}
          <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
            <Toolbar>
              <Typography variant="h5" sx={{ flexGrow: 0, fontWeight: 700, color: 'primary.main', mr: 2 }}>
                🤖 James LLM 1
              </Typography>
              
              <Typography variant="caption" sx={{ color: 'text.secondary', mr: 4 }}>
                v1.0.0 Advanced
              </Typography>

              <Box sx={{ flexGrow: 1 }} />

              {/* Global training indicator */}
              {training.jobId && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Training: {training.progress}% {training.status === 'success' ? '✓' : training.status === 'error' ? '⚠︎' : ''}
                </Typography>
              )}

            </Toolbar>
          </AppBar>

          {/* Navigation Tabs */}
          <Paper sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 64,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                },
                '& .Mui-selected': {
                  fontWeight: 600,
                },
              }}
            >
              {tabConfig.map((tab, index) => (
                <Tab
                  key={index}
                  label={tab.label}
                />
              ))}
            </Tabs>
          </Paper>

          {/* Main Content Area */}
          <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'background.default' }}>
            {tabConfig.map((tab, index) => (
              <TabPanel key={index} value={currentTab} index={index}>
                {tab.component}
              </TabPanel>
            ))}
          </Box>

          {/* Status Bar */}
          <Paper sx={{ borderRadius: 0, borderTop: 1, borderColor: 'divider', px: 2, py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Ready • Connected to backend • Models loaded
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                GPU: Available • Memory: 8.2GB / 16GB • Queue: 0 jobs
              </Typography>
            </Box>
          </Paper>
        </Box>
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

import React, { useState } from 'react';
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
  Paper,
  Container,
  Button,
  TextField,
  CircularProgress,
  Alert
} from '@mui/material';

// Import all page components
import NeuralConfig from './pages/NeuralConfig';
import AddText from './pages/AddText';
import Generate from './pages/Generate';
import DataViewer from './pages/DataViewer';
import MonteCarlo from './pages/MonteCarlo';
import Accuracy from './pages/Accuracy';
import CorpusIngestion from './pages/CorpusIngestion';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const AppFixed: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

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
              v1.0.0
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            <Button 
              size="small" 
              onClick={() => setDarkMode(!darkMode)}
              sx={{ textTransform: 'none' }}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </Button>
          </Toolbar>
        </AppBar>

        {/* Navigation Tabs */}
        <Paper sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
              },
            }}
          >
            {tabConfig.map((tab, index) => (
              <Tab key={index} label={tab.label} />
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
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Ready • Backend: {window.location.hostname}:8000 • Models loaded
          </Typography>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default AppFixed;

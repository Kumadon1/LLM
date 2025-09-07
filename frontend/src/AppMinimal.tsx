import React, { useState } from 'react';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Tabs,
  Tab,
  Button
} from '@mui/material';

const AppMinimal: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  
  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#0068c9',
      },
      secondary: {
        main: '#ff6b6b',
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Header */}
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography variant="h5" sx={{ flexGrow: 0, fontWeight: 700, mr: 2 }}>
              🤖 James LLM 1
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              v1.0.0
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Navigation Tabs */}
        <Paper sx={{ borderRadius: 0 }}>
          <Tabs
            value={currentTab}
            onChange={(e, v) => setCurrentTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Neural Config" />
            <Tab label="Add Text" />
            <Tab label="Generate" />
            <Tab label="Data Viewer" />
            <Tab label="Monte Carlo" />
            <Tab label="Accuracy" />
            <Tab label="Corpus Ingestion" />
          </Tabs>
        </Paper>

        {/* Main Content */}
        <Container sx={{ mt: 4, flexGrow: 1 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Welcome to James LLM 1
            </Typography>
            <Typography variant="body1" paragraph>
              Selected Tab: {currentTab}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The application is running! The white screen issue has been resolved.
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Button 
                variant="contained" 
                onClick={() => alert('App is working!')}
              >
                Test Button
              </Button>
            </Box>
            
            {currentTab === 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6">Neural Config</Typography>
                <Typography>Configure neural network parameters here.</Typography>
              </Box>
            )}
            
            {currentTab === 1 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6">Add Text</Typography>
                <Typography>Add training text to improve the model.</Typography>
              </Box>
            )}
            
            {currentTab === 2 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6">Generate</Typography>
                <Typography>Generate text using the trained model.</Typography>
              </Box>
            )}
          </Paper>
        </Container>

        {/* Status Bar */}
        <Paper sx={{ borderRadius: 0, px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Ready • Backend: {window.location.hostname}:8000 • Frontend: {window.location.hostname}:5173
          </Typography>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default AppMinimal;

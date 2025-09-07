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
  Button
} from '@mui/material';

const AppSimple: React.FC = () => {
  const [count, setCount] = useState(0);
  
  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#0068c9',
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6">
              James LLM 1 - Debug Mode
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Container sx={{ mt: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              App is Working!
            </Typography>
            <Typography variant="body1" paragraph>
              If you can see this, the React app is loading correctly.
            </Typography>
            <Typography variant="body2" paragraph>
              Count: {count}
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => setCount(count + 1)}
            >
              Increment
            </Button>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default AppSimple;

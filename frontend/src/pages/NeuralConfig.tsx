import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Checkbox,
  FormControlLabel,
  Button,
  TextField,
  Alert,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  backgroundColor: '#f8f9fa',
}));

const ConfigCard = styled(Card)(({ theme }) => ({
  marginTop: theme.spacing(2),
  backgroundColor: '#ffffff',
  border: '1px solid #e0e0e0',
}));

const LayerCheckbox = styled(FormControlLabel)(({ theme }) => ({
  display: 'block',
  marginLeft: theme.spacing(2),
  marginBottom: theme.spacing(1),
  '& .MuiCheckbox-root': {
    padding: theme.spacing(0.5),
    marginRight: theme.spacing(1),
  },
}));

const ArchitectureDisplay = styled(TextField)(({ theme }) => ({
  width: '100%',
  '& .MuiInputBase-root': {
    fontFamily: 'monospace',
    fontSize: '14px',
    backgroundColor: '#f0f7ff',
  },
}));

const NeuralConfig: React.FC = () => {
  const [enableNeural, setEnableNeural] = useState(true);
  const [layers, setLayers] = useState({
    embedding: true,
    cnn: true,
    lstm: true,
    attention: true,
  });

  const [architecture, setArchitecture] = useState(
    '🔧 Architecture: Embedding(32d) → CNN(64 filters) → LSTM(256h, bidirectional) → Attention(4 heads) → Output'
  );

  const [status, setStatus] = useState('Neural configuration applied. Model needs retraining.');

  const handleLayerChange = (layer: string) => {
    setLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
    updateArchitecture();
  };

  const updateArchitecture = () => {
    let arch = '🔧 Architecture: ';
    const components = [];
    
    if (layers.embedding) components.push('Embedding(32d)');
    if (layers.cnn) components.push('CNN(64 filters)');
    if (layers.lstm) components.push('LSTM(256h, bidirectional)');
    if (layers.attention) components.push('Attention(4 heads)');
    components.push('Output');
    
    setArchitecture(arch + components.join(' → '));
  };

  const handleApplyConfiguration = () => {
    setStatus('Neural configuration applied. Model needs retraining.');
    // In production, this would send the configuration to the backend
  };

  return (
    <Box>
<Typography variant="h5" sx={{ mb: 1 }}>
        Neural Network Layer Configuration
      </Typography>

      <StyledPaper elevation={0}>
        <FormControlLabel
          control={
            <Checkbox
              checked={enableNeural}
              onChange={(e) => setEnableNeural(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Enable Neural Network
            </Typography>
          }
        />

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Select Active Neural Layers:
        </Typography>

        <Box sx={{ ml: 2 }}>
          <LayerCheckbox
            control={
              <Checkbox
                checked={layers.embedding}
                onChange={() => handleLayerChange('embedding')}
                color="primary"
              />
            }
            label={
              <>
                📊 Embedding Layer (Character → Dense Vectors)
              </>
            }
          />

          <LayerCheckbox
            control={
              <Checkbox
                checked={layers.cnn}
                onChange={() => handleLayerChange('cnn')}
                color="primary"
              />
            }
            label={
              <>
                🔍 CNN Layers (Pattern Extraction)
              </>
            }
          />

          <LayerCheckbox
            control={
              <Checkbox
                checked={layers.lstm}
                onChange={() => handleLayerChange('lstm')}
                color="primary"
              />
            }
            label={
              <>
                🔄 LSTM Layers (Sequence Modeling)
              </>
            }
          />

          <LayerCheckbox
            control={
              <Checkbox
                checked={layers.attention}
                onChange={() => handleLayerChange('attention')}
                color="primary"
              />
            }
            label={
              <>
                🎯 Multi-Head Attention (Context Weighting)
              </>
            }
          />
        </Box>

        <Box sx={{ mt: 3 }}>
          <ArchitectureDisplay
            value={architecture}
            variant="outlined"
            InputProps={{
              readOnly: true,
            }}
            multiline
            rows={2}
          />
        </Box>

        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          sx={{ mt: 3, py: 1.5 }}
          onClick={handleApplyConfiguration}
        >
          Apply Configuration
        </Button>
      </StyledPaper>

      <ConfigCard>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Configuration Information
          </Typography>
          
          <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              Current Configuration: All layers enabled (maximum quality)
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
            Tips:
          </Typography>
          <Typography variant="body2" component="div">
            • All layers enabled: Best quality, slower training<br />
            • LSTM + Attention only: Good for long sequences<br />
            • CNN only: Fast pattern matching<br />
            • Embedding only: Simple but effective baseline
          </Typography>
        </CardContent>
      </ConfigCard>

      <Box sx={{ mt: 2, p: 2, backgroundColor: '#f0f0f0', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {status}
        </Typography>
      </Box>
    </Box>
  );
};

export default NeuralConfig;

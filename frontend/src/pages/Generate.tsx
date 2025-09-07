import React, { useState } from 'react';
import {
  Box,
  Typography,
  Slider,
  TextField,
  Checkbox,
  Button,
  Grid,
  FormControlLabel,
  Paper,
  Stack,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { GenerationService } from '../services';
import type { GenerationResponse } from '../services';

const Generate: React.FC = () => {
  // Markov model weight states
  const [bigram, setBigram] = useState<number>(20);
  const [trigram, setTrigram] = useState<number>(30);
  const [tetragram, setTetragram] = useState<number>(50);

  // Neural blend / temperature / misc.
  const [neuralWeight, setNeuralWeight] = useState<number>(80);
  const [temperature, setTemperature] = useState<number>(1.2);
  const [prompt, setPrompt] = useState<string>('');
  const [charCount, setCharCount] = useState<number>(250);
  const [colorCode, setColorCode] = useState<boolean>(true);
  const [validWordsOnly, setValidWordsOnly] = useState<boolean>(false);
  const [generatedText, setGeneratedText] = useState<string>('');
  const [validMask, setValidMask] = useState<boolean[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState<number | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setQualityScore(null);
    
    try {
      // Normalize Markov weights to sum to 1.0
      const markovTotal = bigram + trigram + tetragram;
      const normalizedBigram = markovTotal > 0 ? bigram / markovTotal : 0.33;
      const normalizedTrigram = markovTotal > 0 ? trigram / markovTotal : 0.33;
      const normalizedTetragram = markovTotal > 0 ? tetragram / markovTotal : 0.34;
      
      const response = await GenerationService.generateText({
        prompt,
        temperature,
        max_tokens: charCount,
        // Pass the actual user-selected weights
        neural_weight: neuralWeight / 100,  // Convert from percentage
        bigram_weight: normalizedBigram,
        trigram_weight: normalizedTrigram,
        tetragram_weight: normalizedTetragram,
      });
      
      setGeneratedText(response.generated_text);
      setValidMask(response.valid_mask || []);
      
      // Calculate quality score if we have validation data
      if (response.valid_mask) {
        const score = GenerationService.calculateQualityScore(response.valid_mask);
        setQualityScore(score);
      }
      
      // Don't apply formatting here - we'll do it in the render
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Generation failed');
      setGeneratedText('');
      setValidMask([]);
    } finally {
      setLoading(false);
    }
  };

  const sliderLabel = (value: number) => `${value}%`;

  return (
    <Box sx={{ p: 3, overflowY: 'auto' }}>
      {/* Page Header */}
      <Typography variant="h5" sx={{ mb: 1 }}>
        {loading ? 'Generating...' : 'Generate'}
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Generate sequences using the trained Markov model with optional neural network enhancement.
      </Typography>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Quality Score Display */}
      {qualityScore !== null && (
        <Alert severity={qualityScore > 80 ? 'success' : qualityScore > 50 ? 'warning' : 'error'} sx={{ mb: 2 }}>
          Text quality score: {qualityScore}% valid words
        </Alert>
      )}

      {/* Markov Model Weights */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Markov Model Weights
        </Typography>
        <Stack spacing={2}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8} sm={10}>
              <Typography gutterBottom>Bigram (2-char):</Typography>
              <Slider
                value={bigram}
                onChange={(_, v) => setBigram(v as number)}
                min={0}
                max={100}
                valueLabelDisplay="off"
              />
            </Grid>
            <Grid item xs={4} sm={2}>
              <Typography>{sliderLabel(bigram)}</Typography>
            </Grid>
          </Grid>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8} sm={10}>
              <Typography gutterBottom>Trigram (3-char):</Typography>
              <Slider
                value={trigram}
                onChange={(_, v) => setTrigram(v as number)}
                min={0}
                max={100}
                valueLabelDisplay="off"
              />
            </Grid>
            <Grid item xs={4} sm={2}>
              <Typography>{sliderLabel(trigram)}</Typography>
            </Grid>
          </Grid>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8} sm={10}>
              <Typography gutterBottom>Tetragram (4-char):</Typography>
              <Slider
                value={tetragram}
                onChange={(_, v) => setTetragram(v as number)}
                min={0}
                max={100}
                valueLabelDisplay="off"
              />
            </Grid>
            <Grid item xs={4} sm={2}>
              <Typography>{sliderLabel(tetragram)}</Typography>
            </Grid>
          </Grid>

          <Divider />
          <Typography>Total: 100%</Typography>
        </Stack>
      </Paper>

      {/* Neural vs Markov Blending */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Neural vs Markov Blending
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={8} sm={10}>
            <Slider
              value={neuralWeight}
              onChange={(_, v) => setNeuralWeight(v as number)}
              min={0}
              max={100}
              valueLabelDisplay="off"
            />
          </Grid>
          <Grid item xs={4} sm={2}>
            <Typography>{sliderLabel(neuralWeight)}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Prompt */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Prompt (Optional)
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={3}
          placeholder="Type your prompt here… e.g., 'THE QUICK BROWN FOX'"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
      </Paper>

      {/* Temperature */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={8} sm={10}>
            <Typography gutterBottom>Temperature:</Typography>
            <Slider
              value={temperature}
              onChange={(_, v) => setTemperature(v as number)}
              step={0.1}
              min={0.1}
              max={3.0}
              valueLabelDisplay="off"
            />
          </Grid>
          <Grid item xs={4} sm={2}>
            <Typography>{temperature.toFixed(1)}</Typography>
          </Grid>
        </Grid>
        <Typography variant="caption">0.1=predictable, 1.0=normal, 3.0=creative</Typography>
      </Paper>

      {/* Generation Settings */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Generation Settings
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Number of characters to generate:"
              type="number"
              value={charCount}
              onChange={e => setCharCount(Number(e.target.value))}
              InputProps={{ inputProps: { min: 1 } }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={8}>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={<Checkbox checked={colorCode} onChange={e => setColorCode(e.target.checked)} />}
                label="Color-Code Words"
              />
              <FormControlLabel
                control={<Checkbox checked={validWordsOnly} onChange={e => setValidWordsOnly(e.target.checked)} />}
                label="Generate Valid Words Only"
              />
            </Stack>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
<Button variant="contained" onClick={handleGenerate} disabled={loading}>
            Generate
          </Button>
        </Box>
      </Paper>

      {/* Generated Sequence */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Generated Sequence
        </Typography>
{/* Render generated text with optional color coding */}
        {generatedText && (
          <Box
            sx={{
              p: 1,
              border: '1px solid',
              borderColor: 'divider',
              minHeight: 120,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
            }}
          >
            {colorCode && validMask.length > 0 ? (
              // Split text into words and spaces, then map with colors
              (() => {
                // Split by whitespace but filter out empty strings
                const words = generatedText.trim().split(/\s+/).filter(w => w.length > 0);
                const result: JSX.Element[] = [];
                
                // Ensure we have a valid mask for each word
                words.forEach((word, index) => {
                  // Check if we have a validation result for this word index
                  const isValid = index < validMask.length ? validMask[index] : true;
                  
                  result.push(
                    <span key={`word-${index}`} style={{ 
                      color: isValid ? 'green' : 'red',
                      fontWeight: isValid ? 'normal' : 'bold'
                    }}>
                      {word}
                    </span>
                  );
                  
                  // Add space after word (except for last word)
                  if (index < words.length - 1) {
                    result.push(<span key={`space-${index}`}> </span>);
                  }
                });
                
                return result.length > 0 ? result : <span>{generatedText}</span>;
              })()
            ) : (
              generatedText
            )}
          </Box>
        )}
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
          <Button size="small" sx={{ mr: 2 }} variant="outlined" onClick={() => navigator.clipboard.writeText(generatedText)}>
            Copy to Clipboard
          </Button>
{(() => {
            const words = generatedText.trim().split(/\s+/).filter(w => w.length > 0);
            const total = words.length;
            const validCount = validMask.length > 0 ? validMask.filter(Boolean).length : 0;
            const pct = validMask.length > 0 ? ((validCount / validMask.length) * 100).toFixed(1) : '0.0';
            
            // Debug logging
            console.log('Generate tab stats:', {
              words: words,
              wordCount: total,
              validMaskLength: validMask.length,
              validCount: validCount,
              percentage: pct
            });
            
            return (
              <Typography variant="body2">
                Word Statistics: {validCount}/{validMask.length || total} valid words ({pct}%)
              </Typography>
            );
          })()}
        </Box>
      </Paper>

      {/* Bottom status bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2">Generated 100 characters successfully.</Typography>
        <Typography variant="body2">Auto-save: ON</Typography>
      </Box>
    </Box>
  );
};

export default Generate;

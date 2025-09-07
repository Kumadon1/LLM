import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Slider,
  Paper,
  Button,
  Grid,
  Stack,
  LinearProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Divider,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Download as DownloadIcon,
  Pause as PauseIcon,
  RestartAlt as RestartIcon,
} from '@mui/icons-material';
import { GenerationService } from '../services';
import { useMonteCarloStore } from '../store/monteCarloStore';
import type { SimulationResult } from '../store/monteCarloStore';
import axios from 'axios';

interface HistogramData {
  bin: string;
  count: number;
  percentage: number;
}

const MonteCarlo: React.FC = () => {
  // Global Monte Carlo store
  const {
    status: mcStatus,
    progress: mcProgress,
    message: mcMessage,
    currentSimulation,
    totalSimulations,
    results,
    stats,
    params,
    error: mcError,
    start: startSimulation,
    pause: pauseSimulation,
    resume: resumeSimulation,
    stop: stopSimulation,
    clear: clearSimulation,
    appendResults,
  } = useMonteCarloStore();
  
  // Local state for UI parameters
  const [charsPerGen, setCharsPerGen] = useState<number>(250);
  const [numSims, setNumSims] = useState<number>(100);
  const [temperature, setTemperature] = useState<number>(1.0);
  const [neuralWeight, setNeuralWeight] = useState<number>(80);
  const [bigram, setBigram] = useState<number>(20);
  const [trigram, setTrigram] = useState<number>(30);
  const [tetragram, setTetragram] = useState<number>(50);
  const [prompt, setPrompt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Derive running state from global store
  const running = mcStatus === 'running';
  const paused = mcStatus === 'paused';
  
  // Initialize with empty bins to show structure (4% intervals for detail)
  const initializeEmptyHistogram = () => {
    const bins: HistogramData[] = [];
    const binSize = 4; // 4% intervals = 25 bins total
    for (let i = 0; i <= 96; i += binSize) {
      bins.push({
        bin: `${i}-${i + binSize}`,
        count: 0,
        percentage: 0
      });
    }
    return bins;
  };
  
  const [histogramData, setHistogramData] = useState<HistogramData[]>(initializeEmptyHistogram());

  // Load evaluation history on component mount
  useEffect(() => {
    const loadEvaluationHistory = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/evaluation/evaluations', {
          params: { limit: 100 }
        });
        
        if (response.data.success && response.data.evaluations) {
          // Convert evaluation history to SimulationResult format
          const historicalResults: SimulationResult[] = [];
          
          response.data.evaluations.forEach((evaluation: any) => {
            // Each evaluation has multiple samples in its results array
            if (evaluation.results && Array.isArray(evaluation.results)) {
              evaluation.results.forEach((sample: any) => {
                historicalResults.push({
                  validPercentage: sample.valid_percentage || 0,
                  totalWords: sample.total_words || 0,
                  validWords: sample.valid_words || 0,
                  text: sample.text || '',
                });
              });
            }
          });
          
          if (historicalResults.length > 0) {
            // Add historical results to the store
            appendResults(historicalResults);
            console.log(`Loaded ${historicalResults.length} historical evaluation results`);
          }
        }
      } catch (err) {
        console.error('Failed to load evaluation history:', err);
        // Don't show error to user, just log it
      }
    };
    
    loadEvaluationHistory();
  }, []);

  // Display error from global store
  useEffect(() => {
    if (mcError) {
      setError(mcError);
    }
  }, [mcError]);

  const createHistogram = (data: SimulationResult[]) => {
    if (data.length === 0) {
      console.log('No data for histogram');
      return initializeEmptyHistogram();
    }
    
    console.log(`Creating histogram for ${data.length} results`);
    console.log('Valid percentages:', data.map(d => d.validPercentage.toFixed(1)));
    
    // Create bins with 4% intervals for smooth distribution
    const bins: { [key: string]: number } = {};
    const binSize = 4; // 4% intervals = 25 bins
    
    for (let i = 0; i <= 96; i += binSize) {
      bins[`${i}-${i + binSize}`] = 0;
    }
    
    // Count results in each bin
    data.forEach(result => {
      const binIndex = Math.floor(result.validPercentage / binSize) * binSize;
      const binKey = `${binIndex}-${binIndex + binSize}`;
      if (bins[binKey] !== undefined) {
        bins[binKey]++;
      }
    });
    
    console.log('Bin counts:', bins);
    
    // Convert to array format
    const histogramArray = Object.entries(bins).map(([bin, count]) => ({
      bin,
      count,
      percentage: (count / data.length) * 100,
    }));
    
    console.log('Histogram data:', histogramArray);
    return histogramArray;
  };

  const handleRun = async () => {
    setError(null);
    
    // Use global store to start simulation
    await startSimulation({
      numSims,
      charsPerGen,
      temperature,
      prompt,
      neuralWeight,
      bigram,
      trigram,
      tetragram,
    });
  };

  const handleStop = () => {
    stopSimulation();
  };
  
  const handlePause = () => {
    pauseSimulation();
  };
  
  const handleResume = () => {
    resumeSimulation();
  };
  
  const handleClear = () => {
    clearSimulation();
    setHistogramData(initializeEmptyHistogram());
  };

  const handleExport = () => {
    if (results.length === 0) return;
    
    const csvContent = [
      'Run,Valid Percentage,Valid Words,Total Words',
      ...results.map((r, i) => 
        `${i + 1},${r.validPercentage.toFixed(2)},${r.validWords},${r.totalWords}`
      ),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monte-carlo-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Update histogram when results change
  useEffect(() => {
    const newHistogramData = createHistogram(results);
    console.log('Updating Monte Carlo display:', {
      resultsCount: results.length,
      histogramData: newHistogramData,
      stats: stats
    });
    setHistogramData(newHistogramData);
  }, [results, stats]);

  const sliderLabel = (v: number) => `${v}%`;

  return (
    <Box sx={{ p: 3, overflowY: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Monte Carlo Analysis
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Run Monte Carlo simulations to analyze the distribution of valid word percentages.
        This helps you understand model consistency and find optimal weight settings.
        {results.length > 0 && !running && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            Including {results.length} evaluation results from training history.
          </Typography>
        )}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Simulation Parameters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Simulation Parameters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Characters per generation"
              type="number"
              fullWidth
              value={charsPerGen}
              onChange={e => setCharsPerGen(Number(e.target.value))}
              InputProps={{ inputProps: { min: 10, max: 1000 } }}
              disabled={running}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Number of simulations"
              type="number"
              fullWidth
              value={numSims}
              onChange={e => setNumSims(Number(e.target.value))}
              InputProps={{ inputProps: { min: 10, max: 1000 } }}
              disabled={running}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Temperature"
              type="number"
              fullWidth
              value={temperature}
              onChange={e => setTemperature(Number(e.target.value))}
              InputProps={{ inputProps: { min: 0.1, max: 3, step: 0.1 } }}
              disabled={running}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Prompt (optional)"
              fullWidth
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Enter a prompt or leave empty for random generation"
              disabled={running}
            />
          </Grid>
        </Grid>
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
              disabled={running}
            />
          </Grid>
          <Grid item xs={4} sm={2}>
            <Typography>{sliderLabel(neuralWeight)}</Typography>
          </Grid>
        </Grid>
      </Paper>

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
                disabled={running}
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
                disabled={running}
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
                disabled={running}
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

      {/* Run buttons */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2}>
          {!running && !paused && (
            <Button 
              variant="contained" 
              onClick={handleRun}
              startIcon={<PlayArrowIcon />}
            >
              Run Simulation
            </Button>
          )}
          {running && (
            <Button 
              variant="contained" 
              onClick={handlePause}
              startIcon={<PauseIcon />}
              color="warning"
            >
              Pause
            </Button>
          )}
          {paused && (
            <Button 
              variant="contained" 
              onClick={handleResume}
              startIcon={<PlayArrowIcon />}
              color="success"
            >
              Resume
            </Button>
          )}
          {(running || paused) && (
            <Button 
              variant="outlined" 
              onClick={handleStop}
              startIcon={<StopIcon />}
              color="error"
            >
              Stop
            </Button>
          )}
          <Button
            variant="outlined"
            disabled={results.length === 0}
            onClick={handleExport}
            startIcon={<DownloadIcon />}
          >
            Export Results
          </Button>
          {results.length > 0 && !running && !paused && (
            <Button
              variant="outlined"
              onClick={handleClear}
              startIcon={<RestartIcon />}
              color="warning"
            >
              Clear Results
            </Button>
          )}
        </Stack>
      </Box>

      {/* Progress */}
      {(running || paused) && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={mcProgress} 
            color={paused ? "warning" : "primary"}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption">
              {mcMessage} ({currentSimulation}/{totalSimulations})
            </Typography>
            <Typography variant="caption">
              {Math.round(mcProgress)}%
            </Typography>
          </Box>
        </Box>
      )}

      {/* Results Histogram */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Results Histogram - Valid Word Percentage Distribution
        </Typography>
        {/* Debug info */}
        {results.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {results.length} results collected, histogram has {histogramData.filter(b => b.count > 0).length} non-empty bins
          </Typography>
        )}
        <Box sx={{ height: 300, bgcolor: 'grey.100', p: 2, position: 'relative' }}>
          {/* Always show histogram structure with smaller gaps for more bins */}
          <Box sx={{ display: 'flex', alignItems: 'flex-end', height: '85%', gap: '1px' }}>
            {histogramData.map((binData, idx) => {
              const maxCount = Math.max(...histogramData.map(d => d.count), 1);
              const heightPercent = binData.count > 0 ? (binData.count / maxCount) * 100 : 0;
              
              return (
                <Box
                  key={idx}
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    height: '100%',
                  }}
                >
                  {/* Count label - only show for bins with significant counts */}
                  {binData.count > 2 && (
                    <Typography variant="caption" sx={{ fontSize: '9px', mb: 0.2 }}>
                      {binData.count}
                    </Typography>
                  )}
                  {/* Bar */}
                  <Box
                    sx={{
                      width: '100%',
                      height: `${heightPercent}%`,
                      minHeight: binData.count > 0 ? '4px' : '1px',
                      bgcolor: binData.count > 0 ? 'primary.main' : 'grey.300',
                      borderRadius: '2px 2px 0 0',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: binData.count > 0 ? 'primary.dark' : 'grey.400',
                      },
                    }}
                    title={`${binData.bin}%: ${binData.count} runs`}
                  />
                </Box>
              );
            })}
          </Box>
          {/* X-axis labels - show every 5th label (0, 20, 40, 60, 80, 100) */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, height: '15%' }}>
            {histogramData.map((bin, idx) => (
              <Box key={idx} sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '8px' }}>
                  {idx % 5 === 0 ? `${idx * 4}` : ''}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Statistics Summary */}
      {stats && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'success.light' }}>
          <Typography variant="body2" align="center" sx={{ fontWeight: 'bold' }}>
            Mean: {stats.mean}% | Median: {stats.median}% | Std Dev: {stats.stdDev}% | Range: {stats.min}%–{stats.max}%
          </Typography>
        </Paper>
      )}

      {/* Results Table (sample) */}
      {results.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Sample Results (last 5 runs)
          </Typography>
          <Table size="small">
            <TableBody>
              {results.slice(-5).map((result, idx) => (
                <TableRow key={idx}>
                  <TableCell>Run {results.length - 4 + idx}</TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={`${result.validPercentage.toFixed(1)}%`}
                      size="small"
                      color={result.validPercentage > 70 ? 'success' : result.validPercentage > 50 ? 'warning' : 'error'}
                    />
                  </TableCell>
                  <TableCell>{result.validWords}/{result.totalWords} words</TableCell>
                  <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {result.text.substring(0, 50)}...
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Bottom status bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2">
          {stats 
            ? `Monte Carlo complete: Mean validity ${stats.mean}% (${results.length} runs)`
            : 'Ready to run simulation'
          }
        </Typography>
        <Typography variant="body2">Auto-save: ON</Typography>
      </Box>
    </Box>
  );
};

export default MonteCarlo;

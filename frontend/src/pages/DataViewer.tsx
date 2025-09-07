import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { apiClient } from '../services/api.client';

interface PatternRow {
  pattern: string;
  count: number;
  frequency: number;
}

interface NGramData {
  n: number;
  unique_patterns: number;
  total_observations: number;
  patterns: PatternRow[];
}

interface TrainingStats {
  total_sessions: number;
  total_epochs: number;
  total_characters: number;
  latest_checkpoint: {
    epochs: number;
    loss: number | null;
    timestamp: string | null;
  };
  model_status: string;
}

const DataViewer: React.FC = () => {
  const [bigramData, setBigramData] = useState<NGramData | null>(null);
  const [trigramData, setTrigramData] = useState<NGramData | null>(null);
  const [tetragramData, setTetragramData] = useState<NGramData | null>(null);
  const [trainingStats, setTrainingStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load n-gram data
      const [bigrams, trigrams, tetragrams, stats] = await Promise.all([
        apiClient.get<NGramData>('/api/data/ngrams', { n: 2, limit: 10 }),
        apiClient.get<NGramData>('/api/data/ngrams', { n: 3, limit: 10 }),
        apiClient.get<NGramData>('/api/data/ngrams', { n: 4, limit: 10 }),
        apiClient.get<TrainingStats>('/api/data/training-stats'),
      ]);
      
      setBigramData(bigrams);
      setTrigramData(trigrams);
      setTetragramData(tetragrams);
      setTrainingStats(stats);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData();
  };

  const handleExport = async () => {
    if (!bigramData || !trigramData || !tetragramData) return;
    
    // Create CSV content
    const csvContent = [
      'N-Gram Type,Pattern,Count,Frequency',
      ...bigramData.patterns.map(p => `Bigram,${p.pattern},${p.count},${p.frequency}%`),
      ...trigramData.patterns.map(p => `Trigram,${p.pattern},${p.count},${p.frequency}%`),
      ...tetragramData.patterns.map(p => `Tetragram,${p.pattern},${p.count},${p.frequency}%`),
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngram-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTable = (title: string, data: NGramData | null) => (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      {data ? (
        <>
          <Typography variant="caption" component="div" gutterBottom>
            Unique patterns: {data.unique_patterns.toLocaleString()} | 
            Total observations: {data.total_observations.toLocaleString()}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Pattern</TableCell>
                <TableCell align="right">Count</TableCell>
                <TableCell align="right">Frequency (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.patterns.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {row.pattern.replace(/ /g, '_')}
                  </TableCell>
                  <TableCell align="right">{row.count.toLocaleString()}</TableCell>
                  <TableCell align="right">{row.frequency}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">No data available</Typography>
      )}
    </Paper>
  );

  return (
    <Box sx={{ p: 3, overflowY: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Data Viewer
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        View the bigram, trigram, and tetragram frequencies from the training data.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tables Section */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid item xs={12} md={4}>
          {renderTable('Bigrams (2-letter patterns)', bigramData)}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderTable('Trigrams (3-letter patterns)', trigramData)}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderTable('Tetragrams (4-character patterns)', tetragramData)}
        </Grid>
      </Grid>

      {/* Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" size="small" onClick={handleRefresh} disabled={loading}>
            Refresh Data
          </Button>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={handleExport}
            disabled={loading || !bigramData}
          >
            Export to CSV
          </Button>
        </Stack>
      </Box>

      {/* Neural Network Training Metrics */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Neural Network Training Metrics
        </Typography>
        {trainingStats ? (
          <Paper
            variant="outlined"
            sx={{ p: 2, backgroundColor: 'grey.50', fontFamily: 'monospace', whiteSpace: 'pre' }}
          >
{`Neural Network Training Metrics
===============================

Architecture: Embedding → CNN → LSTM → Attention → Output
Status: ${trainingStats.model_status === 'trained' ? '✅ Trained' : '❌ Untrained'}

📊 Cumulative Training Stats:
  Total Training Sessions: ${trainingStats.total_sessions}
  Total Epochs Trained: ${trainingStats.total_epochs}
  Total Characters in Corpus: ${trainingStats.total_characters.toLocaleString()}

🧠 Latest Checkpoint:
  Epochs: ${trainingStats.latest_checkpoint.epochs}
  Loss: ${trainingStats.latest_checkpoint.loss?.toFixed(4) || 'N/A'}
  Timestamp: ${trainingStats.latest_checkpoint.timestamp || 'N/A'}

💾 Model Capacity:
  Embedding Dimension: 64
  Hidden Dimension: 256
  Number of Layers: 2
  Attention Heads: 4
  Vocabulary Size: 27 (A-Z + space)`}
          </Paper>
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No training statistics available
          </Typography>
        )}
      </Paper>

      {/* Bottom status bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2">
          {loading ? 'Loading data...' : `Data loaded. ${bigramData?.total_observations.toLocaleString() || 0} total n-grams processed.`}
        </Typography>
        <Typography variant="body2">Auto-refresh: OFF</Typography>
      </Box>
    </Box>
  );
};

export default DataViewer;

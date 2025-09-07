import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface EvaluationData {
  id: number;
  training_job_id: string;
  mean_validity: number;
  median_validity: number;
  std_deviation: number;
  min_validity: number;
  max_validity: number;
  created_at: string;
}

interface ChartPoint {
  block: number;
  mean: number;
  median: number;
  best: number;
  worst: number;
  range: number;
}

const Accuracy: React.FC = () => {
  const [sessionFilter, setSessionFilter] = useState<string>('All Sessions');
  const [evaluations, setEvaluations] = useState<EvaluationData[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    blocks: 0,
    overallMean: 0,
    overallMedian: 0,
    overallBest: 0,
    overallWorst: 100,
    range: 0,
    trend: 'stable' as 'improving' | 'declining' | 'stable'
  });

  const fetchEvaluations = async () => {
    setLoading(true);
    setError(null);
    try {
      const limit = sessionFilter === 'Last 10' ? 10 : sessionFilter === 'Current' ? 5 : 100;
      const response = await axios.get(`http://localhost:5001/api/evaluation/evaluations?limit=${limit}`);
      
      if (response.data.success && response.data.evaluations) {
        const evals = response.data.evaluations.reverse(); // Chronological order
        setEvaluations(evals);
        processChartData(evals);
      }
    } catch (err) {
      console.error('Failed to fetch evaluations:', err);
      setError('Failed to load evaluation data');
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (evals: EvaluationData[]) => {
    if (evals.length === 0) {
      setChartData([]);
      return;
    }

    // Convert evaluations to chart points
    const points: ChartPoint[] = evals.map((evaluation, index) => ({
      block: index + 1,
      mean: evaluation.mean_validity,
      median: evaluation.median_validity,
      best: evaluation.max_validity,
      worst: evaluation.min_validity,
      range: evaluation.max_validity - evaluation.min_validity
    }));
    
    setChartData(points);

    // Calculate overall statistics
    const means = evals.map(e => e.mean_validity);
    const medians = evals.map(e => e.median_validity);
    const bests = evals.map(e => e.max_validity);
    const worsts = evals.map(e => e.min_validity);
    
    const overallMean = means.reduce((a, b) => a + b, 0) / means.length;
    const overallMedian = medians.reduce((a, b) => a + b, 0) / medians.length;
    const overallBest = Math.max(...bests);
    const overallWorst = Math.min(...worsts);
    
    // Determine trend (compare last 3 blocks to previous 3)
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (means.length >= 6) {
      const recent = means.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const previous = means.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
      if (recent > previous + 2) trend = 'improving';
      else if (recent < previous - 2) trend = 'declining';
    }
    
    setStats({
      blocks: evals.length,
      overallMean,
      overallMedian,
      overallBest,
      overallWorst,
      range: overallBest - overallWorst,
      trend
    });
  };

  const handleRefresh = () => {
    fetchEvaluations();
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear the evaluation history?')) return;
    // Would need a backend endpoint to clear history
    setEvaluations([]);
    setChartData([]);
  };

  useEffect(() => {
    fetchEvaluations();
  }, [sessionFilter]);

  // Create SVG chart
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No evaluation data available yet. Train the model to see results.
          </Typography>
        </Box>
      );
    }

    const width = 800;
    const height = 320;
    const padding = { top: 20, right: 40, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate scales
    const xScale = (block: number) => 
      padding.left + (block - 1) * (chartWidth / Math.max(1, chartData.length - 1));
    const yScale = (value: number) => 
      padding.top + chartHeight - (value / 100) * chartHeight;

    // Create path strings for each line
    const createPath = (accessor: (p: ChartPoint) => number) => {
      return chartData
        .map((point, i) => `${i === 0 ? 'M' : 'L'} ${xScale(point.block)},${yScale(accessor(point))}`)
        .join(' ');
    };

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {[0, 20, 40, 60, 80, 100].map(y => (
          <g key={y}>
            <line
              x1={padding.left}
              y1={yScale(y)}
              x2={width - padding.right}
              y2={yScale(y)}
              stroke="#e0e0e0"
              strokeDasharray={y === 0 || y === 100 ? "0" : "2,2"}
            />
            <text
              x={padding.left - 10}
              y={yScale(y) + 5}
              textAnchor="end"
              fontSize="12"
              fill="#666"
            >
              {y}%
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {chartData.map((point, i) => (
          i % Math.max(1, Math.floor(chartData.length / 10)) === 0 && (
            <text
              key={point.block}
              x={xScale(point.block)}
              y={height - 10}
              textAnchor="middle"
              fontSize="12"
              fill="#666"
            >
              {point.block}
            </text>
          )
        ))}

        {/* Range area (filled area between best and worst) */}
        <path
          d={`
            ${chartData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.block)},${yScale(p.best)}`).join(' ')}
            ${chartData.reverse().map((p, i) => `L ${xScale(p.block)},${yScale(p.worst)}`).join(' ')}
            Z
          `}
          fill="rgba(156, 39, 176, 0.1)"
          stroke="none"
        />

        {/* Lines */}
        <path d={createPath(p => p.mean)} stroke="#2196F3" strokeWidth="2" fill="none" />
        <path d={createPath(p => p.median)} stroke="#9C27B0" strokeWidth="2" fill="none" />
        <path 
          d={createPath(p => p.best)} 
          stroke="#4CAF50" 
          strokeWidth="1.5" 
          fill="none"
          strokeDasharray="5,5"
        />
        <path 
          d={createPath(p => p.worst)} 
          stroke="#F44336" 
          strokeWidth="1.5" 
          fill="none"
          strokeDasharray="5,5"
        />

        {/* Data points */}
        {chartData.map(point => (
          <g key={point.block}>
            <circle cx={xScale(point.block)} cy={yScale(point.mean)} r="4" fill="#2196F3" />
            <circle cx={xScale(point.block)} cy={yScale(point.median)} r="4" fill="#9C27B0" />
            <circle cx={xScale(point.block)} cy={yScale(point.best)} r="3" fill="#4CAF50" />
            <circle cx={xScale(point.block)} cy={yScale(point.worst)} r="3" fill="#F44336" />
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={width / 2}
          y={height - 2}
          textAnchor="middle"
          fontSize="14"
          fill="#333"
        >
          Training Block
        </text>
        <text
          x={15}
          y={height / 2}
          textAnchor="middle"
          fontSize="14"
          fill="#333"
          transform={`rotate(-90, 15, ${height / 2})`}
        >
          Accuracy (%)
        </text>
      </svg>
    );
  };

  return (
    <Box sx={{ p: 3, overflowY: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Accuracy
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Track model accuracy across all training sessions.
        <br />
        This graph shows Monte Carlo test results from background testing during training.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Stack direction="row" spacing={2}>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={handleRefresh}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Refresh Graph
          </Button>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={handleClear}
            startIcon={<ClearIcon />}
            disabled={evaluations.length === 0}
          >
            Clear History
          </Button>
        </Stack>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Show</InputLabel>
          <Select
            label="Show"
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value as string)}
          >
            <MenuItem value="All Sessions">All Sessions</MenuItem>
            <MenuItem value="Last 10">Last 10</MenuItem>
            <MenuItem value="Current">Current Session</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Graph */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" align="center" gutterBottom>
          Monte Carlo Test Results by Training Block: {sessionFilter}
        </Typography>
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          {loading ? (
            <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography>Loading evaluation data...</Typography>
            </Box>
          ) : (
            renderChart()
          )}
        </Box>
        {/* Legend */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 3, bgcolor: '#2196F3' }} />
            <Typography variant="caption">Mean</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 3, bgcolor: '#9C27B0' }} />
            <Typography variant="caption">Median</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 3, bgcolor: '#4CAF50', border: '1px dashed' }} />
            <Typography variant="caption">Best</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 3, bgcolor: '#F44336', border: '1px dashed' }} />
            <Typography variant="caption">Worst</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 10, bgcolor: 'rgba(156, 39, 176, 0.2)' }} />
            <Typography variant="caption">Range</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Current Statistics */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>Current Statistics</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2">Training Blocks: {stats.blocks}</Typography>
            <Typography variant="body2">Overall Best: {stats.overallBest.toFixed(1)}%</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2">Overall Mean: {stats.overallMean.toFixed(1)}%</Typography>
            <Typography variant="body2">Overall Worst: {stats.overallWorst.toFixed(1)}%</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2">Overall Median: {stats.overallMedian.toFixed(1)}%</Typography>
            <Typography variant="body2">Range: {stats.range.toFixed(1)}%</Typography>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
          {stats.trend === 'improving' && (
            <>
              <TrendingUpIcon color="success" />
              <Typography variant="body2" color="success.main">
                Improving
              </Typography>
            </>
          )}
          {stats.trend === 'declining' && (
            <>
              <TrendingDownIcon color="error" />
              <Typography variant="body2" color="error.main">
                Declining
              </Typography>
            </>
          )}
          {stats.trend === 'stable' && (
            <Typography variant="body2" color="text.secondary">
              Stable
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Bottom status bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2">
          {evaluations.length > 0 
            ? `Latest evaluation: ${new Date(evaluations[evaluations.length - 1].created_at).toLocaleString()}`
            : 'No evaluations yet'
          }
        </Typography>
        <Typography variant="body2" color="success.main">Auto-save: ON</Typography>
      </Box>
    </Box>
  );
};

export default Accuracy;

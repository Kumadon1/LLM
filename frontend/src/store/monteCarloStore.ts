import { create } from 'zustand';
import { pollingManager } from './polling';
import { GenerationService } from '../services';

export interface SimulationResult {
  validPercentage: number;
  totalWords: number;
  validWords: number;
  text: string;
}

export interface SimulationStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
}

export interface MonteCarloParams {
  numSims: number;
  charsPerGen: number;
  temperature: number;
  prompt: string;
  neuralWeight: number;
  bigram: number;
  trigram: number;
  tetragram: number;
}

type MonteCarloStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

interface MonteCarloState {
  // State
  status: MonteCarloStatus;
  progress: number;
  message: string;
  currentSimulation: number;
  totalSimulations: number;
  results: SimulationResult[];
  stats: SimulationStats | null;
  params: MonteCarloParams | null;
  error: string | null;
  shouldStop: boolean;
  
  // Actions
  start: (params: MonteCarloParams) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  clear: () => void;
  appendResults: (results: SimulationResult[]) => void;
  runSimulation: () => Promise<void>;
}

const STORAGE_KEY = 'monteCarloState';
const RESULTS_KEY = 'monteCarloResults';

function calculateStats(results: SimulationResult[]): SimulationStats | null {
  if (results.length === 0) return null;
  
  const percentages = results.map(r => r.validPercentage);
  percentages.sort((a, b) => a - b);
  
  const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length;
  const median = percentages[Math.floor(percentages.length / 2)];
  
  const squaredDiffs = percentages.map(x => Math.pow(x - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / percentages.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    mean,
    median,
    stdDev,
    min: Math.min(...percentages),
    max: Math.max(...percentages),
  };
}

export const useMonteCarloStore = create<MonteCarloState>((set, get) => ({
  status: 'idle',
  progress: 0,
  message: '',
  currentSimulation: 0,
  totalSimulations: 0,
  results: [],
  stats: null,
  params: null,
  error: null,
  shouldStop: false,
  
  clear: () => {
    pollingManager.stop('montecarlo-main');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RESULTS_KEY);
    set({
      status: 'idle',
      progress: 0,
      message: '',
      currentSimulation: 0,
      totalSimulations: 0,
      results: [],
      stats: null,
      params: null,
      error: null,
      shouldStop: false,
    });
  },
  
  pause: () => {
    set({ status: 'paused', shouldStop: true });
    pollingManager.stop('montecarlo-main');
  },
  
  stop: () => {
    set({ shouldStop: true, status: 'idle', message: 'Simulation stopped' });
    pollingManager.stop('montecarlo-main');
  },
  
  appendResults: (newResults: SimulationResult[]) => {
    const allResults = [...get().results, ...newResults];
    const stats = calculateStats(allResults);
    set({ results: allResults, stats });
    
    // Persist results
    localStorage.setItem(RESULTS_KEY, JSON.stringify(allResults));
  },
  
  resume: () => {
    const { params, currentSimulation } = get();
    if (!params || currentSimulation >= params.numSims) return;
    
    set({ status: 'running', shouldStop: false, message: 'Resuming simulation...' });
    get().runSimulation();
  },
  
  start: async (params: MonteCarloParams) => {
    // Clear any existing simulation
    pollingManager.stop('montecarlo-main');
    
    const existingResults = get().results;
    
    set({
      status: 'running',
      progress: 0,
      message: `Starting simulation of ${params.numSims} runs...`,
      currentSimulation: 0,
      totalSimulations: params.numSims,
      params,
      error: null,
      shouldStop: false,
      // Keep existing results if any
      results: existingResults,
    });
    
    // Persist state
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      params,
      currentSimulation: 0,
      totalSimulations: params.numSims,
    }));
    
    // Start the simulation
    get().runSimulation();
  },
  
  runSimulation: async () => {
    const { params, currentSimulation, shouldStop, results: existingResults } = get();
    if (!params) return;
    
    const simulationResults: SimulationResult[] = [];
    
    try {
      for (let i = currentSimulation; i < params.numSims; i++) {
        if (get().shouldStop) {
          set({ 
            status: 'paused', 
            message: `Paused at simulation ${i} of ${params.numSims}`,
            currentSimulation: i,
          });
          break;
        }
        
        set({
          message: `Running simulation ${i + 1} of ${params.numSims}...`,
          progress: ((i + 1) / params.numSims) * 100,
          currentSimulation: i + 1,
        });
        
        try {
          // Normalize Markov weights
          const markovTotal = params.bigram + params.trigram + params.tetragram;
          const normalizedBigram = markovTotal > 0 ? params.bigram / markovTotal : 0.33;
          const normalizedTrigram = markovTotal > 0 ? params.trigram / markovTotal : 0.33;
          const normalizedTetragram = markovTotal > 0 ? params.tetragram / markovTotal : 0.34;
          
          const response = await GenerationService.generateText({
            prompt: params.prompt || undefined,
            temperature: params.temperature,
            max_tokens: params.charsPerGen,
            neural_weight: params.neuralWeight / 100,
            bigram_weight: normalizedBigram,
            trigram_weight: normalizedTrigram,
            tetragram_weight: normalizedTetragram,
          });
          
          const words = response.generated_text.trim().split(/\s+/).filter(w => w.length > 0);
          const validMask = response.valid_mask || [];
          const validCount = validMask.filter(v => v === true).length;
          
          const totalForCalculation = validMask.length > 0 ? validMask.length : words.length;
          const validPercentage = totalForCalculation > 0 
            ? (validCount / totalForCalculation) * 100 
            : 0;
          
          simulationResults.push({
            validPercentage,
            totalWords: totalForCalculation,
            validWords: validCount,
            text: response.generated_text,
          });
          
          // Update results periodically for live histogram
          if (i % 10 === 0 || i === params.numSims - 1) {
            const allResults = [...existingResults, ...simulationResults];
            const stats = calculateStats(allResults);
            set({ 
              results: allResults, 
              stats,
            });
            
            // Persist intermediate results
            localStorage.setItem(RESULTS_KEY, JSON.stringify(allResults));
          }
        } catch (err) {
          console.error(`Simulation ${i + 1} failed:`, err);
          // Continue with other simulations
        }
        
        // Small delay to prevent overwhelming the backend
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Final update
      const allResults = [...existingResults, ...simulationResults];
      const stats = calculateStats(allResults);
      
      set({
        results: allResults,
        stats,
        status: get().shouldStop ? 'paused' : 'completed',
        message: get().shouldStop 
          ? `Paused: ${simulationResults.length} new runs completed`
          : `Simulation complete: ${simulationResults.length} new runs added (${allResults.length} total)`,
      });
      
      // Persist final results
      localStorage.setItem(RESULTS_KEY, JSON.stringify(allResults));
      
      // Clear state persistence on completion
      if (!get().shouldStop) {
        localStorage.removeItem(STORAGE_KEY);
      }
      
    } catch (err) {
      console.error('Simulation error:', err);
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Simulation failed',
        message: 'Simulation failed',
      });
    }
  },
}));

// Auto-resume on store initialization
if (typeof window !== 'undefined') {
  const savedState = localStorage.getItem(STORAGE_KEY);
  const savedResults = localStorage.getItem(RESULTS_KEY);
  
  if (savedState) {
    try {
      const state = JSON.parse(savedState);
      const results = savedResults ? JSON.parse(savedResults) : [];
      
      // Restore state after a short delay
      setTimeout(() => {
        const store = useMonteCarloStore.getState();
        store.appendResults(results);
        // Don't auto-resume - let user decide
      }, 100);
    } catch (e) {
      console.error('Failed to restore Monte Carlo state:', e);
    }
  }
}

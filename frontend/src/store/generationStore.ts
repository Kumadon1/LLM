import { create } from 'zustand';
import { GenerationService } from '../services';
import type { GenerationResponse } from '../services';

export interface GenerationParams {
  prompt: string;
  temperature: number;
  max_tokens: number;
  neural_weight: number;
  bigram_weight: number;
  trigram_weight: number;
  tetragram_weight: number;
}

export interface GenerationResult {
  id: string;
  timestamp: number;
  params: GenerationParams;
  text: string;
  validMask: boolean[];
  validPercentage: number;
  totalWords: number;
  validWords: number;
  duration: number;
}

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error';

interface GenerationState {
  // State
  status: GenerationStatus;
  currentGeneration: GenerationResult | null;
  history: GenerationResult[];
  error: string | null;
  isStreaming: boolean;
  streamedTokens: string;
  
  // Actions
  generate: (params: GenerationParams) => Promise<void>;
  clearCurrent: () => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;
}

const HISTORY_KEY = 'generationHistory';
const MAX_HISTORY = 50;

function createGenerationId(): string {
  return `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  status: 'idle',
  currentGeneration: null,
  history: [],
  error: null,
  isStreaming: false,
  streamedTokens: '',
  
  clearCurrent: () => {
    set({ 
      currentGeneration: null, 
      status: 'idle', 
      error: null,
      streamedTokens: '',
    });
  },
  
  clearHistory: () => {
    localStorage.removeItem(HISTORY_KEY);
    set({ history: [] });
  },
  
  removeFromHistory: (id: string) => {
    const newHistory = get().history.filter(g => g.id !== id);
    set({ history: newHistory });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  },
  
  generate: async (params: GenerationParams) => {
    const startTime = Date.now();
    const generationId = createGenerationId();
    
    set({ 
      status: 'generating', 
      error: null,
      streamedTokens: '',
      currentGeneration: null,
    });
    
    try {
      // Normalize Markov weights if needed
      const markovTotal = params.bigram_weight + params.trigram_weight + params.tetragram_weight;
      const normalizedParams = {
        ...params,
        bigram_weight: markovTotal > 0 ? params.bigram_weight / markovTotal : 0.33,
        trigram_weight: markovTotal > 0 ? params.trigram_weight / markovTotal : 0.33,
        tetragram_weight: markovTotal > 0 ? params.tetragram_weight / markovTotal : 0.34,
      };
      
      const response = await GenerationService.generateText(normalizedParams);
      
      // Calculate statistics
      const words = response.generated_text.trim().split(/\s+/).filter(w => w.length > 0);
      const validMask = response.valid_mask || [];
      const validCount = validMask.filter(v => v === true).length;
      const totalWords = validMask.length > 0 ? validMask.length : words.length;
      const validPercentage = totalWords > 0 ? (validCount / totalWords) * 100 : 0;
      
      const result: GenerationResult = {
        id: generationId,
        timestamp: Date.now(),
        params,
        text: response.generated_text,
        validMask: response.valid_mask || [],
        validPercentage,
        totalWords,
        validWords: validCount,
        duration: Date.now() - startTime,
      };
      
      // Update history (keep only last MAX_HISTORY)
      const currentHistory = get().history;
      const newHistory = [result, ...currentHistory].slice(0, MAX_HISTORY);
      
      set({ 
        status: 'completed',
        currentGeneration: result,
        history: newHistory,
        streamedTokens: response.generated_text,
      });
      
      // Persist history
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      
    } catch (error) {
      set({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Generation failed',
      });
    }
  },
}));

// Load history on initialization
if (typeof window !== 'undefined') {
  const savedHistory = localStorage.getItem(HISTORY_KEY);
  if (savedHistory) {
    try {
      const history = JSON.parse(savedHistory);
      if (Array.isArray(history)) {
        setTimeout(() => {
          useGenerationStore.setState({ history: history.slice(0, MAX_HISTORY) });
        }, 100);
      }
    } catch (e) {
      console.error('Failed to load generation history:', e);
    }
  }
}

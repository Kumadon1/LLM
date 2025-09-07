import { create } from 'zustand';
import { pollingManager } from './polling';

// Global training job store that keeps polling even when pages unmount.
// We persist jobId in localStorage so the app can resume after reload/tab switch.

export type TrainingStatus = 'idle' | 'queued' | 'running' | 'paused' | 'success' | 'error';

export interface TrainingStats {
  total_patterns: number;
  unique_patterns: number;
  memory_usage: string;
}

type TrainingState = {
  jobId: string | null;
  progress: number;
  message: string;
  status: TrainingStatus;
  trainingText: string;
  blockSize: number;
  epochs: number;
  stats: TrainingStats | null;
  error: string | null;
  // Actions
  start: (params: { text: string; block_size: number; epochs: number }) => Promise<void>;
  stop: () => void;
  resume: () => void;
  clear: () => void;
  checkStatus: () => Promise<void>;
};

const STORAGE_KEY = 'globalTrainJobId';
const TRAINING_DATA_KEY = 'globalTrainData';

export const useTrainingStore = create<TrainingState>((set, get) => ({
  jobId: null,
  progress: 0,
  message: '',
  status: 'idle',
  trainingText: '',
  blockSize: 100000,
  epochs: 5,
  stats: null,
  error: null,
  
  clear: () => {
    const { jobId } = get();
    if (jobId) {
      pollingManager.stop(`training-${jobId}`);
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TRAINING_DATA_KEY);
    set({ 
      jobId: null, 
      progress: 0, 
      message: '', 
      status: 'idle',
      error: null,
      stats: null 
    });
  },
  
  stop: () => {
    const { jobId } = get();
    if (jobId) {
      pollingManager.stop(`training-${jobId}`);
      // Keep the job ID in case user wants to resume
      set({ status: 'paused', message: 'Training paused' });
    }
  },
  
  checkStatus: async () => {
    const { jobId } = get();
    if (!jobId) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/train/${jobId}`);
      if (!res.ok) {
        if (res.status === 404) {
          set({ status: 'error', message: 'Job not found', error: 'Job not found' });
          localStorage.removeItem(STORAGE_KEY);
          pollingManager.stop(`training-${jobId}`);
        }
        return;
      }
      
      const data = await res.json();
      const isDone = data.status === 'success' || data.status === 'error' || data.progress >= 100;
      
      set({
        progress: data.progress || 0,
        message: data.message || '',
        status: data.status || (isDone ? 'success' : 'running'),
        error: data.error || null,
      });
      
      if (isDone) {
        pollingManager.stop(`training-${jobId}`);
        if (data.status === 'success') {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(TRAINING_DATA_KEY);
        }
      }
    } catch (e) {
      console.error('Error checking training status:', e);
      // Don't stop polling on transient errors
    }
  },
  
  start: async ({ text, block_size, epochs }) => {
    // Stop any existing training
    const currentJobId = get().jobId;
    if (currentJobId) {
      pollingManager.stop(`training-${currentJobId}`);
    }
    
    set({ 
      status: 'queued', 
      progress: 0, 
      message: 'Submitting job…',
      trainingText: text,
      blockSize: block_size,
      epochs,
      error: null 
    });
    
    try {
      const res = await fetch('http://localhost:8000/api/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, block_size, epochs }),
      });
      
      if (!res.ok) {
        throw new Error(`Failed to submit training job: ${res.statusText}`);
      }
      
      const data = await res.json();
      const jobId: string = data.job_id;
      
      // Persist job ID and training data
      localStorage.setItem(STORAGE_KEY, jobId);
      localStorage.setItem(TRAINING_DATA_KEY, JSON.stringify({ text, block_size, epochs }));
      
      set({ jobId, status: 'running', message: 'Training started', progress: 0 });
      
      // Start polling with the polling manager
      pollingManager.start(`training-${jobId}`, async () => {
        await get().checkStatus();
      }, 2000);
      
    } catch (error) {
      set({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to start training',
        message: 'Failed to start training' 
      });
    }
  },
  
  resume: () => {
    const savedJobId = localStorage.getItem(STORAGE_KEY);
    const savedData = localStorage.getItem(TRAINING_DATA_KEY);
    
    if (savedJobId && get().jobId !== savedJobId) {
      let trainingData = { text: '', block_size: 100000, epochs: 5 };
      if (savedData) {
        try {
          trainingData = JSON.parse(savedData);
        } catch (e) {
          console.error('Failed to parse saved training data');
        }
      }
      
      set({ 
        jobId: savedJobId, 
        status: 'running',
        trainingText: trainingData.text,
        blockSize: trainingData.block_size,
        epochs: trainingData.epochs,
      });
      
      // Start polling for the resumed job
      pollingManager.start(`training-${savedJobId}`, async () => {
        await get().checkStatus();
      }, 2000);
    }
  },
}));

// Auto-resume on store initialization
if (typeof window !== 'undefined') {
  const savedJobId = localStorage.getItem(STORAGE_KEY);
  if (savedJobId) {
    // Resume polling after a short delay to ensure store is initialized
    setTimeout(() => {
      useTrainingStore.getState().resume();
    }, 100);
  }
}

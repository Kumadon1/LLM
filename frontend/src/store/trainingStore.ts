import { create } from 'zustand';

// Global training job store that keeps polling even when pages unmount.
// We persist jobId in localStorage so the app can resume after reload/tab switch.

export type TrainingStatus = 'idle' | 'queued' | 'running' | 'success' | 'error';

type TrainingState = {
  jobId: string | null;
  progress: number;
  message: string;
  status: TrainingStatus;
  // Actions
  start: (params: { text: string; block_size: number; epochs: number }) => Promise<void>;
  resume: () => void;
  clear: () => void;
};

const STORAGE_KEY = 'globalTrainJobId';
let pollTimer: any = null;

function startPolling(get: () => TrainingState, set: (p: Partial<TrainingState>) => void) {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    const { jobId, status } = get();
    if (!jobId || status === 'success' || status === 'error') {
      stopPolling();
      return;
    }
    try {
      const res = await fetch(`http://localhost:8000/api/train/${jobId}`);
      if (!res.ok) {
        if (res.status === 404) {
          set({ status: 'error', message: 'Job not found', progress: 100 });
          localStorage.removeItem(STORAGE_KEY);
          stopPolling();
        }
        return;
      }
      const data = await res.json();
      const done = (data.status && (data.status === 'success' || data.status === 'error')) || (data.progress >= 100);
      set({
        progress: typeof data.progress === 'number' ? data.progress : 0,
        message: data.message ?? '',
        status: done ? (data.status ?? 'success') : 'running',
      });
      if (done) {
        stopPolling();
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      // Ignore transient errors; keep polling
    }
  }, 2000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  jobId: null,
  progress: 0,
  message: '',
  status: 'idle',
  clear: () => {
    stopPolling();
    localStorage.removeItem(STORAGE_KEY);
    set({ jobId: null, progress: 0, message: '', status: 'idle' });
  },
  start: async ({ text, block_size, epochs }) => {
    stopPolling();
    set({ status: 'queued', progress: 0, message: 'Submitting job…' });
    const res = await fetch('http://localhost:8000/api/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, block_size, epochs }),
    });
    const data = await res.json();
    const jobId: string = data.job_id;
    localStorage.setItem(STORAGE_KEY, jobId);
    set({ jobId, status: 'running', message: 'Queued', progress: 0 });
    startPolling(get, (p) => set(p as any));
  },
  resume: () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && get().jobId !== saved) {
      set({ jobId: saved, status: 'running' });
      startPolling(get, (p) => set(p as any));
    }
  },
}));

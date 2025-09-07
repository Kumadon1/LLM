/**
 * Training Service
 * Handles all training-related API operations
 */

import { apiClient, ApiError } from './api.client';

// Types and interfaces
export interface TrainingConfig {
  text: string;
  block_size?: number;
  epochs?: number;
  save_after_blocks?: number;
}

export interface TrainingJobResponse {
  job_id: string;
}

export interface TrainingProgress {
  progress: number;
  message: string;
  status: 'queued' | 'running' | 'success' | 'error';
  error?: string;
}

export interface TrainingStats {
  total_patterns: number;
  unique_patterns: number;
  memory_usage: string;
}

export interface TextCorpusItem {
  id: number;
  title?: string;
  content: string;
  source?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface TextCorpusResponse {
  texts: TextCorpusItem[];
}

export interface DataStats {
  total_texts: number;
  total_generations: number;
  average_text_length: number;
  models_available: number;
  storage_used_mb: number;
}

/**
 * Training Service Class
 */
export class TrainingService {
  /**
   * Start a new training job
   */
  static async startTraining(config: TrainingConfig): Promise<string> {
    try {
      const response = await apiClient.post<TrainingJobResponse>('/api/train', {
        text: config.text,
        block_size: config.block_size || 100000,
        epochs: config.epochs || 5,
      });
      return response.job_id;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to start training: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get training job progress
   */
  static async getProgress(jobId: string): Promise<TrainingProgress> {
    try {
      return await apiClient.get<TrainingProgress>(`/api/train/${jobId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isNotFound()) {
          throw new Error('Training job not found');
        }
        throw new Error(`Failed to get training progress: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Add text to corpus
   */
  static async addText(
    content: string,
    title?: string,
    source?: string,
    metadata?: Record<string, any>
  ): Promise<{ id: number; message: string }> {
    try {
      return await apiClient.post('/api/text', {
        title,
        content,
        source,
        metadata,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to add text: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get texts from corpus
   */
  static async getTexts(limit: number = 100): Promise<TextCorpusItem[]> {
    try {
      const response = await apiClient.get<TextCorpusResponse>('/api/text', { limit });
      return response.texts;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to fetch texts: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete text from corpus
   */
  static async deleteText(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/text/${id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isNotFound()) {
          throw new Error('Text not found');
        }
        throw new Error(`Failed to delete text: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get data statistics
   */
  static async getDataStats(): Promise<DataStats> {
    try {
      return await apiClient.get<DataStats>('/api/data/stats');
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to fetch data stats: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Ingest corpus files
   */
  static async ingestCorpus(files: string[]): Promise<{ message: string; status: string }> {
    try {
      return await apiClient.post('/api/corpus/ingest', { files });
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to ingest corpus: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get corpus status
   */
  static async getCorpusStatus(): Promise<{
    total_documents: number;
    processing: boolean;
    last_update: string;
  }> {
    try {
      return await apiClient.get('/api/corpus/status');
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to get corpus status: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Poll training progress with callback
   */
  static async pollProgress(
    jobId: string,
    onProgress: (progress: TrainingProgress) => void,
    interval: number = 2000
  ): Promise<() => void> {
    let stopped = false;
    
    const poll = async () => {
      if (stopped) return;
      
      try {
        const progress = await this.getProgress(jobId);
        onProgress(progress);
        
        if (progress.status === 'success' || progress.status === 'error') {
          stopped = true;
        } else {
          setTimeout(poll, interval);
        }
      } catch (error) {
        console.error('Failed to poll progress:', error);
        onProgress({
          progress: 0,
          message: 'Failed to get progress',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        stopped = true;
      }
    };
    
    // Start polling
    poll();
    
    // Return stop function
    return () => {
      stopped = true;
    };
  }

  /**
   * Calculate training statistics from text
   */
  static calculateStats(text: string): TrainingStats {
    // Clean text to only include A-Z and spaces (matching backend logic)
    const cleanedText = text.toUpperCase().replace(/[^A-Z ]/g, '');
    const patterns = cleanedText.split(/\s+/).filter(word => word.length > 0);
    
    return {
      total_patterns: patterns.length,
      unique_patterns: new Set(patterns).size,
      memory_usage: `${(new Blob([cleanedText]).size / 1024 / 1024).toFixed(2)} MB`,
    };
  }

  /**
   * Validate training configuration
   */
  static validateConfig(config: TrainingConfig): string[] {
    const errors: string[] = [];
    
    if (!config.text || config.text.trim().length === 0) {
      errors.push('Training text is required');
    }
    
    if (config.text && config.text.length < 100) {
      errors.push('Training text should be at least 100 characters');
    }
    
    if (config.block_size && (config.block_size < 1000 || config.block_size > 1000000)) {
      errors.push('Block size must be between 1,000 and 1,000,000');
    }
    
    if (config.epochs && (config.epochs < 1 || config.epochs > 100)) {
      errors.push('Epochs must be between 1 and 100');
    }
    
    return errors;
  }
}

// Export for convenience
export default TrainingService;

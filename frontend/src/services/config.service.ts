/**
 * Configuration Service
 * Handles neural configuration and model management
 */

import { apiClient, ApiError } from './api.client';

// Types and interfaces
export interface NeuralConfig {
  model_type: string;
  hidden_size: number;
  num_layers: number;
  num_heads: number;
  learning_rate: number;
  batch_size: number;
  epochs: number;
  dropout: number;
}

export interface SavedNeuralConfig {
  id: number;
  name: string;
  config: NeuralConfig;
  created_at: string;
  updated_at: string;
}

export interface NeuralConfigResponse {
  configs: SavedNeuralConfig[];
}

export interface Model {
  name: string;
  path: string;
  size_mb: number;
}

export interface ModelsResponse {
  models: Model[];
}

export interface ModelDownloadRequest {
  model_name: string;
  model_url: string;
}

export interface ModelDownloadResponse {
  message: string;
  status: string;
}

export interface HealthStatus {
  status: string;
  database: string;
  models_path: string;
  cache_path: string;
}

export interface RootInfo {
  name: string;
  status: string;
  version: string;
}

// Preset configurations
export const NEURAL_CONFIG_PRESETS = {
  small: {
    model_type: 'CharRNN',
    hidden_size: 128,
    num_layers: 2,
    num_heads: 4,
    learning_rate: 0.001,
    batch_size: 32,
    epochs: 5,
    dropout: 0.1,
  },
  medium: {
    model_type: 'CharRNN',
    hidden_size: 256,
    num_layers: 3,
    num_heads: 8,
    learning_rate: 0.0005,
    batch_size: 64,
    epochs: 10,
    dropout: 0.2,
  },
  large: {
    model_type: 'CharRNN',
    hidden_size: 512,
    num_layers: 4,
    num_heads: 16,
    learning_rate: 0.0001,
    batch_size: 128,
    epochs: 20,
    dropout: 0.3,
  },
} as const;

/**
 * Configuration Service Class
 */
export class ConfigService {
  /**
   * Save neural configuration
   */
  static async saveNeuralConfig(config: NeuralConfig): Promise<{ id: number; message: string }> {
    try {
      // Validate configuration
      const errors = this.validateNeuralConfig(config);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      return await apiClient.post('/api/neural-config', config);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to save configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all saved neural configurations
   */
  static async getNeuralConfigs(): Promise<SavedNeuralConfig[]> {
    try {
      const response = await apiClient.get<NeuralConfigResponse>('/api/neural-config');
      return response.configs;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to fetch configurations: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a neural configuration
   */
  static async deleteNeuralConfig(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/neural-config/${id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isNotFound()) {
          throw new Error('Configuration not found');
        }
        throw new Error(`Failed to delete configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update a neural configuration
   */
  static async updateNeuralConfig(
    id: number,
    config: NeuralConfig
  ): Promise<{ message: string }> {
    try {
      const errors = this.validateNeuralConfig(config);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      return await apiClient.put(`/api/neural-config/${id}`, config);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isNotFound()) {
          throw new Error('Configuration not found');
        }
        throw new Error(`Failed to update configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get available models
   */
  static async getModels(): Promise<Model[]> {
    try {
      const response = await apiClient.get<ModelsResponse>('/api/models');
      return response.models;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to fetch models: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Download a model
   */
  static async downloadModel(
    modelName: string,
    modelUrl: string
  ): Promise<ModelDownloadResponse> {
    try {
      return await apiClient.post<ModelDownloadResponse>('/api/models/download', {
        model_name: modelName,
        model_url: modelUrl,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to download model: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a model
   */
  static async deleteModel(modelName: string): Promise<void> {
    try {
      await apiClient.delete(`/api/models/${modelName}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isNotFound()) {
          throw new Error('Model not found');
        }
        throw new Error(`Failed to delete model: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check API health status
   */
  static async checkHealth(): Promise<HealthStatus> {
    try {
      return await apiClient.get<HealthStatus>('/health');
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Health check failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get API root information
   */
  static async getApiInfo(): Promise<RootInfo> {
    try {
      return await apiClient.get<RootInfo>('/');
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to get API info: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validate neural configuration
   */
  static validateNeuralConfig(config: NeuralConfig): string[] {
    const errors: string[] = [];

    if (!config.model_type || config.model_type.trim().length === 0) {
      errors.push('Model type is required');
    }

    if (config.hidden_size < 32 || config.hidden_size > 2048) {
      errors.push('Hidden size must be between 32 and 2048');
    }

    if (config.num_layers < 1 || config.num_layers > 10) {
      errors.push('Number of layers must be between 1 and 10');
    }

    if (config.num_heads < 1 || config.num_heads > 32) {
      errors.push('Number of heads must be between 1 and 32');
    }

    if (config.learning_rate <= 0 || config.learning_rate > 1) {
      errors.push('Learning rate must be between 0 and 1');
    }

    if (config.batch_size < 1 || config.batch_size > 512) {
      errors.push('Batch size must be between 1 and 512');
    }

    if (config.epochs < 1 || config.epochs > 100) {
      errors.push('Epochs must be between 1 and 100');
    }

    if (config.dropout < 0 || config.dropout > 0.9) {
      errors.push('Dropout must be between 0 and 0.9');
    }

    // Check if hidden_size is divisible by num_heads (for attention)
    if (config.hidden_size % config.num_heads !== 0) {
      errors.push('Hidden size must be divisible by number of heads');
    }

    return errors;
  }

  /**
   * Get preset configuration
   */
  static getPreset(preset: 'small' | 'medium' | 'large'): NeuralConfig {
    return { ...NEURAL_CONFIG_PRESETS[preset] };
  }

  /**
   * Estimate training time based on configuration
   */
  static estimateTrainingTime(config: NeuralConfig, dataSize: number): {
    estimatedMinutes: number;
    confidence: 'low' | 'medium' | 'high';
  } {
    // Simple heuristic based on model complexity and data size
    const complexity = config.hidden_size * config.num_layers * config.num_heads;
    const iterations = config.epochs * (dataSize / config.batch_size);
    
    // Base time in minutes (very rough estimate)
    const baseTime = (complexity * iterations) / 1000000;
    
    // Adjust based on hardware assumptions
    const estimatedMinutes = Math.max(1, Math.round(baseTime));
    
    // Confidence based on data size
    let confidence: 'low' | 'medium' | 'high';
    if (dataSize < 10000) {
      confidence = 'low';
    } else if (dataSize < 100000) {
      confidence = 'medium';
    } else {
      confidence = 'high';
    }
    
    return { estimatedMinutes, confidence };
  }

  /**
   * Calculate memory requirements for configuration
   */
  static calculateMemoryRequirements(config: NeuralConfig): {
    estimatedMB: number;
    recommended: 'low' | 'medium' | 'high';
  } {
    // Rough estimate based on model parameters
    const params = config.hidden_size * config.hidden_size * config.num_layers;
    const batchMemory = config.batch_size * config.hidden_size;
    
    // Convert to MB (4 bytes per float32 parameter)
    const estimatedMB = Math.round((params + batchMemory) * 4 / (1024 * 1024));
    
    let recommended: 'low' | 'medium' | 'high';
    if (estimatedMB < 100) {
      recommended = 'low';
    } else if (estimatedMB < 500) {
      recommended = 'medium';
    } else {
      recommended = 'high';
    }
    
    return { estimatedMB, recommended };
  }

  /**
   * Export configuration to JSON
   */
  static exportConfig(config: NeuralConfig): Blob {
    const json = JSON.stringify(config, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Import configuration from JSON
   */
  static async importConfig(file: File): Promise<NeuralConfig> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string) as NeuralConfig;
          const errors = this.validateNeuralConfig(config);
          
          if (errors.length > 0) {
            reject(new Error(`Invalid configuration: ${errors.join(', ')}`));
          } else {
            resolve(config);
          }
        } catch (error) {
          reject(new Error('Failed to parse configuration file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }
}

// Export for convenience
export default ConfigService;

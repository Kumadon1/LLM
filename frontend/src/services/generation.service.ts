/**
 * Generation Service
 * Handles all text generation API operations
 */

import { apiClient, ApiError } from './api.client';

// Types and interfaces
export interface GenerationRequest {
  prompt?: string;  // Made optional
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  model?: string;
  // Weight parameters
  neural_weight?: number;
  bigram_weight?: number;
  trigram_weight?: number;
  tetragram_weight?: number;
}

export interface GenerationResponse {
  generated_text: string;
  valid_mask?: boolean[];
}

export interface GenerationHistoryItem {
  id: number;
  prompt: string;
  response: string;
  model?: string;
  parameters?: {
    temperature: number;
    max_tokens: number;
    top_p: number;
  };
  created_at: string;
}

export interface GenerationHistoryResponse {
  history: GenerationHistoryItem[];
}

export interface MonteCarloRequest {
  num_simulations: number;
  confidence_level: number;
  random_seed: number;
  distribution_type: 'Normal' | 'Uniform' | 'Exponential';
  mean: number;
  std_dev: number;
}

export interface MonteCarloResult {
  mean: number;
  std: number;
  min: number;
  max: number;
  percentiles: {
    '5': number;
    '25': number;
    '50': number;
    '75': number;
    '95': number;
  };
  confidence_interval: [number, number];
}

export interface AccuracyMetric {
  id: number;
  type: string;
  value: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AccuracyMetricsResponse {
  metrics: AccuracyMetric[];
}

/**
 * Generation Service Class
 */
export class GenerationService {
  /**
   * Generate text using the model
   */
  static async generateText(params: GenerationRequest): Promise<GenerationResponse> {
    try {
      // Validate parameters
      const errors = this.validateGenerationParams(params);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      return await apiClient.post<GenerationResponse>('/api/generate', {
        prompt: params.prompt || '',  // Use empty string if prompt is undefined
        temperature: params.temperature ?? 0.7,
        max_tokens: params.max_tokens ?? 100,
        top_p: params.top_p ?? 0.9,
        model: params.model ?? 'default',
        // Pass weight parameters
        neural_weight: params.neural_weight ?? 0.8,
        bigram_weight: params.bigram_weight ?? 0.2,
        trigram_weight: params.trigram_weight ?? 0.3,
        tetragram_weight: params.tetragram_weight ?? 0.5,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Generation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get generation history
   */
  static async getHistory(limit: number = 50): Promise<GenerationHistoryItem[]> {
    try {
      const response = await apiClient.get<GenerationHistoryResponse>(
        '/api/generate/history',
        { limit }
      );
      return response.history;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to fetch generation history: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Clear generation history
   */
  static async clearHistory(): Promise<void> {
    try {
      await apiClient.delete('/api/generate/history');
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to clear history: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Run Monte Carlo simulation
   */
  static async runMonteCarlo(params: MonteCarloRequest): Promise<MonteCarloResult> {
    try {
      return await apiClient.post<MonteCarloResult>('/api/monte-carlo/run', params);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Monte Carlo simulation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Record accuracy metric
   */
  static async recordAccuracy(
    metricType: string,
    value: number,
    metadata?: Record<string, any>
  ): Promise<{ message: string }> {
    try {
      return await apiClient.post('/api/accuracy/record', {
        metric_type: metricType,
        value,
        metadata,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to record accuracy: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get accuracy metrics
   */
  static async getAccuracyMetrics(): Promise<AccuracyMetric[]> {
    try {
      const response = await apiClient.get<AccuracyMetricsResponse>('/api/accuracy/metrics');
      return response.metrics;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`Failed to fetch accuracy metrics: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validate generation parameters
   */
  static validateGenerationParams(params: GenerationRequest): string[] {
    const errors: string[] = [];

    // Prompt is now optional, so no validation needed
    // if (!params.prompt || params.prompt.trim().length === 0) {
    //   errors.push('Prompt is required');
    // }

    if (params.temperature !== undefined) {
      if (params.temperature < 0 || params.temperature > 2) {
        errors.push('Temperature must be between 0 and 2');
      }
    }

    if (params.max_tokens !== undefined) {
      if (params.max_tokens < 1 || params.max_tokens > 10000) {
        errors.push('Max tokens must be between 1 and 10,000');
      }
    }

    if (params.top_p !== undefined) {
      if (params.top_p < 0 || params.top_p > 1) {
        errors.push('Top-p must be between 0 and 1');
      }
    }

    return errors;
  }

  /**
   * Format generated text for display
   */
  static formatGeneratedText(text: string, validMask?: boolean[]): string {
    if (!validMask || validMask.length === 0) {
      return text;
    }

    // Split text into words and mark invalid ones
    const words = text.split(' ');
    const formatted = words.map((word, index) => {
      if (validMask[index] === false) {
        return `[${word}]`; // Mark invalid words with brackets
      }
      return word;
    });

    return formatted.join(' ');
  }

  /**
   * Calculate text quality score based on valid mask
   */
  static calculateQualityScore(validMask?: boolean[]): number {
    if (!validMask || validMask.length === 0) {
      return 100; // Assume perfect if no validation data
    }

    const validCount = validMask.filter(v => v === true).length;
    return Math.round((validCount / validMask.length) * 100);
  }

  /**
   * Stream generation (for future WebSocket implementation)
   */
  static async *streamGeneration(
    params: GenerationRequest,
    onToken?: (token: string) => void
  ): AsyncGenerator<string, void, unknown> {
    // This is a placeholder for future streaming implementation
    // For now, it just returns the full text at once
    const response = await this.generateText(params);
    yield response.generated_text;
  }

  /**
   * Export generation history to JSON
   */
  static async exportHistory(): Promise<Blob> {
    try {
      const history = await this.getHistory(1000); // Get more items for export
      const json = JSON.stringify(history, null, 2);
      return new Blob([json], { type: 'application/json' });
    } catch (error) {
      throw new Error('Failed to export history');
    }
  }

  /**
   * Get generation statistics
   */
  static calculateGenerationStats(history: GenerationHistoryItem[]): {
    totalGenerations: number;
    averageLength: number;
    averageTemperature: number;
    mostUsedModel: string;
    generationsToday: number;
  } {
    if (history.length === 0) {
      return {
        totalGenerations: 0,
        averageLength: 0,
        averageTemperature: 0.7,
        mostUsedModel: 'default',
        generationsToday: 0,
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const todayGenerations = history.filter(
      item => item.created_at.startsWith(today)
    );

    const totalLength = history.reduce((sum, item) => sum + item.response.length, 0);
    const totalTemp = history.reduce(
      (sum, item) => sum + (item.parameters?.temperature ?? 0.7),
      0
    );

    // Count model usage
    const modelCounts: Record<string, number> = {};
    history.forEach(item => {
      const model = item.model || 'default';
      modelCounts[model] = (modelCounts[model] || 0) + 1;
    });

    const mostUsedModel = Object.entries(modelCounts).reduce(
      (max, [model, count]) => (count > max[1] ? [model, count] : max),
      ['default', 0]
    )[0];

    return {
      totalGenerations: history.length,
      averageLength: Math.round(totalLength / history.length),
      averageTemperature: Number((totalTemp / history.length).toFixed(2)),
      mostUsedModel,
      generationsToday: todayGenerations.length,
    };
  }
}

// Export for convenience
export default GenerationService;

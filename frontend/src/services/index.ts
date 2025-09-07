/**
 * Services Index
 * Central export point for all API services
 */

// Export API client and error class
export { apiClient, ApiError } from './api.client';
export type { ApiResponse } from './api.client';

// Export Training Service
export { TrainingService } from './training.service';
export type {
  TrainingConfig,
  TrainingJobResponse,
  TrainingProgress,
  TrainingStats,
  TextCorpusItem,
  TextCorpusResponse,
  DataStats,
} from './training.service';

// Export Generation Service  
export { GenerationService } from './generation.service';
export type {
  GenerationRequest,
  GenerationResponse,
  GenerationHistoryItem,
  GenerationHistoryResponse,
  MonteCarloRequest,
  MonteCarloResult,
  AccuracyMetric,
  AccuracyMetricsResponse,
} from './generation.service';

// Export Config Service
export { ConfigService, NEURAL_CONFIG_PRESETS } from './config.service';
export type {
  NeuralConfig,
  SavedNeuralConfig,
  NeuralConfigResponse,
  Model,
  ModelsResponse,
  ModelDownloadRequest,
  ModelDownloadResponse,
  HealthStatus,
  RootInfo,
} from './config.service';

// Re-export default services for convenience
import TrainingService from './training.service';
import GenerationService from './generation.service';
import ConfigService from './config.service';

export default {
  Training: TrainingService,
  Generation: GenerationService,
  Config: ConfigService,
};

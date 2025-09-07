/**
 * Shared polling infrastructure for background operations
 * Ensures singleton polling per job and prevents orphan intervals
 */

type PollingCallback = () => Promise<void>;

class PollingManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private active: Set<string> = new Set();

  /**
   * Start polling for a specific job
   * @param jobId Unique identifier for the polling job
   * @param callback Async function to call on each poll
   * @param intervalMs Polling interval in milliseconds
   * @returns Function to stop polling
   */
  start(jobId: string, callback: PollingCallback, intervalMs: number = 2000): () => void {
    // Stop any existing polling for this job
    this.stop(jobId);

    // Mark as active
    this.active.add(jobId);

    // Create polling interval
    const interval = setInterval(async () => {
      if (!this.active.has(jobId)) {
        this.stop(jobId);
        return;
      }

      try {
        await callback();
      } catch (error) {
        console.error(`Polling error for job ${jobId}:`, error);
        // Continue polling despite errors - let the callback handle them
      }
    }, intervalMs);

    this.intervals.set(jobId, interval);

    // Return stop function
    return () => this.stop(jobId);
  }

  /**
   * Stop polling for a specific job
   */
  stop(jobId: string): void {
    const interval = this.intervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(jobId);
    }
    this.active.delete(jobId);
  }

  /**
   * Stop all polling
   */
  stopAll(): void {
    for (const jobId of this.intervals.keys()) {
      this.stop(jobId);
    }
  }

  /**
   * Check if a job is currently polling
   */
  isPolling(jobId: string): boolean {
    return this.active.has(jobId);
  }

  /**
   * Get all active polling job IDs
   */
  getActiveJobs(): string[] {
    return Array.from(this.active);
  }
}

// Export singleton instance
export const pollingManager = new PollingManager();

// Helper function for fetch with timeout
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

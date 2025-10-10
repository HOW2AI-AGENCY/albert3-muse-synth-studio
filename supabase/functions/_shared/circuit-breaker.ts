/**
 * Circuit Breaker pattern для предотвращения каскадных сбоев
 * Временно блокирует запросы после превышения порога ошибок
 */

export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5,  // 5 failures to open circuit
    private timeout = 60000, // 1 minute cooldown
    private resetTime = 30000 // 30 seconds to reset after success
  ) {}
  
  /**
   * Выполнить функцию через circuit breaker
   * @throws Error если circuit открыт
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime < this.timeout) {
        throw new Error(`Circuit breaker is OPEN - too many failures (${this.failureCount}/${this.threshold})`);
      }
      this.state = 'HALF_OPEN';
      console.log('🟡 [CIRCUIT BREAKER] State changed to HALF_OPEN');
    }
    
    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.error('🔴 [CIRCUIT BREAKER] Opened due to failures', {
        failureCount: this.failureCount,
        threshold: this.threshold,
        timeout: `${this.timeout}ms`
      });
    }
  }
  
  private reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    console.log('✅ [CIRCUIT BREAKER] Reset to CLOSED');
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.threshold
    };
  }
}

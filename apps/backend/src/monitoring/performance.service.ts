import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';

/**
 * Performance Monitoring Service
 *
 * Features:
 * - CPU usage tracking
 * - Memory usage tracking
 * - Response time monitoring
 * - Database query performance
 * - Custom metrics
 */
@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private readonly metrics: Map<string, number[]> = new Map();
  private startTime: number = Date.now();

  constructor(private readonly configService: ConfigService) {
    // Monitora risorse di sistema ogni minuto
    if (this.configService.get<boolean>('ENABLE_PERFORMANCE_MONITORING', true)) {
      setInterval(() => {
        this.collectSystemMetrics();
      }, 60000); // Every minute
    }
  }

  /**
   * Track execution time di una funzione
   */
  async measureExecutionTime<T>(
    name: string,
    fn: () => Promise<T> | T,
  ): Promise<{ result: T; duration: number }> {
    const start = process.hrtime.bigint();

    try {
      const result = await fn();
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // Convert to milliseconds

      this.recordMetric(name, duration);

      // Log slow operations
      const slowThreshold = this.configService.get<number>('SLOW_OPERATION_MS', 1000);
      if (duration > slowThreshold) {
        this.logger.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
      }

      return { result, duration };
    } catch (error) {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000;
      this.recordMetric(`${name}_error`, duration);
      throw error;
    }
  }

  /**
   * Record custom metric
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count,
      avg: sum / count,
      min: sorted[0],
      max: sorted[count - 1],
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, ReturnType<typeof this.getMetricStats>> {
    const result: Record<string, any> = {};

    for (const [name, _] of this.metrics) {
      result[name] = this.getMetricStats(name);
    }

    return result;
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    // CPU usage
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + (1 - idle / total);
    }, 0) / cpus.length * 100;

    this.recordMetric('system.cpu_usage_percent', cpuUsage);

    // Memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;

    this.recordMetric('system.memory_usage_percent', memUsagePercent);
    this.recordMetric('system.memory_used_mb', usedMem / 1024 / 1024);
    this.recordMetric('system.memory_free_mb', freeMem / 1024 / 1024);

    // Process memory
    const processMemory = process.memoryUsage();
    this.recordMetric('process.heap_used_mb', processMemory.heapUsed / 1024 / 1024);
    this.recordMetric('process.heap_total_mb', processMemory.heapTotal / 1024 / 1024);
    this.recordMetric('process.rss_mb', processMemory.rss / 1024 / 1024);

    // Uptime
    const uptimeMinutes = (Date.now() - this.startTime) / 1000 / 60;
    this.recordMetric('process.uptime_minutes', uptimeMinutes);

    // Log warnings se risorse alte
    if (cpuUsage > 80) {
      this.logger.warn(`High CPU usage: ${cpuUsage.toFixed(2)}%`);
    }

    if (memUsagePercent > 80) {
      this.logger.warn(`High memory usage: ${memUsagePercent.toFixed(2)}%`);
    }

    const heapUsedPercent = (processMemory.heapUsed / processMemory.heapTotal) * 100;
    if (heapUsedPercent > 90) {
      this.logger.warn(`High heap usage: ${heapUsedPercent.toFixed(2)}%`);
    }
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    cpu: number;
    memory: number;
    heap: number;
  } {
    const cpuStats = this.getMetricStats('system.cpu_usage_percent');
    const memStats = this.getMetricStats('system.memory_usage_percent');
    const heapStats = this.getMetricStats('process.heap_used_mb');
    const heapTotalStats = this.getMetricStats('process.heap_total_mb');

    const cpu = cpuStats?.avg || 0;
    const memory = memStats?.avg || 0;
    const heap = heapStats && heapTotalStats
      ? (heapStats.avg / heapTotalStats.avg) * 100
      : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (cpu > 80 || memory > 80 || heap > 90) {
      status = 'unhealthy';
    } else if (cpu > 60 || memory > 60 || heap > 75) {
      status = 'degraded';
    }

    return {
      status,
      uptime: (Date.now() - this.startTime) / 1000,
      cpu,
      memory,
      heap,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.logger.log('Performance metrics reset');
  }
}

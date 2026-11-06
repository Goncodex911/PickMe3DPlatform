const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * In-memory Asynchronous Job Queue for Background 3D Blueprint Processing (Story 5.2)
 * Compatible with distributed message queues (BullMQ/Redis/RabbitMQ).
 */
class BlueprintJobQueue extends EventEmitter {
  constructor() {
    super();
    /** Map<jobId, JobObject> */
    this.jobs = new Map();
    this.maxCompletedJobs = 500;
  }

  /**
   * Enqueue a new 3D reconstruction / render task
   * @param {string} type - e.g. "blueprint_to_3d"
   * @param {Object} payload - input blueprint image, dimensions, preferences
   * @returns {Object} created job
   */
  createJob(type, payload = {}) {
    const jobId = `job_bp_${crypto.randomBytes(8).toString('hex')}`;
    const job = {
      id: jobId,
      type,
      status: 'queued', // 'queued' | 'processing' | 'completed' | 'failed'
      progress: 0,
      stage: 'Hàng đợi xử lý',
      payload,
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, job);
    this.emit('job:created', job);

    // Auto prune old jobs
    if (this.jobs.size > this.maxCompletedJobs) {
      const firstKey = this.jobs.keys().next().value;
      this.jobs.delete(firstKey);
    }

    return job;
  }

  /**
   * Get job by ID
   * @param {string} jobId
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Update job progress
   * @param {string} jobId
   * @param {number} progress - 0 to 100
   * @param {string} stage - Human-readable stage description
   * @param {Object} [meta]
   */
  updateProgress(jobId, progress, stage, meta = {}) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.status = progress >= 100 ? 'completed' : 'processing';
    job.progress = Math.min(100, Math.max(0, progress));
    if (stage) job.stage = stage;
    job.updatedAt = new Date().toISOString();
    Object.assign(job, meta);

    this.emit(`progress:${jobId}`, job);
    this.emit('job:progress', job);
    return job;
  }

  /**
   * Mark job as completed
   * @param {string} jobId
   * @param {Object} result - e.g. { glbUrl, roomsCount, layoutData }
   */
  completeJob(jobId, result) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.status = 'completed';
    job.progress = 100;
    job.stage = 'Hoàn thành dựng 3D';
    job.result = result;
    job.updatedAt = new Date().toISOString();

    this.emit(`completed:${jobId}`, job);
    this.emit('job:completed', job);
    return job;
  }

  /**
   * Mark job as failed
   * @param {string} jobId
   * @param {string|Error} err
   */
  failJob(jobId, err) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.status = 'failed';
    job.stage = 'Lỗi xử lý';
    job.error = typeof err === 'string' ? err : err.message;
    job.updatedAt = new Date().toISOString();

    this.emit(`failed:${jobId}`, job);
    this.emit('job:failed', job);
    return job;
  }

  /**
   * Start executing a job asynchronously in the background
   * @param {string} jobId
   * @param {Function} processor - async (job, updateProgress) => result
   */
  async processJob(jobId, processor) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    this.updateProgress(jobId, 5, 'Khởi động tiến trình xử lý bản vẽ ngầm...');

    // Run in next tick so request returns immediately with 202 Accepted
    setImmediate(async () => {
      try {
        const update = (pct, stg) => this.updateProgress(jobId, pct, stg);
        const result = await processor(job, update);
        this.completeJob(jobId, result);
      } catch (err) {
        console.error(`[BlueprintJobQueue] Job ${jobId} failed:`, err);
        this.failJob(jobId, err);
      }
    });
  }
}

// Singleton instance
const blueprintJobQueue = new BlueprintJobQueue();

module.exports = blueprintJobQueue;


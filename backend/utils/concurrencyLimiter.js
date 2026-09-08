/**
 * concurrencyLimiter.js
 * 
 * Utility to run an array of promise-returning tasks with capped concurrency.
 */

/**
 * Run task functions with a maximum concurrency limit.
 * @param {Array<() => Promise<any>>} taskFns Array of functions that return a Promise
 * @param {number} limit Maximum concurrent executions (default 3)
 * @returns {Promise<Array<{status: 'fulfilled' | 'rejected', value?: any, reason?: any}>>}
 */
export async function runWithConcurrencyLimit(taskFns, limit = 3) {
  if (!taskFns || taskFns.length === 0) return [];

  const results = new Array(taskFns.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < taskFns.length) {
      const currentIndex = nextIndex++;
      try {
        const val = await taskFns[currentIndex]();
        results[currentIndex] = { status: 'fulfilled', value: val };
      } catch (reason) {
        results[currentIndex] = { status: 'rejected', reason };
      }
    }
  }

  const workerCount = Math.min(limit, taskFns.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

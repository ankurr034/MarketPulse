import cron from 'node-cron';

class BackgroundWorker {
  constructor() {
    this.jobs = [];
  }

  start() {
    console.log('Starting Background Worker...');

    // Run every day at 2:00 AM
    this.jobs.push(
      cron.schedule('0 2 * * *', async () => {
        console.log('Running daily data sync job...');
        try {
          await this.syncDailyData();
        } catch (err) {
          console.error('Error in daily data sync job:', err.message);
        }
      })
    );
  }

  stop() {
    console.log('Stopping Background Worker...');
    this.jobs.forEach(job => job.stop());
  }

  async syncDailyData() {
    // This function will pull the latest NAVs, Macro data, and update MongoDB/Cache.
    // To be implemented in Phase 3/4.
    console.log('Daily sync complete.');
  }
}

export default new BackgroundWorker();

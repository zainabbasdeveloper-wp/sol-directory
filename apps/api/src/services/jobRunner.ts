import { connectDB } from '../config/db.js';
import JobRun from '../models/JobRun.js';

/**
 * Wraps a cron script: connects to the database, records the run (start, finish, one-line summary, any error) so the
 * admin dashboard can show it, then exits the process. `work` returns the one-line summary to store and print.
 */
export async function runJob(name: string, work: () => Promise<string>): Promise<never> {
  const started = Date.now();
  let runId: unknown;
  try {
    await connectDB();
    // Recording must never stop the job itself from running.
    runId = (await JobRun.create({ name, startedAt: new Date(started), status: 'running' }).catch(() => null))?._id;
    const summary = await work();
    console.log(`[${name}] ${summary}`);
    if (runId) await JobRun.updateOne({ _id: runId }, { status: 'ok', finishedAt: new Date(), durationMs: Date.now() - started, summary }).catch(() => {});
    process.exit(0);
  } catch (err) {
    console.error(`[${name}] Fatal error:`, err);
    if (runId) await JobRun.updateOne({ _id: runId }, { status: 'failed', finishedAt: new Date(), durationMs: Date.now() - started, error: String((err as Error)?.message ?? err).slice(0, 500) }).catch(() => {});
    process.exit(1);
  }
}

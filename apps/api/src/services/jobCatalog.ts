/**
 * The scheduled jobs the site expects to be running, with how often. The admin dashboard compares this list with the
 * JobRun history to say whether each one is on time, overdue or has never run.
 */
export interface JobDefinition {
  name: string;
  label: string;
  description: string;
  /** Plain-words schedule shown to the admin. */
  schedule: string;
  /** The crontab time fields, for copy-paste. */
  cron: string;
  /** npm script to run from the repository root. */
  command: string;
  /** How often it should run; a job is "overdue" once it has been quiet for 2.5× this. */
  everyHours: number;
}

export const JOB_CATALOG: JobDefinition[] = [
  {
    name: 'lead-followups',
    label: 'Enquiry follow-up emails',
    description: 'Weekly "your matches" emails to people nobody has answered, and 48-hour reminders to providers with unopened enquiries.',
    schedule: 'Every day, 9:00am',
    cron: '0 9 * * *',
    command: 'npm run job:lead-followups -w apps/api',
    everyHours: 24,
  },
  {
    name: 'lead-escalation',
    label: 'Unviewed enquiry escalation',
    description: 'Offers enquiries nobody has opened to the next-best providers.',
    schedule: 'Every 30 minutes',
    cron: '*/30 * * * *',
    command: 'npm run job:lead-escalation -w apps/api',
    everyHours: 0.5,
  },
  {
    name: 'search-alerts',
    label: 'Saved search alerts',
    description: 'Emails people who saved a search when new providers match it.',
    schedule: 'Every day, 7:00am',
    cron: '0 7 * * *',
    command: 'npm run job:search-alerts -w apps/api',
    everyHours: 24,
  },
  {
    name: 'capacity-check',
    label: 'Weekly capacity confirmation',
    description: 'Asks every active provider to confirm they still take referrals and pauses those who never answer.',
    schedule: 'Every Monday, 8:00am',
    cron: '0 8 * * 1',
    command: 'npm run job:capacity-check -w apps/api',
    everyHours: 168,
  },
  {
    name: 'ndis-news-monitor',
    label: 'NDIS source update monitor',
    description: 'Checks official NDIS news and recent policy pages, then creates private editorial briefs for new or updated sources.',
    schedule: 'Every hour',
    cron: '0 * * * *',
    command: 'npm run job:ndis-news-monitor -w apps/api',
    everyHours: 1,
  },
];

export type JobHealth = 'ok' | 'running' | 'failed' | 'overdue' | 'never_run';

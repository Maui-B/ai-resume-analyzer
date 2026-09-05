import { describe, it, expect } from 'vitest';
import { createJob, getJob } from './jobs.service';

describe('Job Service', () => {
  it('should create a job successfully', async () => {
    const job = await createJob({ title: 'Test Job', description: 'Test description' });
    expect(job).toHaveProperty('id');
  });

  it('should get a job by ID', async () => {
    const job = await getJob('test-id');
    expect(job).toBeDefined();
  });
});
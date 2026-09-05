import { describe, it, expect } from 'vitest';
import { createApplication, getApplication } from './applications.service';

describe('Application Service', () => {
  it('should create an application successfully', async () => {
    const application = await createApplication({ jobId: 'test-job', resumeId: 'test-resume' });
    expect(application).toHaveProperty('id');
  });

  it('should get an application by ID', async () => {
    const application = await getApplication('test-id');
    expect(application).toBeDefined();
  });
});
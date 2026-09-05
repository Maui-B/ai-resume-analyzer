import { describe, it, expect } from 'vitest';
import { createResume, getResume } from './resume.service';

describe('Resume Service', () => {
  it('should create a resume successfully', async () => {
    const resume = await createResume({ title: 'Test Resume', content: 'Test content' });
    expect(resume).toHaveProperty('id');
  });

  it('should get a resume by ID', async () => {
    const resume = await getResume('test-id');
    expect(resume).toBeDefined();
  });
});
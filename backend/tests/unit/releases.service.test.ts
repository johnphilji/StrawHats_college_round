import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({ isPrismaConfigured: vi.fn(() => true) }));
vi.mock('../../src/modules/releases/releases.repository', () => ({
  releasesRepository: { findOwnedProject: vi.fn(), create: vi.fn(), list: vi.fn(), findById: vi.fn(), updateStatus: vi.fn() },
}));

import { releasesRepository } from '../../src/modules/releases/releases.repository';
import { releasesService } from '../../src/modules/releases/releases.service';

describe('releasesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(releasesRepository.findOwnedProject).mockResolvedValue({ id: 'project-1' } as never);
  });

  it('creates release records only when the owned-project repository verifies an approved generated patch', async () => {
    vi.mocked(releasesRepository.create).mockResolvedValue({ id: 'release-1', status: 'PENDING' } as never);
    await expect(releasesService.create('project-1', 'owner-1', { patchId: 'patch-1' })).resolves.toMatchObject({ status: 'PENDING' });
    expect(releasesRepository.create).toHaveBeenCalledWith('project-1', 'owner-1', { patchId: 'patch-1' });
    vi.mocked(releasesRepository.create).mockResolvedValue(null as never);
    await expect(releasesService.create('project-1', 'owner-1', { patchId: 'draft-patch' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('denies another user access and rejects stale trusted status updates', async () => {
    vi.mocked(releasesRepository.findOwnedProject).mockResolvedValue(null);
    await expect(releasesService.list('project-1', 'other-user', 1, 20)).rejects.toMatchObject({ statusCode: 404 });
    vi.mocked(releasesRepository.updateStatus).mockResolvedValue(null);
    await expect(releasesService.updateStatus('release-1', { status: 'MERGED', commitSha: 'a'.repeat(40) })).rejects.toMatchObject({ statusCode: 409 });
  });
});

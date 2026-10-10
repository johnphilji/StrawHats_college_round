import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({ isPrismaConfigured: vi.fn(() => true) }));
vi.mock('../../src/modules/deployments/deployments.repository', () => ({
  deploymentsRepository: { findOwnedProject: vi.fn(), findRelease: vi.fn(), create: vi.fn(), list: vi.fn(), findById: vi.fn(), updateStatus: vi.fn() },
}));

import { deploymentsRepository } from '../../src/modules/deployments/deployments.repository';
import { deploymentsService } from '../../src/modules/deployments/deployments.service';

describe('deploymentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deploymentsRepository.findOwnedProject).mockResolvedValue({ id: 'project-1' } as never);
  });

  it('records only a tracking attempt after owner and release checks', async () => {
    vi.mocked(deploymentsRepository.findRelease).mockResolvedValue({ id: 'release-1' } as never);
    vi.mocked(deploymentsRepository.create).mockResolvedValue({ id: 'deployment-1', status: 'QUEUED' } as never);
    await expect(deploymentsService.create('project-1', 'owner-1', { environment: 'PREVIEW', releaseId: 'release-1' })).resolves.toMatchObject({ status: 'QUEUED' });
    expect(deploymentsRepository.create).toHaveBeenCalledOnce();
  });

  it('rejects inaccessible projects and releases', async () => {
    vi.mocked(deploymentsRepository.findOwnedProject).mockResolvedValue(null);
    await expect(deploymentsService.create('project-1', 'other-user', { environment: 'PREVIEW' })).rejects.toMatchObject({ statusCode: 404 });
    expect(deploymentsRepository.create).not.toHaveBeenCalled();
    vi.mocked(deploymentsRepository.findOwnedProject).mockResolvedValue({ id: 'project-1' } as never);
    vi.mocked(deploymentsRepository.findRelease).mockResolvedValue(null);
    await expect(deploymentsService.create('project-1', 'owner-1', { environment: 'PRODUCTION', releaseId: 'other-release' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('uses bounded deterministic pagination and rejects stale provider updates', async () => {
    vi.mocked(deploymentsRepository.list).mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }] as never);
    await expect(deploymentsService.list('project-1', 'owner-1', 2, 2)).resolves.toMatchObject({ items: [{ id: 'a' }, { id: 'b' }], page: 2, limit: 2, hasMore: true });
    expect(deploymentsRepository.list).toHaveBeenCalledWith('project-1', 2, 3);
    vi.mocked(deploymentsRepository.updateStatus).mockResolvedValue(null);
    await expect(deploymentsService.updateStatus('deployment-1', { status: 'READY', deploymentUrl: 'https://example.test' })).rejects.toMatchObject({ statusCode: 409 });
  });
});

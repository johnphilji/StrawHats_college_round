import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({ isPrismaConfigured: vi.fn(() => true) }));
vi.mock('../../src/modules/patches/patches.repository', () => ({
  patchesRepository: {
    findOwnedProject: vi.fn(), create: vi.fn(), list: vi.fn(), findById: vi.fn(), updateStatus: vi.fn(),
  },
}));

import { patchesRepository } from '../../src/modules/patches/patches.repository';
import { patchesService } from '../../src/modules/patches/patches.service';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'patch-1', projectId: 'project-1', status: 'DRAFT', ...overrides,
});

describe('patchesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(patchesRepository.findOwnedProject).mockResolvedValue({ id: 'project-1' } as never);
  });

  it('creates a patch only after confirming project ownership', async () => {
    vi.mocked(patchesRepository.create).mockResolvedValue(row() as never);
    const patch = await patchesService.create({ projectId: 'project-1', prompt: 'Make it blue', createdBy: 'user-1' });
    expect(patch.id).toBe('patch-1');
    expect(patchesRepository.findOwnedProject).toHaveBeenCalledWith('project-1', 'user-1');
  });

  it('returns not found for a project the user does not own', async () => {
    vi.mocked(patchesRepository.findOwnedProject).mockResolvedValue(null);
    await expect(patchesService.list('project-1', 'other-user')).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(patchesRepository.list).not.toHaveBeenCalled();
  });

  it('returns not found when the patch is missing or outside the requested project', async () => {
    vi.mocked(patchesRepository.findById).mockResolvedValue(null);
    await expect(patchesService.get('project-1', 'guessed-id', 'user-1')).rejects.toMatchObject({ statusCode: 404 });
    expect(patchesRepository.findById).toHaveBeenCalledWith('project-1', 'guessed-id');
  });

  it('does not look up a patch when its project is not owned by the requester', async () => {
    vi.mocked(patchesRepository.findOwnedProject).mockResolvedValue(null);
    await expect(patchesService.get('other-project', 'patch-1', 'user-1')).rejects.toMatchObject({ statusCode: 404 });
    expect(patchesRepository.findById).not.toHaveBeenCalled();
  });

  it('allows an explicit transition and rejects skipped workflow states', async () => {
    vi.mocked(patchesRepository.findById).mockResolvedValue(row() as never);
    vi.mocked(patchesRepository.updateStatus).mockResolvedValue(row({ status: 'GENERATING' }) as never);
    await expect(patchesService.updateStatus('project-1', 'patch-1', 'user-1', 'GENERATING')).resolves.toMatchObject({ status: 'GENERATING' });
    await expect(patchesService.updateStatus('project-1', 'patch-1', 'user-1', 'APPROVED')).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });
});

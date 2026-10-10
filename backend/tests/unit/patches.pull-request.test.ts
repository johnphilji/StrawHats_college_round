import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({ isPrismaConfigured: vi.fn(() => true) }));
vi.mock('../../src/modules/patches/patches.repository', () => ({
  patchesRepository: {
    findOwnedProject: vi.fn(),
    findById: vi.fn(),
    recordPullRequest: vi.fn(),
  },
}));
vi.mock('../../src/services/github-app.service', () => ({
  githubAppService: { createPullRequest: vi.fn() },
}));

import { patchesRepository } from '../../src/modules/patches/patches.repository';
import { patchesService } from '../../src/modules/patches/patches.service';
import { githubAppService } from '../../src/services/github-app.service';

const user = {
  id: 'user-1',
  app_metadata: { patchwork_github_installation_id: 91 },
};
const generationId = 'b87e8488-986c-4c06-bd12-bcc2fc49d928';
const patch = {
  id: 'patch-1',
  projectId: 'project-1',
  prompt: 'Update the hero',
  summary: 'Refresh the hero title',
  status: 'APPROVED',
  branchName: 'patchwork/hero-heading-abc123',
  baseCommitSha: 'a'.repeat(40),
  headCommitSha: 'b'.repeat(40),
  pullRequestNumber: null,
  pullRequestUrl: null,
  validationDetails: { workflow: { generationId } },
};

describe('patchesService.createPullRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(patchesRepository.findOwnedProject).mockResolvedValue({
      id: 'project-1', repositoryIdentifier: '12345', productionBranch: 'main',
    } as never);
    vi.mocked(patchesRepository.findById).mockResolvedValue(patch as never);
    vi.mocked(githubAppService.createPullRequest).mockResolvedValue({
      number: 14,
      url: 'https://github.com/acme/site/pull/14',
      state: 'open',
      created: true,
    } as never);
    vi.mocked(patchesRepository.recordPullRequest).mockResolvedValue({
      ...patch, pullRequestNumber: 14, pullRequestUrl: 'https://github.com/acme/site/pull/14',
    } as never);
  });

  it('uses the authenticated installation, approved patch branch, and stores PR metadata', async () => {
    const result = await patchesService.createPullRequest('project-1', 'patch-1', user as never);

    expect(githubAppService.createPullRequest).toHaveBeenCalledWith(user, '12345', expect.objectContaining({
      branchName: patch.branchName,
      baseBranch: 'main',
      idempotencyKey: generationId,
      title: 'Refresh the hero title',
    }));
    expect(patchesRepository.recordPullRequest).toHaveBeenCalledWith('project-1', 'patch-1', 'user-1', generationId, {
      number: 14,
      url: 'https://github.com/acme/site/pull/14',
    });
    expect(result.patch).toMatchObject({ pullRequestNumber: 14 });
  });

  it('refuses to create a PR before patch approval', async () => {
    vi.mocked(patchesRepository.findById).mockResolvedValue({ ...patch, status: 'GENERATED' } as never);

    await expect(patchesService.createPullRequest('project-1', 'patch-1', user as never))
      .rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(githubAppService.createPullRequest).not.toHaveBeenCalled();
  });
});

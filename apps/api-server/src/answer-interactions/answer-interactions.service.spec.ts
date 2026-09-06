import type { SettingsService } from '../settings/settings.service';
import type { SettingsRecord } from '../settings/settings.repository';
import type { AnswerInteractionsRepository } from './answer-interactions.repository';
import { AnswerInteractionsService } from './answer-interactions.service';

function makeSettings(overrides: Partial<SettingsRecord> = {}): SettingsRecord {
  return {
    id: 1,
    queueFreshnessHours: 60,
    queueReplyCap: 5,
    guestReplyLimit: 5,
    nicknameCooldownDays: 7,
    updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
  };
}

describe('AnswerInteractionsService', () => {
  let repository: jest.Mocked<AnswerInteractionsRepository>;
  let settingsService: jest.Mocked<SettingsService>;
  let service: AnswerInteractionsService;

  beforeEach(() => {
    repository = {
      upsertMemberSkip: jest.fn(),
      upsertGuestSkip: jest.fn(),
      upsertMemberHold: jest.fn(),
      findHeldForAuthor: jest.fn(),
      deleteForViewer: jest.fn(),
    } as unknown as jest.Mocked<AnswerInteractionsRepository>;
    settingsService = {
      get: jest.fn().mockResolvedValue(makeSettings()),
    } as unknown as jest.Mocked<SettingsService>;

    service = new AnswerInteractionsService(repository, settingsService);
  });

  describe('skip', () => {
    it('upserts a member skip when logged in', async () => {
      await service.skip('request-1', 'user-1', 'unused-guest-id');

      expect(repository.upsertMemberSkip).toHaveBeenCalledWith(
        'request-1',
        'user-1',
      );
      expect(repository.upsertGuestSkip).not.toHaveBeenCalled();
    });

    it('upserts a guest skip when not logged in', async () => {
      await service.skip('request-1', undefined, 'guest-1');

      expect(repository.upsertGuestSkip).toHaveBeenCalledWith(
        'request-1',
        'guest-1',
      );
      expect(repository.upsertMemberSkip).not.toHaveBeenCalled();
    });
  });

  describe('hold', () => {
    it('upserts a member hold', async () => {
      await service.hold('request-1', 'user-1');

      expect(repository.upsertMemberHold).toHaveBeenCalledWith(
        'request-1',
        'user-1',
      );
    });
  });

  describe('findHeldForAuthor', () => {
    it('reads freshnessHours from settings and passes it to the repository', async () => {
      settingsService.get.mockResolvedValue(
        makeSettings({ queueFreshnessHours: 24 }),
      );

      await service.findHeldForAuthor('user-1');

      expect(repository.findHeldForAuthor).toHaveBeenCalledWith('user-1', 24);
    });
  });

  describe('clearForViewer', () => {
    it('delegates to the repository', async () => {
      await service.clearForViewer('request-1', 'user-1', undefined);

      expect(repository.deleteForViewer).toHaveBeenCalledWith(
        'request-1',
        'user-1',
        undefined,
      );
    });
  });
});

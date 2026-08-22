import type { AnswerInteractionsRepository } from './answer-interactions.repository';
import { AnswerInteractionsService } from './answer-interactions.service';

describe('AnswerInteractionsService', () => {
  let repository: jest.Mocked<AnswerInteractionsRepository>;
  let service: AnswerInteractionsService;

  beforeEach(() => {
    repository = {
      upsertMemberSkip: jest.fn(),
      upsertGuestSkip: jest.fn(),
      upsertMemberHold: jest.fn(),
      findHeldForAuthor: jest.fn(),
      deleteForViewer: jest.fn(),
    } as unknown as jest.Mocked<AnswerInteractionsRepository>;

    service = new AnswerInteractionsService(repository);
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

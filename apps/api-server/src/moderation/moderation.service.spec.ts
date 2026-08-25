import type { RepliesService } from '../replies/replies.service';
import type { RequestsService } from '../requests/requests.service';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  let requestsService: jest.Mocked<RequestsService>;
  let repliesService: jest.Mocked<RepliesService>;
  let moderationService: ModerationService;

  beforeEach(() => {
    requestsService = {
      hide: jest.fn(),
    } as unknown as jest.Mocked<RequestsService>;
    repliesService = {
      hide: jest.fn(),
    } as unknown as jest.Mocked<RepliesService>;
    moderationService = new ModerationService(requestsService, repliesService);
  });

  describe('evaluateAutoHide', () => {
    it('does nothing below the 3-distinct-reporter threshold', async () => {
      await moderationService.evaluateAutoHide('request', 'request-1', 2);

      expect(requestsService.hide).not.toHaveBeenCalled();
      expect(repliesService.hide).not.toHaveBeenCalled();
    });

    it('hides the request once 3 distinct reporters are reached', async () => {
      await moderationService.evaluateAutoHide('request', 'request-1', 3);

      expect(requestsService.hide).toHaveBeenCalledWith('request-1');
      expect(repliesService.hide).not.toHaveBeenCalled();
    });

    it('hides the reply once 3 distinct reporters are reached', async () => {
      await moderationService.evaluateAutoHide('reply', 'reply-1', 3);

      expect(repliesService.hide).toHaveBeenCalledWith('reply-1');
      expect(requestsService.hide).not.toHaveBeenCalled();
    });

    it('still hides above the threshold', async () => {
      await moderationService.evaluateAutoHide('request', 'request-1', 5);

      expect(requestsService.hide).toHaveBeenCalledWith('request-1');
    });
  });
});

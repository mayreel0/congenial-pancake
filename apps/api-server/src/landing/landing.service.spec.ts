import type { LandingRepository } from './landing.repository';
import { LandingService } from './landing.service';

function makeRepository(
  overrides: Partial<LandingRepository> = {},
): LandingRepository {
  return {
    countRequests: jest
      .fn()
      .mockResolvedValue({ today: 0, month: 0, total: 0 }),
    countReplies: jest.fn().mockResolvedValue({ today: 0, month: 0, total: 0 }),
    countWaitingForReply: jest.fn().mockResolvedValue(0),
    findSampleExchanges: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as LandingRepository;
}

describe('LandingService', () => {
  describe('getSamples', () => {
    it('defaults to 6 when no limit is given', async () => {
      const findSampleExchanges = jest.fn().mockResolvedValue([]);
      const service = new LandingService(
        makeRepository({ findSampleExchanges }),
      );

      await service.getSamples(undefined);

      expect(findSampleExchanges).toHaveBeenCalledWith(6);
    });

    it('clamps a requested limit above the max down to 10', async () => {
      const findSampleExchanges = jest.fn().mockResolvedValue([]);
      const service = new LandingService(
        makeRepository({ findSampleExchanges }),
      );

      await service.getSamples(999);

      expect(findSampleExchanges).toHaveBeenCalledWith(10);
    });

    it('clamps a requested limit below 1 up to 1', async () => {
      const findSampleExchanges = jest.fn().mockResolvedValue([]);
      const service = new LandingService(
        makeRepository({ findSampleExchanges }),
      );

      await service.getSamples(0);

      expect(findSampleExchanges).toHaveBeenCalledWith(1);
    });

    it('falls back to the default for a non-finite value (e.g. a malformed query param)', async () => {
      const findSampleExchanges = jest.fn().mockResolvedValue([]);
      const service = new LandingService(
        makeRepository({ findSampleExchanges }),
      );

      await service.getSamples(NaN);

      expect(findSampleExchanges).toHaveBeenCalledWith(6);
    });

    it('maps repository rows into ISO date strings', async () => {
      const service = new LandingService(
        makeRepository({
          findSampleExchanges: jest.fn().mockResolvedValue([
            {
              request: {
                body: '요청 본문',
                createdAt: new Date('2026-09-01T00:00:00.000Z'),
              },
              reply: {
                body: '답장 본문',
                createdAt: new Date('2026-09-01T01:00:00.000Z'),
              },
            },
          ]),
        }),
      );

      const result = await service.getSamples(1);

      expect(result).toEqual({
        samples: [
          {
            request: {
              body: '요청 본문',
              createdAt: '2026-09-01T00:00:00.000Z',
            },
            reply: { body: '답장 본문', createdAt: '2026-09-01T01:00:00.000Z' },
          },
        ],
      });
    });
  });
});

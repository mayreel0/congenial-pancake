import { nicknameDiscriminator } from './nickname-discriminator';

describe('nicknameDiscriminator', () => {
  it('is the last 4 hex characters of the id, uppercased, with dashes removed', () => {
    expect(nicknameDiscriminator('f8b3cf41-d4ee-4bce-9d5d-425fb33ac376')).toBe(
      'C376',
    );
  });

  it('is deterministic for the same id', () => {
    const id = '11111111-2222-3333-4444-555555555555';
    expect(nicknameDiscriminator(id)).toBe(nicknameDiscriminator(id));
  });

  it('differs for different ids (in the general case)', () => {
    expect(
      nicknameDiscriminator('aaaaaaaa-0000-0000-0000-000000000001'),
    ).not.toBe(nicknameDiscriminator('bbbbbbbb-0000-0000-0000-000000000002'));
  });
});

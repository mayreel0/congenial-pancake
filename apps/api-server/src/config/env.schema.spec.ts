import { validateEnv } from './env.schema';

const localEnv = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgres://user:password@localhost:5432/development',
  CORS_ORIGIN: 'http://localhost:3000,http://localhost:3002',
  API_PUBLIC_URL: 'http://localhost:8080',
  WEB_PUBLIC_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'test-client',
  GOOGLE_CLIENT_SECRET: 'test-secret',
};

describe('VPN development environment', () => {
  it('preserves the existing desktop configuration without opting in', () => {
    const env = validateEnv(localEnv);
    expect(env.DEV_VPN_HOST).toBeUndefined();
    expect(env.API_PUBLIC_URL).toBe(localEnv.API_PUBLIC_URL);
    expect(env.CORS_ORIGIN).toEqual(localEnv.CORS_ORIGIN.split(','));
  });

  it('uses web proxy callbacks and permits both VPN frontend origins', () => {
    const env = validateEnv({ ...localEnv, DEV_VPN_HOST: '192.168.50.10' });
    expect(env.API_PUBLIC_URL).toBe('http://192.168.50.10:3000/api');
    expect(env.WEB_PUBLIC_URL).toBe('http://192.168.50.10:3000');
    expect(env.CORS_ORIGIN).toEqual([
      'http://localhost:3000',
      'http://localhost:3002',
      'http://192.168.50.10:3000',
      'http://192.168.50.10:3002',
    ]);
  });

  it.each([
    { NODE_ENV: 'production' },
    { PORT: 8082 },
    { DEV_VPN_HOST: '203.0.113.10' },
    { DEV_VPN_HOST: '100.63.255.255' },
    { DEV_VPN_HOST: '100.128.0.0' },
    { DEV_VPN_ADDITIONAL_HOSTS: '203.0.113.10' },
    { DEV_VPN_ADDITIONAL_HOSTS: '100.128.0.0' },
    { DEV_VPN_ADDITIONAL_HOSTS: '10.0.0.10,' },
    { DATABASE_URL: 'postgres://user:password@db.example.com:5432/production' },
  ])('rejects incompatible VPN settings: %j', (overrides) => {
    expect(() =>
      validateEnv({ ...localEnv, DEV_VPN_HOST: '192.168.50.10', ...overrides }),
    ).toThrow();
  });

  it('permits explicit LAN and Tailscale origins while keeping one callback host', () => {
    const env = validateEnv({
      ...localEnv,
      DEV_VPN_HOST: '100.64.0.1',
      DEV_VPN_ADDITIONAL_HOSTS: ' 192.168.50.10,100.127.255.254,100.64.0.1 ',
    });
    expect(env.CORS_ORIGIN).toEqual([
      'http://localhost:3000',
      'http://localhost:3002',
      'http://100.64.0.1:3000',
      'http://100.64.0.1:3002',
      'http://192.168.50.10:3000',
      'http://192.168.50.10:3002',
      'http://100.127.255.254:3000',
      'http://100.127.255.254:3002',
    ]);
    expect(env.API_PUBLIC_URL).toBe('http://100.64.0.1:3000/api');
    expect(env.WEB_PUBLIC_URL).toBe('http://100.64.0.1:3000');
  });

  it('requires the primary host when additional hosts are supplied', () => {
    expect(() =>
      validateEnv({
        ...localEnv,
        DEV_VPN_ADDITIONAL_HOSTS: '100.64.0.1',
      }),
    ).toThrow('DEV_VPN_ADDITIONAL_HOSTS requires DEV_VPN_HOST');
  });
});

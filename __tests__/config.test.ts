describe('Config Utils: getProxyUrl', () => {
  const originalEnv = process.env.PROXY_URL;

  afterEach(() => {
    process.env.PROXY_URL = originalEnv;
    jest.resetModules();
  });

  it('returns default when PROXY_URL is not set', async () => {
    process.env.PROXY_URL = undefined as any;
    jest.resetModules();
    const { getProxyUrl } = await import('../src/utils/config');
    expect(getProxyUrl()).toBe('http://localhost:9432/proxy');
  });

  it('strips trailing slash from PROXY_URL', async () => {
    process.env.PROXY_URL = 'http://example.com/proxy/';
    jest.resetModules();
    const { getProxyUrl } = await import('../src/utils/config');
    expect(getProxyUrl()).toBe('http://example.com/proxy');
  });

  it('returns custom PROXY_URL without trailing slash', async () => {
    process.env.PROXY_URL = 'https://proxy.local/path';
    jest.resetModules();
    const { getProxyUrl } = await import('../src/utils/config');
    expect(getProxyUrl()).toBe('https://proxy.local/path');
  });

  it('empty PROXY_URL falls back to default', async () => {
    process.env.PROXY_URL = '';
    jest.resetModules();
    const { getProxyUrl } = await import('../src/utils/config');
    expect(getProxyUrl()).toBe('http://localhost:9432/proxy');
  });
});

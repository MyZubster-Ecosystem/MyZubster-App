jest.mock('expo-constants', () => ({
  expoConfig: { extra: { trustedTorGatewayUrls: [] } },
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {},
  API_URL: 'https://gateway.example/api',
  applyGatewayTransport: jest.fn(),
  setGatewayTransportFailureHandler: jest.fn(),
}));

import {
  DIRECT_MODE,
  TOR_MODE,
  createGatewayTransportController,
  normalizeTrustedTorEndpoints,
  redactTransportDiagnostic,
} from '../services/gatewayTransportService';

describe('trusted Gateway transport controller', () => {
  test('defaults to direct HTTPS and requires explicit Tor opt-in', () => {
    const controller = createGatewayTransportController({
      directEndpoint: 'https://gateway.example/api',
      torEndpoints: [],
      apply: jest.fn(),
    });

    expect(controller.snapshot()).toMatchObject({
      mode: DIRECT_MODE,
      activeEndpoint: 'https://gateway.example/api',
      trustedEndpointCount: 0,
    });
  });

  test('rejects untrusted, credential-bearing and non-onion Tor endpoints', () => {
    expect(() => normalizeTrustedTorEndpoints(['https://gateway.example/api'])).toThrow(/\.onion/);
    expect(() => normalizeTrustedTorEndpoints(['http://user:secret@gatewayabc.onion/api'])).toThrow(/credentials/);
    expect(() => normalizeTrustedTorEndpoints(['ftp://gatewayabc.onion/api'])).toThrow(/http/);
  });

  test('selects the first healthy trusted endpoint and applies Tor settings', async () => {
    const apply = jest.fn();
    const probe = jest.fn(async endpoint => endpoint.includes('healthy'));
    const controller = createGatewayTransportController({
      directEndpoint: 'https://gateway.example/api',
      torEndpoints: ['http://offline.onion/api', 'http://healthy.onion/api'],
      probe,
      apply,
    });

    await expect(controller.enableTor()).resolves.toMatchObject({
      mode: TOR_MODE,
      activeEndpoint: 'http://healthy.onion/api',
    });
    expect(probe).toHaveBeenCalledTimes(2);
    expect(apply).toHaveBeenLastCalledWith({ mode: TOR_MODE, endpoint: 'http://healthy.onion/api' });
  });

  test('fails closed to direct HTTPS when Tor is unavailable', async () => {
    const apply = jest.fn();
    const controller = createGatewayTransportController({
      directEndpoint: 'https://gateway.example/api',
      torEndpoints: ['http://offline.onion/api'],
      probe: jest.fn(async () => false),
      apply,
    });

    await expect(controller.enableTor()).rejects.toThrow(/health check/);
    expect(controller.snapshot()).toMatchObject({ mode: DIRECT_MODE, activeEndpoint: 'https://gateway.example/api' });
    expect(apply).toHaveBeenLastCalledWith({ mode: DIRECT_MODE, endpoint: 'https://gateway.example/api' });
  });

  test('fails over to another trusted endpoint and can return to direct HTTPS', async () => {
    const apply = jest.fn();
    const healthy = new Set(['http://first.onion/api', 'http://second.onion/api']);
    const controller = createGatewayTransportController({
      directEndpoint: 'https://gateway.example/api',
      torEndpoints: [...healthy],
      probe: jest.fn(async endpoint => healthy.has(endpoint)),
      apply,
    });

    await controller.enableTor();
    healthy.delete('http://first.onion/api');
    await expect(controller.failover()).resolves.toMatchObject({ activeEndpoint: 'http://second.onion/api' });
    expect(controller.useDirect()).toMatchObject({ mode: DIRECT_MODE, activeEndpoint: 'https://gateway.example/api' });
  });

  test('redacts credentials and tokens from diagnostics', () => {
    const message = 'Bearer secret https://user:pass@host.onion/api?token=abc&key=def';
    const redacted = redactTransportDiagnostic(message);
    expect(redacted).not.toContain('secret');
    expect(redacted).not.toContain('user:pass');
    expect(redacted).not.toContain('abc');
    expect(redacted).not.toContain('def');
  });
});

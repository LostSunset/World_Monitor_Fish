import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

describe('WorldMonitor Security Tests', () => {

  describe('H-1: vercel.json CORS', () => {
    it('should not have wildcard CORS on /api/ routes', () => {
      const vercelJson = JSON.parse(readFileSync(join(rootDir, 'vercel.json'), 'utf-8'));
      const headers = vercelJson.headers || [];

      for (const rule of headers) {
        if (rule.source && rule.source.includes('/api/')) {
          for (const header of rule.headers || []) {
            if (header.key === 'Access-Control-Allow-Origin') {
              assert.notEqual(header.value, '*',
                `CORS wildcard found on ${rule.source} — must use runtime CORS check`);
            }
          }
        }
      }
    });
  });

  describe('H-2: CORS localhost restriction', () => {
    it('should not hardcode localhost in production CORS allowlist', () => {
      const corsJs = readFileSync(join(rootDir, 'api', '_cors.js'), 'utf-8');

      // Check that localhost patterns are wrapped in a production conditional
      const localhostPatternIdx = corsJs.indexOf('localhost');
      const productionCheckIdx = corsJs.indexOf("VERCEL_ENV");

      assert.ok(productionCheckIdx !== -1,
        '_cors.js should reference VERCEL_ENV for environment checking');
      assert.ok(productionCheckIdx < localhostPatternIdx,
        'VERCEL_ENV check should appear before localhost patterns');
    });
  });

  describe('H-3: MCP Proxy authentication', () => {
    it('should require API key validation in mcp-proxy.js', () => {
      const mcpProxy = readFileSync(join(rootDir, 'api', 'mcp-proxy.js'), 'utf-8');

      assert.ok(mcpProxy.includes('validateApiKey'),
        'mcp-proxy.js should import and use validateApiKey');
    });
  });

  describe('M-1: Docker Redis token', () => {
    it('should not have default Redis token in docker-compose.yml', () => {
      const dockerCompose = readFileSync(join(rootDir, 'docker-compose.yml'), 'utf-8');

      assert.ok(!dockerCompose.includes('wm-local-token'),
        'docker-compose.yml should not contain default token "wm-local-token"');
    });
  });

  describe('M-2: Rate limit IP header priority', () => {
    it('should not trust x-real-ip as first priority', () => {
      const rateLimitJs = readFileSync(join(rootDir, 'api', '_rate-limit.js'), 'utf-8');

      // x-vercel-forwarded-for or cf-connecting-ip should come before x-real-ip
      const vercelIdx = rateLimitJs.indexOf('x-vercel-forwarded-for');
      const realIpIdx = rateLimitJs.indexOf('x-real-ip');

      if (vercelIdx !== -1 && realIpIdx !== -1) {
        assert.ok(vercelIdx < realIpIdx,
          'x-vercel-forwarded-for should be checked before x-real-ip');
      }
    });
  });

  describe('M-4: Turnstile bypass', () => {
    it('should not default to development mode when VERCEL_ENV is unset', () => {
      const turnstileJs = readFileSync(join(rootDir, 'api', '_turnstile.js'), 'utf-8');

      // Should NOT contain the old pattern: (process.env.VERCEL_ENV ?? 'development')
      assert.ok(!turnstileJs.includes("?? 'development'"),
        'Turnstile should not default to development when VERCEL_ENV is unset');
    });
  });

  describe('L-1: Error response details', () => {
    it('should conditionally include details in relay errors', () => {
      const relayJs = readFileSync(join(rootDir, 'api', '_relay.js'), 'utf-8');

      assert.ok(relayJs.includes('VERCEL_ENV'),
        '_relay.js should check VERCEL_ENV before including error details');
    });
  });

  describe('L-2: Email masking', () => {
    it('should mask email in register-interest.js logs', () => {
      const registerJs = readFileSync(join(rootDir, 'api', 'register-interest.js'), 'utf-8');

      // Should not log raw email
      assert.ok(!registerJs.includes('Email sent to ${email}'),
        'register-interest.js should not log raw email addresses');
    });
  });

  describe('M-6: RSS allowed domains', () => {
    it('should not include rsshub.app in allowed domains', () => {
      const domainsJs = readFileSync(join(rootDir, 'api', '_rss-allowed-domains.js'), 'utf-8');

      assert.ok(!domainsJs.includes("'rsshub.app'") && !domainsJs.includes('"rsshub.app"'),
        'RSS allowed domains should not include rsshub.app (open proxy risk)');
    });
  });
});

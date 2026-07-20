import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Umi OpenAPI configuration', () => {
  it('does not require a local schema during normal dev/test startup', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'config/config.ts'),
      'utf8',
    );
    expect(source).toContain('const hasOpenApiSchema = Boolean(');
    expect(source).toContain('plugins: hasOpenApiSchema ?');
    expect(source).toContain('const openApiConfig = hasOpenApiSchema');
    expect(source).toContain('...openApiConfig');
  });
});

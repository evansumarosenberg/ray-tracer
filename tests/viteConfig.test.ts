import { describe, expect, it } from 'vitest';
import viteConfig from '../vite.config';

describe('vite config', () => {
  it('builds asset URLs for the GitHub Pages repository path', () => {
    expect(viteConfig).toMatchObject({
      base: '/ray-tracer/',
    });
  });
});

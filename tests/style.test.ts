import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('application styles', () => {
  const styles = readFileSync('src/style.css', 'utf8');

  it('keeps the render canvas at the book camera aspect ratio instead of stretching it', () => {
    expect(styles).toContain('aspect-ratio: 16 / 9');
    expect(styles).toContain('width: min(100%, calc(100vh * 16 / 9))');
    expect(styles).toContain('height: auto');
    expect(styles).toContain('justify-self: center');
    expect(styles).toContain('align-self: center');
  });
});

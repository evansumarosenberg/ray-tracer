import { describe, expect, it, vi } from 'vitest';
import { downloadCanvasPng } from '../../src/ui/exportPng';

describe('downloadCanvasPng', () => {
  it('creates a PNG download from the canvas data URL', () => {
    const click = vi.fn();
    const canvas = {
      toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
    } as unknown as HTMLCanvasElement;
    const link = {
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement;

    downloadCanvasPng(canvas, 'render.png', () => link);

    expect(canvas.toDataURL).toHaveBeenCalledWith('image/png');
    expect(link.href).toBe('data:image/png;base64,abc');
    expect(link.download).toBe('render.png');
    expect(click).toHaveBeenCalled();
  });
});

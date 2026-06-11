import { expect, test } from '@playwright/test';

const unsupportedPattern = /required|not supported/i;

type SmokeResult =
  | { state: 'unsupported' }
  | { state: 'error'; message: string }
  | { state: 'rendered'; supported: boolean; nonblank: boolean; maxChannel: number };

test('renders a nonblank WebGL frame', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto('/');

  const canvas = page.locator('#render-canvas');
  const status = page.getByTestId('status');

  await expect(canvas).toBeVisible({ timeout: 3_000 });
  await expect(status).toBeVisible();

  const outcome = await page.waitForFunction(
    (pattern) => {
      const canvas = document.querySelector<HTMLCanvasElement>('#render-canvas');
      const status = document.querySelector<HTMLElement>('[data-testid="status"]');
      const statusText = status?.textContent ?? '';

      if (new RegExp(pattern, 'i').test(statusText)) {
        return { state: 'unsupported' };
      }

      if (statusText.startsWith('Renderer error:')) {
        return { state: 'error', message: statusText };
      }

      if (canvas?.dataset.rendered !== 'true') {
        return false;
      }

      const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });

      if (!gl) {
        return { state: 'rendered', supported: false, nonblank: false, maxChannel: 0 };
      }

      const blockSize = 8;
      const x = Math.max(0, Math.floor(canvas.width / 2 - blockSize / 2));
      const y = Math.max(0, Math.floor(canvas.height / 2 - blockSize / 2));
      const pixels = new Uint8Array(blockSize * blockSize * 4);
      gl.readPixels(x, y, blockSize, blockSize, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let colorTotal = 0;
      let maxChannel = 0;

      for (let index = 0; index < pixels.length; index += 4) {
        colorTotal += pixels[index] + pixels[index + 1] + pixels[index + 2];
        maxChannel = Math.max(maxChannel, pixels[index], pixels[index + 1], pixels[index + 2]);
      }

      return { state: 'rendered', supported: true, nonblank: colorTotal > 0, maxChannel };
    },
    unsupportedPattern.source,
    { timeout: 60_000 },
  );
  const renderState = (await outcome.jsonValue()) as SmokeResult;

  if (renderState.state === 'unsupported') {
    return;
  }

  if (renderState.state !== 'rendered') {
    throw new Error(renderState.message);
  }

  expect(renderState.supported).toBe(true);
  expect(renderState.nonblank).toBe(true);
  expect(renderState.maxChannel).toBeGreaterThan(0);
});

export function downloadCanvasPng(
  canvas: HTMLCanvasElement,
  filename = 'raytracer-render.png',
  createLink: () => HTMLAnchorElement = () => document.createElement('a'),
): void {
  const link = createLink();
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  link.click();
}

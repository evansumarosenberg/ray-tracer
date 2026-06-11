/// <reference types="vite/client" />

import './style.css';

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Missing #app mount point');
}

app.innerHTML = `
  <section class="shell">
    <canvas id="render-canvas" width="960" height="540" aria-label="Ray traced render"></canvas>
    <aside class="controls" aria-label="Render controls">
      <h1>WebGL Raytracer</h1>
      <p data-testid="status">Ready</p>
    </aside>
  </section>
`;

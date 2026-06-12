import { defineConfig } from 'vite';

export default defineConfig({
  base: '/ray-tracer/',
  server: {
    host: '0.0.0.0',
    allowedHosts: ['ray-tracer.exe.xyz'],
    port: 5173,
    strictPort: true,
  },
});

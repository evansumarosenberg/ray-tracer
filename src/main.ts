/// <reference types="vite/client" />

import './style.css';
import { mountApp } from './ui/app';

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Missing #app mount point');
}

mountApp(app);

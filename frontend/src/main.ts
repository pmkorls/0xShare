/**
 * Application entry point
 * Initializes the Svelte application and mounts it to the DOM
 */

import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')!,
});

export default app;

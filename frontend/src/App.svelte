<script lang="ts">
  /**
   * 0xShare Dashboard Component
   *
   * Main application interface for interacting with the decentralized
   * data sharing network. Displays node status, active transfers,
   * and provides controls for file operations.
   */

  import { onMount } from 'svelte';
  import Dashboard from './components/Dashboard.svelte';
  import StatusBar from './components/StatusBar.svelte';

  // Application state
  let isConnected: boolean = false;
  let nodeCount: number = 0;
  let version: string = '0.1.0';

  // Simulated connection to core engine
  // In production, this would interface with the WASM-compiled Rust core
  onMount(() => {
    // Initialize connection to local node
    initializeNode();
  });

  /**
   * Establishes connection to the local 0xShare node.
   * Handles retry logic and connection state management.
   */
  async function initializeNode(): Promise<void> {
    try {
      // Simulated initialization delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      isConnected = true;
      nodeCount = 42; // Would come from network discovery
    } catch (error) {
      console.error('Failed to initialize node:', error);
      isConnected = false;
    }
  }
</script>

<main class="app-container">
  <header class="app-header">
    <div class="logo">
      <span class="logo-icon">◈</span>
      <h1>0xShare</h1>
    </div>
    <StatusBar {isConnected} {nodeCount} {version} />
  </header>

  <section class="content">
    <Dashboard {isConnected} />
  </section>

  <footer class="app-footer">
    <p>Powered by Rust • Built with Svelte</p>
  </footer>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a0f;
    color: #e0e0e0;
  }

  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: linear-gradient(180deg, #12121a 0%, #0a0a0f 100%);
    border-bottom: 1px solid #1a1a2e;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logo-icon {
    font-size: 1.75rem;
    color: #6366f1;
  }

  .logo h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .content {
    flex: 1;
    padding: 2rem;
  }

  .app-footer {
    padding: 1rem 2rem;
    text-align: center;
    border-top: 1px solid #1a1a2e;
    color: #666;
    font-size: 0.875rem;
  }
</style>

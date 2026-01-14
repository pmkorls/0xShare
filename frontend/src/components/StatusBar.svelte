<script lang="ts">
  /**
   * StatusBar Component
   *
   * Displays real-time connection status, peer count, and version info.
   * Updates automatically based on node connection state.
   */

  export let isConnected: boolean;
  export let nodeCount: number;
  export let version: string;

  // Reactive status indicator
  $: statusText = isConnected ? 'Connected' : 'Connecting...';
  $: statusClass = isConnected ? 'status-online' : 'status-offline';
</script>

<div class="status-bar">
  <div class="status-indicator {statusClass}">
    <span class="status-dot"></span>
    <span class="status-text">{statusText}</span>
  </div>

  {#if isConnected}
    <div class="status-info">
      <span class="info-item">
        <span class="info-icon">◉</span>
        {nodeCount} peers
      </span>
      <span class="info-divider">|</span>
      <span class="info-item">v{version}</span>
    </div>
  {/if}
</div>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.875rem;
  }

  .status-indicator.status-online {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .status-indicator.status-offline {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }

  .status-online .status-dot {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .status-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #888;
    font-size: 0.875rem;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .info-icon {
    font-size: 0.625rem;
    color: #6366f1;
  }

  .info-divider {
    color: #333;
  }
</style>

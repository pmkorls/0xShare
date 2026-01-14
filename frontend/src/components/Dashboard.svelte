<script lang="ts">
  /**
   * Dashboard Component
   *
   * Displays the main operational interface including file upload,
   * active transfers, and chunk statistics.
   */

  export let isConnected: boolean;

  // Transfer state management
  interface Transfer {
    id: string;
    name: string;
    size: number;
    progress: number;
    status: 'uploading' | 'downloading' | 'complete' | 'paused';
  }

  let transfers: Transfer[] = [
    { id: 'tx-001', name: 'dataset-v2.tar.gz', size: 2147483648, progress: 67, status: 'uploading' },
    { id: 'tx-002', name: 'model-weights.bin', size: 536870912, progress: 100, status: 'complete' },
    { id: 'tx-003', name: 'config.json', size: 4096, progress: 23, status: 'downloading' },
  ];

  // Statistics for the current session
  let stats = {
    chunksProcessed: 12847,
    bytesTransferred: 3_758_096_384,
    dedupRatio: 0.23,
  };

  /**
   * Formats byte values into human-readable strings
   */
  function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Returns CSS class based on transfer status
   */
  function getStatusClass(status: Transfer['status']): string {
    const classes: Record<string, string> = {
      uploading: 'status-active',
      downloading: 'status-active',
      complete: 'status-complete',
      paused: 'status-paused',
    };
    return classes[status] || '';
  }
</script>

<div class="dashboard">
  <!-- Statistics Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <span class="stat-value">{stats.chunksProcessed.toLocaleString()}</span>
      <span class="stat-label">Chunks Processed</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{formatBytes(stats.bytesTransferred)}</span>
      <span class="stat-label">Data Transferred</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{(stats.dedupRatio * 100).toFixed(1)}%</span>
      <span class="stat-label">Deduplication Savings</span>
    </div>
  </div>

  <!-- Transfer List -->
  <div class="transfers-section">
    <h2>Active Transfers</h2>

    {#if !isConnected}
      <div class="offline-notice">
        <span class="notice-icon">⚠</span>
        <p>Connecting to local node...</p>
      </div>
    {:else}
      <div class="transfer-list">
        {#each transfers as transfer (transfer.id)}
          <div class="transfer-item">
            <div class="transfer-info">
              <span class="transfer-name">{transfer.name}</span>
              <span class="transfer-size">{formatBytes(transfer.size)}</span>
            </div>
            <div class="transfer-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill {getStatusClass(transfer.status)}"
                  style="width: {transfer.progress}%"
                ></div>
              </div>
              <span class="progress-text">{transfer.progress}%</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Upload Zone -->
  <div class="upload-zone" class:disabled={!isConnected}>
    <div class="upload-content">
      <span class="upload-icon">↑</span>
      <p>Drop files here or click to browse</p>
      <span class="upload-hint">Files are chunked and content-addressed automatically</span>
    </div>
  </div>
</div>

<style>
  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: #12121a;
    border: 1px solid #1a1a2e;
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .stat-value {
    font-size: 1.75rem;
    font-weight: 600;
    color: #6366f1;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #888;
  }

  .transfers-section {
    background: #12121a;
    border: 1px solid #1a1a2e;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .transfers-section h2 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 500;
  }

  .transfer-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .transfer-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: #0a0a0f;
    border-radius: 8px;
  }

  .transfer-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .transfer-name {
    font-weight: 500;
  }

  .transfer-size {
    color: #888;
    font-size: 0.875rem;
  }

  .transfer-progress {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .progress-bar {
    flex: 1;
    height: 6px;
    background: #1a1a2e;
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .progress-fill.status-active {
    background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
  }

  .progress-fill.status-complete {
    background: #22c55e;
  }

  .progress-fill.status-paused {
    background: #f59e0b;
  }

  .progress-text {
    font-size: 0.875rem;
    color: #888;
    min-width: 3rem;
    text-align: right;
  }

  .offline-notice {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #1a1a0f;
    border: 1px solid #3d3d00;
    border-radius: 8px;
  }

  .notice-icon {
    font-size: 1.25rem;
  }

  .offline-notice p {
    margin: 0;
    color: #d4d400;
  }

  .upload-zone {
    border: 2px dashed #1a1a2e;
    border-radius: 12px;
    padding: 3rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .upload-zone:hover:not(.disabled) {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.05);
  }

  .upload-zone.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .upload-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .upload-icon {
    font-size: 2rem;
    color: #6366f1;
  }

  .upload-content p {
    margin: 0;
    font-weight: 500;
  }

  .upload-hint {
    font-size: 0.875rem;
    color: #666;
  }
</style>

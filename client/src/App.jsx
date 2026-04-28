import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';

const API_BASE = '/api';

function App() {
  const [marketplaces, setMarketplaces] = useState(['ES']);
  const [asinInput, setAsinInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState(null);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    delay: 500,
    retries: 2,
    language: 'en',
    proxy: 'residential',
    retryOnFailure: true
  });
  const [searchQuery, setSearchQuery] = useState('');

  const runIdRef = useRef(runId);
  const pollRef = useRef(null);

  useEffect(() => {
    runIdRef.current = runId;
  }, [runId]);

  // Derived ASINs from input
  const asins = useMemo(() => {
    return asinInput
      .split(/[\n,]/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);
  }, [asinInput]);

  const validAsins = useMemo(() => asins.filter(asin => /^[A-Z0-9]{10}$/.test(asin)), [asins]);

  useEffect(() => {
    if (runId && isRunning) {
      pollRef.current = setInterval(() => fetchStatus(runId), 2000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runId, isRunning]);

  useEffect(() => {
    if (status) {
      if (status.status === 'COMPLETED' || status.status === 'ERROR') {
        setIsRunning(false);
        if (pollRef.current) clearInterval(pollRef.current);
      }
      if (status.status === 'COMPLETED' && runIdRef.current) {
        fetchResults(runIdRef.current);
      }
    }
  }, [status]);

  const fetchResults = async (id) => {
    try {
      const r = await fetch(`${API_BASE}/scrape/${id}/results`);
      const data = await r.json();
      if (data) {
        setResults(data);
      }
    } catch (err) {
      console.error('Failed to fetch results', err);
    }
  };

  const toggleMarketplace = (mp) => {
    if (marketplaces.includes(mp)) {
      if (marketplaces.length > 1) {
        setMarketplaces(marketplaces.filter((m) => m !== mp));
      }
    } else {
      setMarketplaces([...marketplaces, mp]);
    }
  };

  const startScrape = async () => {
    if (validAsins.length === 0 || marketplaces.length === 0) return;

    setIsRunning(true);
    setStatus(null);
    setResults([]);

    try {
      const res = await fetch(`${API_BASE}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asins: validAsins,
          marketplaces,
          options: settings,
        }),
      });
      const data = await res.json();
      setRunId(data.runId);
    } catch (err) {
      console.error(err);
      setIsRunning(false);
    }
  };

  const fetchStatus = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/scrape/${id}/status`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadCsv = async () => {
    if (!runId) return;
    try {
      const res = await fetch(`${API_BASE}/scrape/${runId}/download`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `amazon_seller_info_${timestamp}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const progressPercent = status ? Math.round((status.processed / status.total) * 100) : 0;

  const filteredResults = useMemo(() => {
    if (!searchQuery) return results;
    const q = searchQuery.toLowerCase();
    return results.filter(r =>
      Object.values(r).some(v => v && v.toString().toLowerCase().includes(q))
    );
  }, [results, searchQuery]);

  // Keep only the latest log entry per ASIN+marketplace (server pushes multiple states)
  const dedupedLogs = useMemo(() => {
    const seen = new Map();
    const reversed = [...(status?.logs || [])].reverse();
    for (const log of reversed) {
      const key = `${log.asin}|${log.marketplace}`;
      if (!seen.has(key)) seen.set(key, log);
    }
    return [...seen.values()];
  }, [status?.logs]);

  return (
    <div className="app">
      {/* ... existing header ... */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="logo-icon">A</div>
          <div className="topbar-title">Amazon Seller Intel</div>
          <div className="topbar-subtitle">Seller Intelligence Extractor</div>
        </div>
        <div className="topbar-right">
          <div className="status-pill">
            <div className={`status-dot ${isRunning ? 'running' : 'ready'}`}></div>
            {isRunning ? 'Running' : 'Ready'}
          </div>
        </div>
      </header>

      {/* --- Main Layout --- */}
      <div className="app-layout">
        {/* --- Left Panel --- */}
        <aside className="left-panel">
          <div className="panel-section">
            <div className="section-label">Marketplace Selection</div>
            <div className="marketplace-tabs">
              <button 
                className={`mp-tab ${marketplaces.includes('ES') ? 'active' : ''}`}
                onClick={() => toggleMarketplace('ES')}
              >
                🇪🇸 Amazon.es
              </button>
              <button 
                className={`mp-tab ${marketplaces.includes('UK') ? 'active' : ''}`}
                onClick={() => toggleMarketplace('UK')}
              >
                🇬🇧 Amazon.co.uk
              </button>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-label">Input ASINs</div>
            <div className="asin-input-area">
              <textarea 
                className="asin-textarea"
                placeholder="B0CLQ6P3BS&#10;B09XYZ1234&#10;&#10;Paste ASINs, one per line"
                value={asinInput}
                onChange={(e) => setAsinInput(e.target.value)}
              ></textarea>
              <div className="asin-helper-row">
                <div className="asin-count">{validAsins.length} ASINs detected</div>
                <button className="btn-clear" onClick={() => setAsinInput('')}>Clear ✕</button>
              </div>
            </div>
            <div className="asin-chip-list">
              {asins.slice(0, 15).map((asin, i) => (
                <div key={i} className={`asin-chip ${/^[A-Z0-9]{10}$/.test(asin) ? 'valid' : 'invalid'}`}>
                  {asin}
                </div>
              ))}
              {asins.length > 15 && <div className="asin-chip">+{asins.length - 15} more</div>}
            </div>
          </div>

          <div className="options-accordion">
            <div className="accordion-header" onClick={() => setShowSettings(!showSettings)}>
              <div className="accordion-title">
                <span>⚙</span> Advanced Options
              </div>
              <div className={`accordion-chevron ${showSettings ? 'open' : ''}`}>▾</div>
            </div>
            {showSettings && (
              <div className="accordion-content">
                <div className="option-row">
                  <div className="option-label">Request delay</div>
                  <div className="option-control">
                    <input 
                      type="range" 
                      min="100" 
                      max="5000" 
                      step="100" 
                      value={settings.delay}
                      onChange={(e) => setSettings({...settings, delay: parseInt(e.target.value)})}
                    />
                    <div className="option-value">{settings.delay}ms</div>
                  </div>
                </div>
                <div className="option-row">
                  <div className="option-label">Proxy Type</div>
                  <div className="option-control">
                    <div 
                      className={`toggle ${settings.proxy === 'residential' ? 'on' : ''}`}
                      onClick={() => setSettings({...settings, proxy: settings.proxy === 'residential' ? 'datacenter' : 'residential'})}
                    >
                      <div className="toggle-thumb"></div>
                    </div>
                    <div className="option-value">{settings.proxy === 'residential' ? 'Residential' : 'Datacenter'}</div>
                  </div>
                </div>
                <div className="option-row">
                  <div className="option-label">Retry on failure</div>
                  <div className="option-control">
                    <div 
                      className={`toggle ${settings.retryOnFailure ? 'on' : ''}`}
                      onClick={() => setSettings({...settings, retryOnFailure: !settings.retryOnFailure})}
                    >
                      <div className="toggle-thumb"></div>
                    </div>
                    <div className="option-value">{settings.retryOnFailure ? 'ON' : 'OFF'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            className={`btn-scrape ${isRunning ? 'running' : ''} ${status?.status === 'COMPLETED' ? 'done' : ''}`}
            disabled={isRunning || validAsins.length === 0}
            onClick={startScrape}
          >
            {isRunning ? (
              <>⏳ Running... ({status?.processed || 0} / {status?.total || 0})</>
            ) : status?.status === 'COMPLETED' ? (
              <>✓ Complete — {results.length} found</>
            ) : (
              <>🔍 Scrape Seller Info</>
            )}
          </button>
        </aside>

        {/* --- Right Panel --- */}
        <main className="right-panel">
          {!isRunning && results.length === 0 && !status && (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                  <line x1="15" y1="3" x2="15" y2="21"></line>
                </svg>
              </div>
              <div className="empty-title">No data yet</div>
              <div className="empty-sub">Add ASINs and press Scrape to get started</div>
              <div className="example-chips">
                <div className="example-chip" onClick={() => setAsinInput('B0CLQ6P3BS')}>B0CLQ6P3BS</div>
                <div className="example-chip" onClick={() => setAsinInput('B09XYZ1234')}>B09XYZ1234</div>
              </div>
            </div>
          )}

          {isRunning && (
            <div className="progress-feed-container">
              <div className="progress-header">
                <div className="progress-info">
                  <div className="progress-title">Extracting seller intelligence...</div>
                  <div className="progress-count">{status?.processed || 0} / {status?.total || 0} ASINs</div>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <div className="progress-info">
                  <div className="progress-percentage">{progressPercent}%</div>
                  <div className="progress-remaining">~{(status?.total - status?.processed) * (settings.delay / 1000)}s remaining</div>
                </div>
              </div>

              <div className="log-feed">
                {dedupedLogs.map((log, i) => (
                  <div key={`${log.asin}|${log.marketplace}`} className={`log-row ${log.status?.toLowerCase()}`}>
                    <div className="log-status">
                      {log.status === 'PROCESSING' ? <div className="log-status-spinner"></div> :
                       log.status === 'SUCCESS'    ? <span style={{color:'var(--status-success)',fontSize:14}}>✓</span> :
                       log.status === 'FAILED'     ? <span style={{color:'var(--status-error)',fontSize:14}}>✕</span> :
                       <span style={{color:'var(--text-muted)',fontSize:14}}>○</span>}
                    </div>
                    <div className="log-content">
                      <div className="log-main">
                        <span className="log-asin">{log.asin}</span>
                        {log.marketplace && <span className="log-marketplace-badge">{log.marketplace}</span>}
                        {log.message.includes('"') && <span className="log-seller-name">{log.message.match(/"([^"]+)"/)?.[0]}</span>}
                      </div>
                      <div className="log-meta">
                        {log.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && !isRunning && (
            <div className="results-container">
              <div className="results-toolbar">
                <div className="results-count">
                  <strong>{results.length}</strong> sellers extracted
                </div>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search / filter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="toolbar-actions">
                  <button className="btn-download" onClick={downloadCsv}>⬇ Download CSV</button>
                  <button className="btn-download-secondary">⬇ JSON</button>
                </div>
              </div>

              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ASIN</th>
                      <th>Marketplace</th>
                      <th>Business Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Business Address</th>
                      <th>VAT Number</th>
                      <th>Status/Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((r, i) => (
                      <tr key={i}>
                        <td className="monospace cell-asin">{r.asin || 'N/A'}</td>
                        <td>
                          <div className="marketplace-badge">
                            {r.marketplace === 'ES' ? '🇪🇸 ES' : '🇬🇧 UK'}
                          </div>
                        </td>
                        <td style={{fontWeight: 500, color: 'var(--text-primary)'}}>{r.business_name || '-'}</td>
                        <td className="monospace">{r.email || '-'}</td>
                        <td className="monospace">{r.phone_number || '-'}</td>
                        <td className="cell-address">{r.business_address || '-'}</td>
                        <td className="monospace">{r.vat_number || '-'}</td>
                        <td style={{color: r.error ? 'var(--status-error)' : 'var(--status-success)', fontSize: '11px'}}>
                          {r.error ? `❌ ${r.error}` : '✅ Success'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}

export default App;
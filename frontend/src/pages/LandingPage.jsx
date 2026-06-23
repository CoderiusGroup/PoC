import { useState, useRef } from 'react'

export default function LandingPage({ onDeviceLoaded, onSessionResumed }) {
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sessions, setSessions] = useState(null)
  const fileInputRef = useRef()

  async function handleFile(file) {
    if (!file) return
    if (!file.name.endsWith('.json')) { setError('Invalid format. Upload a .json file'); return }
    setError('')
    setLoading(true)
    try {
      const json = JSON.parse(await file.text())
      const res  = await fetch('/api/session/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Load error'); return }
      onDeviceLoaded(data.device)
    } catch (e) {
      setError(e instanceof SyntaxError ? 'Invalid JSON.' : 'Backend unreachable.')
    } finally {
      setLoading(false)
    }
  }

  async function loadSessions() {
    if (sessions !== null) { setSessions(null); return }
    try {
      const res = await fetch('/api/sessions')
      setSessions(await res.json())
    } catch {
      setError('Unable to load sessions.')
    }
  }

  return (
    <div>
      <h1>EN 18031 Compliance Check</h1>
      <p className="info">Upload the device JSON file to start the evaluation.</p>

      {error && <p className="error">⚠ {error}</p>}

      <div style={{ margin: '1rem 0' }}>
        <label>
          Device file (.json):{' '}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }}
          />
        </label>
        {loading && <p className="info">Loading...</p>}
      </div>

      <p style={{ color: '#8b949e', fontSize: '12px' }}>
        Example: <code>backend/data/device_esempio.json</code>
      </p>

      <hr />

      <button onClick={loadSessions}>
        {sessions === null ? 'Show saved sessions' : 'Hide sessions'}
      </button>

      {sessions !== null && (
        <div style={{ marginTop: '.75rem' }}>
          {sessions.length === 0
            ? <p className="info">No saved sessions.</p>
            : sessions.map(s => (
              <div key={s.session_id} style={{ borderBottom: '1px solid #30363d', padding: '.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px' }}>
                  {s.device?.name || 'Device'} — {s.saved_at?.slice(0, 16).replace('T', ' ')} — {s.results?.length ?? 0} evaluations
                </span>
                <button onClick={() => onSessionResumed(s)}>Resume</button>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'

export default function LandingPage({ onDeviceLoaded, onSessionResumed }) {
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // manda il file al backend per validarlo, poi avvia la valutazione
  async function handleDeviceFile(file) {
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

  // legge il file sessione e decide se riprendere la valutazione o mostrare i risultati
  async function handleSessionFile(file) {
    if (!file) return
    if (!file.name.endsWith('.json')) { setError('Invalid format. Upload a .json file'); return }
    setError('')
    try {
      const json = JSON.parse(await file.text())
      if (!json.device || !json.saved_at) {
        setError('Invalid session file.')
        return
      }
      onSessionResumed(json.device, json.results || [], json.current_progress || null)
    } catch {
      setError('Unable to read session file.')
    }
  }

  return (
    <div>
      <h1>EN 18031 Compliance Check</h1>

      {error && <p className="error">⚠ {error}</p>}

      <div style={{ margin: '1.5rem 0' }}>
        <p className="info" style={{ marginBottom: '.5rem' }}>New evaluation</p>
        <label>
          Device file (.json):{' '}
          <input
            type="file"
            accept=".json"
            onChange={e => { handleDeviceFile(e.target.files[0]); e.target.value = '' }}
          />
        </label>
        {loading && <p className="info">Loading...</p>}
        <p style={{ color: '#8b949e', fontSize: '12px', marginTop: '.5rem' }}>
          Example Device: <code>backend/data/device_example.json</code>
        </p>
      </div>

      <div style={{ borderTop: '1px solid #30363d', paddingTop: '1.5rem' }}>
        <p className="info" style={{ marginBottom: '.5rem' }}>Resume saved session</p>
        <label>
          Session file (.json):{' '}
          <input
            type="file"
            accept=".json"
            onChange={e => { handleSessionFile(e.target.files[0]); e.target.value = '' }}
          />
        </label>
      </div>

    </div>
  )
}

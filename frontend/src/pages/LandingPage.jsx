import { useState } from 'react'

export default function LandingPage({ onDeviceLoaded }) {
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

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

  return (
    <div>
      <h1>EN 18031 Compliance Check</h1>
      <p className="info">Upload the device JSON file to start the evaluation.</p>

      {error && <p className="error">⚠ {error}</p>}

      <div style={{ margin: '1rem 0' }}>
        <label>
          Device file (.json):{' '}
          <input
            type="file"
            accept=".json"
            onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }}
          />
        </label>
        {loading && <p className="info">Loading...</p>}
      </div>

      <p style={{ color: '#8b949e', fontSize: '12px' }}>
        Example: <code>backend/data/device_example.json</code>
      </p>
    </div>
  )
}

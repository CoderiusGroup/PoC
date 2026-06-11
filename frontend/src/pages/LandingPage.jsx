import { useState, useRef } from 'react'

export default function LandingPage({ onDeviceLoaded, onSessionResumed }) {
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sessions, setSessions] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef()

  async function handleFile(file) {
    if (!file) return
    if (!file.name.endsWith('.json')) {
      setError('Formato non valido. Carica un file .json')
      return
    }

    setError('')
    setLoading(true)

    try {
      const text = await file.text()
      const json = JSON.parse(text)

      const res = await fetch('/api/session/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore durante il caricamento')
        return
      }

      onDeviceLoaded(data.device)
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError('Il file non è un JSON valido.')
      } else {
        setError('Impossibile connettersi al backend. Assicurati che Flask sia avviato.')
      }
    } finally {
      setLoading(false)
    }
  }

  function onInputChange(e) {
    handleFile(e.target.files[0])
    e.target.value = ''
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  async function loadSessions() {
    if (sessions !== null) { setSessions(null); return }
    try {
      const res = await fetch('/api/sessions')
      const data = await res.json()
      setSessions(data)
    } catch {
      setError('Impossibile caricare le sessioni salvate.')
    }
  }

  return (
    <main className="page">
      <h1 className="page-title">Verifica Conformità EN 18031</h1>
      <p className="page-subtitle">
        Carica il file di configurazione di un dispositivo per avviare la valutazione di conformità.
      </p>

      {error && <div className="error-msg">⚠ {error}</div>}

      <div className="card">
        <div className="card-title">Carica dispositivo</div>
        <div
          className={`upload-area${dragOver ? ' drag-over' : ''}`}
          onClick={() => fileInputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="upload-icon">📂</div>
          <p><strong>Clicca per selezionare</strong> o trascina qui il file</p>
          <p style={{ marginTop: '.4rem', fontSize: '.8rem' }}>Solo file .json</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={onInputChange}
        />

        {loading && (
          <p className="text-muted mt-2" style={{ textAlign: 'center' }}>
            Caricamento in corso...
          </p>
        )}

        <hr className="divider" />

        <p className="text-muted" style={{ fontSize: '.8rem' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Non hai un file?</strong>{' '}
          Usa il file di esempio incluso nel repository:{' '}
          <code style={{ background: 'var(--bg-elevated)', padding: '.1rem .4rem', borderRadius: '4px' }}>
            backend/data/device_esempio.json
          </code>
        </p>
      </div>

      <div className="card mt-2">
        <div className="flex-between">
          <div className="card-title" style={{ marginBottom: 0 }}>Sessioni salvate</div>
          <button className="btn btn-ghost" onClick={loadSessions} style={{ fontSize: '.8rem' }}>
            {sessions === null ? 'Mostra ▾' : 'Nascondi ▴'}
          </button>
        </div>

        {sessions !== null && (
          <div className="mt-2">
            {sessions.length === 0 ? (
              <p className="text-muted">Nessuna sessione salvata.</p>
            ) : (
              <div className="session-list">
                {sessions.map((s) => (
                  <div
                    key={s.session_id}
                    className="session-item"
                    onClick={() => onSessionResumed(s)}
                  >
                    <div className="session-info">
                      <span className="session-name">{s.device?.name || 'Dispositivo'}</span>
                      <span className="session-meta">
                        {s.saved_at?.slice(0, 16).replace('T', ' ')} — {s.results?.length ?? 0} valutazioni
                      </span>
                    </div>
                    <span style={{ color: 'var(--accent)', fontSize: '.85rem' }}>Riprendi →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

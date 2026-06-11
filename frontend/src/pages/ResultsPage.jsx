export default function ResultsPage({ device, results, sessionId, onBack }) {
  const pass    = results.filter(r => r.outcome === 'PASS').length
  const fail    = results.filter(r => r.outcome === 'FAIL').length
  const na      = results.filter(r => r.outcome === 'NOT_APPLICABLE').length
  const skipped = results.filter(r => r.outcome === 'SKIPPED').length

  function outcomeLabel(outcome) {
    return {
      PASS:           '✅ PASS',
      FAIL:           '❌ FAIL',
      NOT_APPLICABLE: '➖ N/A',
      SKIPPED:        '⏭ Saltato',
    }[outcome] || outcome
  }

  function badgeClass(outcome) {
    return {
      PASS:           'badge badge-pass',
      FAIL:           'badge badge-fail',
      NOT_APPLICABLE: 'badge badge-na',
      SKIPPED:        'badge badge-na',
    }[outcome] || 'badge'
  }

  function downloadReport() {
    if (!sessionId) return
    window.open(`/api/sessions/${sessionId}/report`, '_blank')
  }

  return (
    <main className="page">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Risultati valutazione</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {device?.name} — {device?.os}
          </p>
        </div>
        <div className="flex-gap">
          {sessionId && (
            <button className="btn btn-primary" onClick={downloadReport}>
              ⬇ Scarica report
            </button>
          )}
          <button className="btn btn-outline" onClick={onBack}>← Home</button>
        </div>
      </div>

      <div className="results-grid">
        <div className="stat-card pass">
          <div className="stat-number">{pass}</div>
          <div className="stat-label">PASS</div>
        </div>
        <div className="stat-card fail">
          <div className="stat-number">{fail}</div>
          <div className="stat-label">FAIL</div>
        </div>
        <div className="stat-card na">
          <div className="stat-number">{na + skipped}</div>
          <div className="stat-label">N/A / Saltati</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Dettaglio per asset e requisito</div>
        {results.length === 0 ? (
          <p className="text-muted">Nessun risultato disponibile.</p>
        ) : (
          <table className="results-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Requisito</th>
                <th>Esito</th>
                <th>Risposte</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{r.asset_name}</td>
                  <td>
                    <code style={{
                      background: 'var(--bg-elevated)',
                      padding: '.1rem .4rem',
                      borderRadius: '4px',
                      fontSize: '.8rem',
                    }}>
                      {r.requirement_id}
                    </code>
                  </td>
                  <td>
                    <span className={badgeClass(r.outcome)}>
                      {outcomeLabel(r.outcome)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '.8rem' }}>
                    {r.answers?.length > 0 ? `${r.answers.length} risposta/e` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {results.filter(r => r.answers?.length > 0).length > 0 && (
        <div className="card mt-2">
          <div className="card-title">Dettaglio risposte</div>
          {results
            .filter(r => r.answers?.length > 0)
            .map((r, i) => (
              <div key={i} style={{ marginBottom: '1.25rem' }}>
                <div className="flex-gap" style={{ marginBottom: '.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{r.asset_name}</span>
                  <code style={{
                    background: 'var(--bg-elevated)',
                    padding: '.1rem .4rem',
                    borderRadius: '4px',
                    fontSize: '.75rem',
                  }}>
                    {r.requirement_id}
                  </code>
                  <span className={badgeClass(r.outcome)}>
                    {outcomeLabel(r.outcome)}
                  </span>
                </div>
                <div className="answers-history">
                  <h4>Domande e risposte</h4>
                  {r.answers.map((a, j) => (
                    <div className="answer-row" key={j}>
                      <span>{a.question}</span>
                      <span>{a.answer === 'yes' ? 'Sì' : 'No'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {!sessionId && (
        <p className="text-muted mt-2" style={{ fontSize: '.8rem', textAlign: 'center' }}>
          ℹ Sessione non salvata — i risultati sono visibili solo in questa sessione.
        </p>
      )}
    </main>
  )
}

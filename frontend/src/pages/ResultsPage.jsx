const LABEL = { PASS: 'PASS', FAIL: 'FAIL', NOT_APPLICABLE: 'Not Applicable' }
const CLS   = { PASS: 'pass', FAIL: 'fail', NOT_APPLICABLE: 'na' }

export default function ResultsPage({ device, results, onBack }) {
  const pass = results.filter(r => r.outcome === 'PASS').length
  const fail = results.filter(r => r.outcome === 'FAIL').length
  const na   = results.filter(r => r.outcome === 'NOT_APPLICABLE').length

  // costruisce il JSON del report e lo scarica nel browser
  function downloadReport() {
    const report = {
      generated_at: new Date().toISOString(),
      device,
      results,
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${device.id}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Results — {device?.name}</h1>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button onClick={downloadReport}>Download Report</button>
          <button onClick={onBack}>← Home</button>
        </div>
      </div>

      <p>
        PASS: <span className="pass">{pass}</span>
        {' — '}
        FAIL: <span className="fail">{fail}</span>
        {' — '}
        NA: <span className="na">{na}</span>
      </p>

      <hr />

      <table>
        <thead>
          <tr><th>Asset</th><th>Requirement</th><th>Outcome</th><th>Answers</th></tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i}>
              <td>{r.asset_name}</td>
              <td><code>{r.requirement_id}</code></td>
              <td><span className={CLS[r.outcome] || ''}>{LABEL[r.outcome] || r.outcome}</span></td>
              <td>{r.answers?.length || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {results.some(r => r.answers?.length > 0) && (
        <>
          <hr />
          <h2>Answer details</h2>
          {results.filter(r => r.answers?.length > 0).map((r, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <p style={{ marginBottom: '.3rem' }}>
                {r.asset_name} / <code>{r.requirement_id}</code> —{' '}
                <span className={CLS[r.outcome] || ''}>{LABEL[r.outcome]}</span>
              </p>
              <table>
                <tbody>
                  {r.answers.map((a, j) => (
                    <tr key={j}>
                      <td>{a.question}</td>
                      <td style={{ width: 40 }}>{a.answer === 'yes' ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

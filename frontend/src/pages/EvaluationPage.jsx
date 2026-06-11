import { useState, useEffect } from 'react'

function DecisionTreeNavigator({ dtId, assetName, onDone, onSkip }) {
  const [tree, setTree]           = useState(null)
  const [currentId, setCurrentId] = useState(null)
  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/decision-trees/${dtId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setTree(data)
        setCurrentId(data.root)
        setHistory([])
      })
      .catch(() => setError('Impossibile caricare il decision tree.'))
      .finally(() => setLoading(false))
  }, [dtId])

  if (loading) return <p className="text-muted">Caricamento decision tree...</p>
  if (error)   return <div className="error-msg">⚠ {error}</div>
  if (!tree)   return null

  const node = tree.nodes[currentId]
  if (!node)   return <div className="error-msg">Nodo non trovato: {currentId}</div>

  function answer(choice) {
    const next = choice === 'yes' ? node.yes : node.no
    setHistory(h => [...h, { nodeId: currentId, text: node.text, answer: choice }])
    setCurrentId(next)
  }

  function goBack() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setCurrentId(prev.nodeId)
    setHistory(h => h.slice(0, -1))
  }

  if (node.type === 'leaf') {
    const outcomeClass = {
      PASS: 'pass', FAIL: 'fail', NOT_APPLICABLE: 'na',
    }[node.outcome] || 'na'

    const outcomeLabel = {
      PASS: '✅ PASS', FAIL: '❌ FAIL', NOT_APPLICABLE: '➖ NOT APPLICABLE',
    }[node.outcome] || node.outcome

    return (
      <div className="dt-container">
        <div className={`leaf-card ${outcomeClass}`}>
          <div className="leaf-outcome">{outcomeLabel}</div>
          <p className="leaf-text">{node.text}</p>
          <div className="flex-gap" style={{ justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={goBack}>← Indietro</button>
            <button className="btn btn-primary" onClick={() => onDone(node.outcome, history)}>
              Salva e continua →
            </button>
          </div>
        </div>

        {history.length > 0 && (
          <div className="answers-history">
            <h4>Risposte fornite</h4>
            {history.map((h, i) => (
              <div className="answer-row" key={i}>
                <span>{h.text.length > 60 ? h.text.slice(0, 60) + '…' : h.text}</span>
                <span>{h.answer === 'yes' ? 'Sì' : 'No'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="dt-container">
      <div className="dt-breadcrumb">
        <span>{dtId}</span>
        <span>›</span>
        <span>{node.id}</span>
      </div>

      <div className="dt-question-card">
        <div className="dt-node-id">{node.id}</div>
        <p className="dt-question-text">{node.text}</p>
        <div className="dt-actions">
          <button className="btn btn-yes" onClick={() => answer('yes')}>✓ Sì</button>
          <button className="btn btn-no"  onClick={() => answer('no')}>✗ No</button>
        </div>
      </div>

      <div className="flex-gap">
        {history.length > 0 && (
          <button className="btn btn-ghost" onClick={goBack}>← Indietro</button>
        )}
        <button className="btn btn-ghost" onClick={onSkip} style={{ marginLeft: 'auto' }}>
          Salta requisito
        </button>
      </div>

      {history.length > 0 && (
        <div className="answers-history">
          <h4>Risposte fornite</h4>
          {history.map((h, i) => (
            <div className="answer-row" key={i}>
              <span>{h.text.length > 60 ? h.text.slice(0, 60) + '…' : h.text}</span>
              <span>{h.answer === 'yes' ? 'Sì' : 'No'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EvaluationPage({ device, onComplete, onBack }) {
  const tasks = device.assets.flatMap(asset =>
    (asset.requirements || []).map(req => ({ asset, reqId: req }))
  )

  const [taskIndex, setTaskIndex] = useState(0)
  const [results, setResults]     = useState([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const total   = tasks.length
  const current = tasks[taskIndex]
  const pct     = total > 0 ? Math.round((taskIndex / total) * 100) : 0

  if (total === 0) {
    return (
      <main className="page">
        <div className="info-msg">ℹ Il dispositivo non ha requisiti da valutare.</div>
        <button className="btn btn-outline" onClick={onBack}>← Torna alla home</button>
      </main>
    )
  }

  function onTaskDone(outcome, history) {
    const newResult = {
      asset_id:       current.asset.id,
      asset_name:     current.asset.name,
      requirement_id: current.reqId,
      outcome,
      answers: history.map(h => ({ question: h.text, answer: h.answer })),
    }
    const updatedResults = [...results, newResult]
    setResults(updatedResults)

    if (taskIndex + 1 >= total) {
      finishEvaluation(updatedResults)
    } else {
      setTaskIndex(i => i + 1)
    }
  }

  function onTaskSkip() {
    const newResult = {
      asset_id:       current.asset.id,
      asset_name:     current.asset.name,
      requirement_id: current.reqId,
      outcome:        'SKIPPED',
      answers:        [],
    }
    const updatedResults = [...results, newResult]
    setResults(updatedResults)

    if (taskIndex + 1 >= total) {
      finishEvaluation(updatedResults)
    } else {
      setTaskIndex(i => i + 1)
    }
  }

  async function finishEvaluation(finalResults) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device, results: finalResults, completed: true }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore salvataggio'); setSaving(false); return }
      onComplete(finalResults, data.session_id)
    } catch {
      setError('Impossibile salvare la sessione. Controlla che Flask sia attivo.')
      setSaving(false)
    }
  }

  return (
    <main className="page">
      <div className="flex-between" style={{ marginBottom: '.5rem' }}>
        <div>
          <h1 className="page-title">{device.name}</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Valutazione in corso — {device.os}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={onBack}>✕ Esci</button>
      </div>

      <div className="progress-row">
        <span>{taskIndex} / {total} completati</span>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span>{pct}%</span>
      </div>

      {error && <div className="error-msg">⚠ {error}</div>}
      {saving && <div className="info-msg">Salvataggio sessione...</div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="flex-between">
          <div>
            <div className="card-title" style={{ marginBottom: '.2rem' }}>
              Asset: {current.asset.name}
            </div>
            <span className="badge badge-info">{current.reqId}</span>
          </div>
          <span className="text-muted" style={{ fontSize: '.8rem' }}>
            {taskIndex + 1} di {total}
          </span>
        </div>
        {current.asset.description && (
          <p className="text-muted mt-1" style={{ fontSize: '.85rem' }}>
            {current.asset.description}
          </p>
        )}
      </div>

      <DecisionTreeNavigator
        key={`${current.asset.id}-${current.reqId}`}
        dtId={current.reqId}
        assetName={current.asset.name}
        onDone={onTaskDone}
        onSkip={onTaskSkip}
      />
    </main>
  )
}

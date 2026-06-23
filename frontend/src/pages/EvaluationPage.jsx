import { useState, useEffect } from 'react'

function DecisionTreeNavigator({ dtId, onDone, onSkip }) {
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
      .catch(() => setError('Unable to load decision tree.'))
      .finally(() => setLoading(false))
  }, [dtId])

  if (loading) return <p className="info">Loading decision tree...</p>
  if (error)   return <p className="error">⚠ {error}</p>
  if (!tree)   return null

  const node = tree.nodes[currentId]
  if (!node)   return <p className="error">Node not found: {currentId}</p>

  function answer(choice) {
    setHistory(h => [...h, { nodeId: currentId, text: node.text, answer: choice }])
    setCurrentId(choice === 'yes' ? node.yes : node.no)
  }

  function goBack() {
    if (!history.length) return
    setCurrentId(history[history.length - 1].nodeId)
    setHistory(h => h.slice(0, -1))
  }

  if (node.type === 'leaf') {
    const cls = { PASS: 'pass', FAIL: 'fail', NOT_APPLICABLE: 'na' }[node.outcome] || 'na'
    return (
      <div>
        <p className={cls} style={{ marginBottom: '.75rem' }}>
          <strong>{node.outcome}</strong> — {node.text}
        </p>
        <button onClick={goBack}>← Back</button>
        <button onClick={() => onDone(node.outcome, history)}>Save and continue →</button>
        {history.length > 0 && (
          <div style={{ marginTop: '.75rem', color: '#8b949e', fontSize: '12px' }}>
            {history.map((h, i) => (
              <div key={i}>{h.text.length > 70 ? h.text.slice(0, 70) + '…' : h.text} → {h.answer === 'yes' ? 'Yes' : 'No'}</div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <p style={{ color: '#8b949e', fontSize: '12px', marginBottom: '.5rem' }}>{dtId} › {node.id}</p>
      <p style={{ marginBottom: '1rem' }}>{node.text}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button onClick={() => answer('yes')}>Yes</button>
          <button onClick={() => answer('no')}>No</button>
          {history.length > 0 && <button onClick={goBack}>← Back</button>}
        </div>
        <button onClick={onSkip} style={{ marginRight: 0 }}>Skip</button>
      </div>
      {history.length > 0 && (
        <div style={{ marginTop: '1rem', color: '#8b949e', fontSize: '12px', clear: 'both' }}>
          {history.map((h, i) => (
            <div key={i}>{h.text.length > 70 ? h.text.slice(0, 70) + '…' : h.text} → {h.answer === 'yes' ? 'Yes' : 'No'}</div>
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

  if (tasks.length === 0) {
    return (
      <div>
        <p className="info">The device has no requirements to evaluate.</p>
        <button onClick={onBack}>← Home</button>
      </div>
    )
  }

  const current = tasks[taskIndex]

  function onTaskDone(outcome, history) {
    const newResult = {
      asset_id:       current.asset.id,
      asset_name:     current.asset.name,
      requirement_id: current.reqId,
      outcome,
      answers: history.map(h => ({ question: h.text, answer: h.answer })),
    }
    const updated = [...results, newResult]
    setResults(updated)
    if (taskIndex + 1 >= tasks.length) finishEvaluation(updated)
    else setTaskIndex(i => i + 1)
  }

  function onTaskSkip() {
    const newResult = {
      asset_id:       current.asset.id,
      asset_name:     current.asset.name,
      requirement_id: current.reqId,
      outcome:        'SKIPPED',
      answers:        [],
    }
    const updated = [...results, newResult]
    setResults(updated)
    if (taskIndex + 1 >= tasks.length) finishEvaluation(updated)
    else setTaskIndex(i => i + 1)
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
      if (!res.ok) { setError(data.error || 'Save error'); setSaving(false); return }
      onComplete(finalResults, data.session_id)
    } catch {
      setError('Unable to save. Make sure Flask is running.')
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h1>{device.name}</h1>
          <p className="info">
            {taskIndex} / {tasks.length} completed — Asset: {current.asset.name} — {current.reqId}
          </p>
        </div>
        <button onClick={onBack}>Exit</button>
      </div>

      {error  && <p className="error">⚠ {error}</p>}
      {saving && <p className="info">Saving...</p>}

      <hr />

      <DecisionTreeNavigator
        key={`${current.asset.id}-${current.reqId}`}
        dtId={current.reqId}
        onDone={onTaskDone}
        onSkip={onTaskSkip}
      />
    </div>
  )
}

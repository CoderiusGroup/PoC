import { useState, useEffect, useRef } from 'react'

// naviga un singolo albero decisionale domanda per domanda
function DecisionTreeNavigator({ dtId, onDone, initialCurrentId, initialHistory, onProgressChange }) {
  const [tree, setTree]           = useState(null)
  const [currentId, setCurrentId] = useState(null)
  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  // congela i valori iniziali al momento del mount — altrimenti React li aggiornerebbe prima che useEffect li legga
  const initIdRef   = useRef(initialCurrentId)
  const initHistRef = useRef(initialHistory)

  // carica l'albero dal backend e posiziona al nodo corretto (radice o punto salvato)
  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/decision-trees/${dtId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setTree(data)
        setCurrentId(initIdRef.current || data.root)
        setHistory(initHistRef.current || [])
      })
      .catch(() => setError('Unable to load decision tree.'))
      .finally(() => setLoading(false))
  }, [dtId])

  if (loading) return <p className="info">Loading decision tree...</p>
  if (error)   return <p className="error">⚠ {error}</p>
  if (!tree)   return null

  const node = tree.nodes[currentId]
  if (!node)   return <p className="error">Node not found: {currentId}</p>

  // registra la risposta e avanza al nodo figlio corrispondente
  function answer(choice) {
    const newHistory   = [...history, { nodeId: currentId, text: node.text, answer: choice }]
    const newCurrentId = choice === 'yes' ? node.yes : node.no
    setHistory(newHistory)
    setCurrentId(newCurrentId)
    onProgressChange?.(newCurrentId, newHistory)
  }

  // torna al nodo precedente rimuovendo l'ultima risposta dalla history
  function goBack() {
    if (!history.length) return
    const newCurrentId = history[history.length - 1].nodeId
    const newHistory   = history.slice(0, -1)
    setCurrentId(newCurrentId)
    setHistory(newHistory)
    onProgressChange?.(newCurrentId, newHistory)
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
      </div>
    </div>
  )
}

export default function EvaluationPage({ device, initialResults = [], initialTaskIndex = 0, initialProgress = null, onComplete, onBack }) {
  // appiattisce assets e requisiti in una lista ordinata da valutare uno per uno
  const tasks = device.assets.flatMap(asset =>
    (asset.requirements || []).map(req => ({ asset, reqId: req }))
  )
  const [taskIndex, setTaskIndex]         = useState(initialTaskIndex)
  const [results, setResults]             = useState(initialResults)
  const [currentProgress, setCurrentProgress] = useState(initialProgress)

  if (tasks.length === 0) {
    return (
      <div>
        <p className="info">The device has no requirements to evaluate.</p>
        <button onClick={onBack}>← Home</button>
      </div>
    )
  }

  const current = tasks[taskIndex]

  // salva il risultato del requisito corrente e passa al successivo (o chiude la valutazione)
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
    setCurrentProgress(null)
    if (taskIndex + 1 >= tasks.length) onComplete(updated)
    else setTaskIndex(i => i + 1)
  }

  // scarica la sessione come file JSON e torna alla home
  function saveAndExit() {
    const session = {
      saved_at:         new Date().toISOString(),
      device,
      results,
      task_index:       taskIndex,
      current_progress: currentProgress,
      completed:        false,
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `session_${device.id}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    onBack()
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.4rem' }}>
          <button onClick={saveAndExit}>Save & Exit</button>
          <button onClick={onBack}>Exit</button>
        </div>
      </div>

      <hr />

      <DecisionTreeNavigator
        key={`${current.asset.id}-${current.reqId}`}
        dtId={current.reqId}
        onDone={onTaskDone}
        initialCurrentId={currentProgress?.currentId ?? null}
        initialHistory={currentProgress?.history ?? []}
        onProgressChange={(cid, hist) => setCurrentProgress({ currentId: cid, history: hist })}
      />
    </div>
  )
}

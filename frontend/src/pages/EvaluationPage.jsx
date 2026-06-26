import { useState, useEffect, useRef } from 'react'

const LABEL = { PASS: 'PASS', FAIL: 'FAIL', NOT_APPLICABLE: 'Not Applicable' }
const CLS   = { PASS: 'pass', FAIL: 'fail', NOT_APPLICABLE: 'na' }

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

  // nodo foglia: mostra il risultato finale e lascia salvare o tornare indietro
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
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={() => answer('yes')}>Yes</button>
        <button onClick={() => answer('no')}>No</button>
        {history.length > 0 && <button onClick={goBack}>← Back</button>}
      </div>
    </div>
  )
}

export default function EvaluationPage({ device, initialResults = [], initialProgress = null, onComplete, onBack }) {
  // appiattisce assets e requisiti in una lista da valutare
  const tasks = device.assets.flatMap(asset =>
    (asset.requirements || []).map(req => ({ asset, reqId: req, key: `${asset.id}-${req}` }))
  )

  const [results, setResults]           = useState(initialResults)
  const [selectedTask, setSelectedTask] = useState(() => {
    // se c'è un checkpoint mid-task salvato, riapre direttamente quel task
    if (initialProgress?.taskKey) {
      return tasks.find(t => t.key === initialProgress.taskKey) || null
    }
    return null
  })
  const [currentProgress, setCurrentProgress] = useState(initialProgress)

  if (tasks.length === 0) {
    return (
      <div>
        <p className="info">The device has no requirements to evaluate.</p>
        <button onClick={onBack}>← Home</button>
      </div>
    )
  }

  // trova il risultato salvato per un task specifico
  function getResult(task) {
    return results.find(r => r.asset_id === task.asset.id && r.requirement_id === task.reqId)
  }

  // salva il risultato del task corrente (sovrascrive se già valutato) e torna alla lista
  function onTaskDone(outcome, history) {
    const newResult = {
      asset_id:       selectedTask.asset.id,
      asset_name:     selectedTask.asset.name,
      requirement_id: selectedTask.reqId,
      outcome,
      answers: history.map(h => ({ question: h.text, answer: h.answer })),
    }
    // rimuove l'eventuale risultato precedente dello stesso task e aggiunge quello nuovo
    const updated = [
      ...results.filter(r => !(r.asset_id === selectedTask.asset.id && r.requirement_id === selectedTask.reqId)),
      newResult,
    ]
    setResults(updated)
    setSelectedTask(null)
    setCurrentProgress(null)
  }

  // scarica la sessione come file JSON e torna alla home
  function saveAndExit() {
    const session = {
      saved_at:         new Date().toISOString(),
      device,
      results,
      current_progress: currentProgress,
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

  // vista lista task — mostra tutti i requisiti con il loro stato
  if (!selectedTask) {
    const allDone = tasks.every(t => getResult(t))
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h1>{device.name}</h1>
            <p className="info">{results.length} / {tasks.length} completed</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.4rem' }}>
            <button onClick={saveAndExit}>Save & Exit</button>
            <button onClick={onBack}>Exit</button>
          </div>
        </div>

        <hr />

        <table>
          <thead>
            <tr><th>Asset</th><th>Requirement</th><th>Outcome</th></tr>
          </thead>
          <tbody>
            {tasks.map(task => {
              const result = getResult(task)
              return (
                <tr key={task.key} onClick={() => setSelectedTask(task)} style={{ cursor: 'pointer' }}>
                  <td>{task.asset.name}</td>
                  <td><code>{task.reqId}</code></td>
                  <td>
                    {result
                      ? <span className={CLS[result.outcome] || ''}>{LABEL[result.outcome] || result.outcome}</span>
                      : <span style={{ color: '#8b949e' }}>pending</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {allDone && (
          <div style={{ marginTop: '1.5rem' }}>
            <button onClick={() => onComplete(results)}>View Results →</button>
          </div>
        )}
      </div>
    )
  }

  // vista navigatore — valuta il task selezionato
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h1>{device.name}</h1>
          <p className="info">Asset: {selectedTask.asset.name} — {selectedTask.reqId}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.4rem' }}>
          <button onClick={saveAndExit}>Save & Exit</button>
          <button onClick={() => { setSelectedTask(null); setCurrentProgress(null) }}>← Task list</button>
        </div>
      </div>

      <hr />

      <DecisionTreeNavigator
        key={selectedTask.key}
        dtId={selectedTask.reqId}
        onDone={onTaskDone}
        initialCurrentId={currentProgress?.taskKey === selectedTask.key ? currentProgress.currentId : null}
        initialHistory={currentProgress?.taskKey === selectedTask.key ? currentProgress.history ?? [] : []}
        onProgressChange={(cid, hist) => setCurrentProgress({ taskKey: selectedTask.key, currentId: cid, history: hist })}
      />
    </div>
  )
}

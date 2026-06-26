import { useState } from 'react'
import LandingPage from './pages/LandingPage.jsx'
import EvaluationPage from './pages/EvaluationPage.jsx'
import ResultsPage from './pages/ResultsPage.jsx'

export default function App() {
  // stato globale: pagina corrente, device caricato, risultati e punto di ripresa
  const [page, setPage]                       = useState('landing')
  const [device, setDevice]                   = useState(null)
  const [results, setResults]                 = useState([])
  const [initialTaskIndex, setInitialTaskIndex] = useState(0)
  const [initialProgress, setInitialProgress] = useState(null)

  // azzera tutto e torna alla home
  function goHome() {
    setPage('landing')
    setDevice(null)
    setResults([])
    setInitialTaskIndex(0)
    setInitialProgress(null)
  }

  // device validato dal backend, si parte da zero con la valutazione
  function onDeviceLoaded(deviceData) {
    setDevice(deviceData)
    setResults([])
    setInitialTaskIndex(0)
    setInitialProgress(null)
    setPage('evaluation')
  }

  // sessione salvata: ripristina device, risultati parziali e punto esatto di ripresa
  function onSessionResumed(deviceData, savedResults, taskIndex, progress) {
    setDevice(deviceData)
    setResults(savedResults)
    setInitialTaskIndex(taskIndex)
    setInitialProgress(progress || null)
    setPage('evaluation')
  }

  // tutte le domande completate, passa i risultati alla pagina finale
  function onEvaluationComplete(evalResults) {
    setResults(evalResults)
    setPage('results')
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ borderBottom: '1px solid #30363d', paddingBottom: '.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#8b949e', fontSize: '13px' }}>EN18031 Compliance PoC</span>
        {page !== 'landing' && <button onClick={goHome}>home</button>}
      </div>

      {page === 'landing' && (
        <LandingPage
          onDeviceLoaded={onDeviceLoaded}
          onSessionResumed={onSessionResumed}
        />
      )}
      {page === 'evaluation' && device && (
        <EvaluationPage
          device={device}
          initialResults={results}
          initialTaskIndex={initialTaskIndex}
          initialProgress={initialProgress}
          onComplete={onEvaluationComplete}
          onBack={goHome}
        />
      )}
      {page === 'results' && (
        <ResultsPage device={device} results={results} onBack={goHome} />
      )}
    </div>
  )
}

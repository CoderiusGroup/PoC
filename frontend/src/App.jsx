import { useState } from 'react'
import LandingPage from './pages/LandingPage.jsx'
import EvaluationPage from './pages/EvaluationPage.jsx'
import ResultsPage from './pages/ResultsPage.jsx'

function Topbar({ onHome }) {
  return (
    <header className="topbar">
      <button className="topbar-logo" onClick={onHome}>
        EN<span>18031</span>
      </button>
      <span className="topbar-subtitle">Compliance Verification — PoC</span>
    </header>
  )
}

export default function App() {
  const [page, setPage]       = useState('landing')
  const [device, setDevice]   = useState(null)
  const [results, setResults] = useState([])
  const [sessionId, setSessionId] = useState(null)

  function goHome() {
    setPage('landing')
    setDevice(null)
    setResults([])
    setSessionId(null)
  }

  function onDeviceLoaded(deviceData) {
    setDevice(deviceData)
    setResults([])
    setPage('evaluation')
  }

  function onSessionResumed(session) {
    setDevice(session.device)
    setResults(session.results)
    setSessionId(session.session_id)
    setPage('results')
  }

  function onEvaluationComplete(evalResults, sid) {
    setResults(evalResults)
    setSessionId(sid)
    setPage('results')
  }

  return (
    <>
      <Topbar onHome={goHome} />

      {page === 'landing' && (
        <LandingPage
          onDeviceLoaded={onDeviceLoaded}
          onSessionResumed={onSessionResumed}
        />
      )}

      {page === 'evaluation' && device && (
        <EvaluationPage
          device={device}
          onComplete={onEvaluationComplete}
          onBack={goHome}
        />
      )}

      {page === 'results' && (
        <ResultsPage
          device={device}
          results={results}
          sessionId={sessionId}
          onBack={goHome}
        />
      )}
    </>
  )
}
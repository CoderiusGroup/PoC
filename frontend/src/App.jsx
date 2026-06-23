import { useState } from 'react'
import LandingPage from './pages/LandingPage.jsx'
import EvaluationPage from './pages/EvaluationPage.jsx'
import ResultsPage from './pages/ResultsPage.jsx'

export default function App() {
  const [page, setPage]           = useState('landing')
  const [device, setDevice]       = useState(null)
  const [results, setResults]     = useState([])
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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ borderBottom: '1px solid #30363d', paddingBottom: '.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#8b949e', fontSize: '13px' }}>EN18031 Compliance PoC</span>
        {page !== 'landing' && <button onClick={goHome}>home</button>}
      </div>

      {page === 'landing' && (
        <LandingPage onDeviceLoaded={onDeviceLoaded} onSessionResumed={onSessionResumed} />
      )}
      {page === 'evaluation' && device && (
        <EvaluationPage device={device} onComplete={onEvaluationComplete} onBack={goHome} />
      )}
      {page === 'results' && (
        <ResultsPage device={device} results={results} sessionId={sessionId} onBack={goHome} />
      )}
    </div>
  )
}

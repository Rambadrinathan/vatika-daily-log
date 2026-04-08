import { useState, useEffect, useCallback } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || 'https://daily.vatikadashboard.site'

function TypeIcon({ type }) {
  const icons = { IMAGE: '📸', VOICE: '🎤', NOTES: '📝', PRODUCE: '📦' }
  return <span className="type-icon">{icons[type] || '📋'}</span>
}

function StarRating({ rating, onRate, readonly }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`star ${n <= rating ? 'filled' : ''} ${readonly ? '' : 'clickable'}`}
          onClick={() => !readonly && onRate(n)}
        >
          ★
        </span>
      ))}
    </div>
  )
}

function App() {
  const [dates, setDates] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const fetchDates = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/daily-logs`)
      const data = await res.json()
      setDates(data.dates || [])
      if (data.dates && data.dates.length > 0 && !selectedDate) {
        setSelectedDate(data.dates[0].date)
      }
    } catch (err) {
      console.error('Failed to fetch dates:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  const fetchReport = useCallback(async (date) => {
    try {
      const res = await fetch(`${API_BASE}/api/daily-logs/${date}`)
      const data = await res.json()
      setReport(data)
      setRating(data.approval?.rating || 0)
      setFeedback(data.approval?.feedback || '')
    } catch (err) {
      console.error('Failed to fetch report:', err)
    }
  }, [])

  useEffect(() => { fetchDates() }, [fetchDates])
  useEffect(() => { if (selectedDate) fetchReport(selectedDate) }, [selectedDate, fetchReport])

  const handleApprove = async () => {
    if (!rating) return alert('Please give a rating before approving')
    setSubmitting(true)
    try {
      await fetch(`${API_BASE}/api/daily-logs/${selectedDate}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: 'Panna Dhar', rating, feedback })
      })
      await fetchReport(selectedDate)
      await fetchDates()
    } catch (err) {
      console.error('Approval failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async () => {
    setSubmitting(true)
    try {
      await fetch(`${API_BASE}/api/daily-logs/${selectedDate}/unapprove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      setRating(0)
      setFeedback('')
      await fetchReport(selectedDate)
      await fetchDates()
    } catch (err) {
      console.error('Revoke failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="app">
      <header className="app-header">
        <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '◀' : '▶'}
        </button>
        <div className="header-content">
          <h1>Vatika Daily Log</h1>
          <p className="subtitle">Supervisor Paritosh Mondal — Field Activity Reports</p>
        </div>
      </header>

      <div className="app-body">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <h2 className="sidebar-title">Reports</h2>
          <ul className="date-list">
            {dates.map(d => (
              <li
                key={d.date}
                className={`date-item ${selectedDate === d.date ? 'active' : ''} ${d.approved ? 'approved' : ''}`}
                onClick={() => setSelectedDate(d.date)}
              >
                <span className="date-label">{formatDate(d.date)}</span>
                <span className="date-meta">
                  {d.entries} entries
                  {d.approved && <span className="badge approved-badge">Approved</span>}
                  {d.rating && <span className="badge rating-badge">{'★'.repeat(d.rating)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <main className="main-panel">
          {report ? (
            <>
              <div className="report-header">
                <h2>{formatDate(report.date)}</h2>
                <span className={`status ${report.approved ? 'approved' : 'pending'}`}>
                  {report.approved ? `Approved by ${report.approval.approved_by}` : 'Pending Review'}
                </span>
              </div>

              <div className="entries">
                {report.entries.map((entry, i) => (
                  <div key={i} className={`entry entry-${(entry.type || '').toLowerCase()}`}>
                    <div className="entry-time">{entry.time_ist}</div>
                    <div className="entry-content">
                      <div className="entry-header">
                        <TypeIcon type={entry.type} />
                        <span className="entry-type">{entry.type}</span>
                        <span className="entry-sender">{entry.sender}</span>
                      </div>
                      {entry.bengali && <p className="bengali">{entry.bengali}</p>}
                      {entry.english && <p className="english">{entry.english}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="review-panel">
                <h3>Review & Feedback</h3>
                <div className="review-form">
                  <label>Rating</label>
                  <StarRating
                    rating={rating}
                    onRate={setRating}
                    readonly={report.approved}
                  />

                  <label>Feedback / Notes</label>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Add feedback for Paritosh..."
                    disabled={report.approved}
                    rows={3}
                  />

                  <div className="review-actions">
                    {!report.approved ? (
                      <button
                        className="btn btn-approve"
                        onClick={handleApprove}
                        disabled={submitting}
                      >
                        {submitting ? 'Approving...' : 'Approve Report'}
                      </button>
                    ) : (
                      <button
                        className="btn btn-revoke"
                        onClick={handleRevoke}
                        disabled={submitting}
                      >
                        {submitting ? 'Revoking...' : 'Revoke Approval'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Select a date to view the daily report</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App

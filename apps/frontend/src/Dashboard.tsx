import { useState, useEffect, useCallback } from 'react';
import type { Company, CompanyStatus, CompanyHistory } from './dashboardTypes';
import { API_URL } from './api';

const statusColors: Record<CompanyStatus, string> = {
  up: 'green',
  partially_down: 'orange',
  fully_down: 'red',
};
const statusIcons: Record<CompanyStatus, string> = {
  up: '✅',
  partially_down: '⚠️',
  fully_down: '❌',
};

interface DashboardProps {
  token: string;
}

export default function Dashboard({ token }: DashboardProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<Record<string, CompanyHistory[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});

  const fetchCompanies = useCallback(() => {
    fetch(`${API_URL}/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setCompanies(data))
      .catch(() => setCompanies([]));
  }, [token]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, statusPageUrl: url, method: 'rss' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add');
      const company = await res.json();
      setCompanies(prev => [...prev, company]);
      setName('');
      setUrl('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const fetchHistory = async (companyId: string) => {
    setHistoryLoading(h => ({ ...h, [companyId]: true }));
    try {
      const res = await fetch(`${API_URL}/companies/${companyId}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      setHistory(h => ({ ...h, [companyId]: data }));
    } catch {
      setHistory(h => ({ ...h, [companyId]: [] }));
    } finally {
      setHistoryLoading(h => ({ ...h, [companyId]: false }));
    }
  };

  const toggleHistory = (companyId: string) => {
    setHistoryOpen(open => {
      const next = { ...open, [companyId]: !open[companyId] };
      if (next[companyId] && !history[companyId]) fetchHistory(companyId);
      return next;
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/refresh-status`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to refresh statuses');
      // After refresh, reload companies
      fetchCompanies();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/companies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete company');
      setCompanies(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
  <div
    className="dashboard"
    style={{
      maxWidth: 'none',
      width: '100vw',
      padding: '2.5rem 4vw',
      boxSizing: 'border-box',
      background: 'linear-gradient(120deg, #23263a 60%, #181a20 100%)',
      minHeight: '100vh',
      transition: 'background 0.3s',
    }}
  >
    <h2 style={{
      color: '#a18aff',
      fontWeight: 700,
      fontSize: '2.2rem',
      marginBottom: 24,
      letterSpacing: 1
    }}>Monitored Companies</h2>

    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        style={{
          background: 'linear-gradient(90deg, #7c6fff 0%, #a18aff 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '0.6em 1.4em',
          fontWeight: 600,
          fontSize: '1.1em',
          boxShadow: '0 2px 8px #181a20',
          cursor: refreshing ? 'not-allowed' : 'pointer',
          opacity: refreshing ? 0.7 : 1,
          transition: 'background 0.2s, opacity 0.2s',
        }}
      >
        {refreshing ? 'Refreshing...' : 'Manual Refresh'}
      </button>
      <form onSubmit={handleAdd} className="add-company-form" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#23263a', borderRadius: 8, padding: 8, boxShadow: '0 1px 4px #181a20' }}>
        <input
          type="text"
          placeholder="Company Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          style={{ minWidth: 160, padding: '0.5em', borderRadius: 6, border: '1px solid #393c5a', background: '#181a20', color: '#e6e6f7', fontSize: '1em' }}
        />
        <input
          type="url"
          placeholder="Status Page RSS Feed URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
          style={{ minWidth: 260, padding: '0.5em', borderRadius: 6, border: '1px solid #393c5a', background: '#181a20', color: '#e6e6f7', fontSize: '1em' }}
        />
        <button
          type="submit"
          style={{
            background: 'linear-gradient(90deg, #a18aff 0%, #7c6fff 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '0.5em 1.2em',
            fontWeight: 600,
            fontSize: '1em',
            cursor: 'pointer',
            boxShadow: '0 1px 4px #181a20',
            transition: 'background 0.2s',
          }}
        >
          Add
        </button>
      </form>
    </div>

    {error && <div className="error" style={{ color: '#ff6b81', marginBottom: 16, fontWeight: 500 }}>{error}</div>}

    <div
      className="dashboard-table-wrapper"
      style={{ overflowX: 'auto', width: '100%', background: '#23263a', borderRadius: 10, boxShadow: '0 2px 16px rgba(40,40,80,0.12)', padding: 8 }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: 0,
          tableLayout: 'fixed', // Ensures columns fill container and align
        }}
      >
        <thead>
          <tr
            style={{
              color: '#a18aff',
              borderBottom: '2px solid #393c5a',
              fontSize: '1.05em',
              background: 'rgba(36, 38, 58, 0.95)'
            }}
          >
            <th style={{ textAlign: 'center', padding: '0.7em 0.3em' }}>Status</th>
            <th style={{ padding: '0.7em 0.3em' }}>Company</th>
            <th style={{ padding: '0.7em 0.3em' }}>Status Page</th>
            <th style={{ padding: '0.7em 0.3em' }}>Last Checked</th>
            <th style={{ padding: '0.7em 0.3em' }}>Latest Incident</th>
            <th style={{ padding: '0.7em 0.3em' }}>Actions</th>
            <th style={{ padding: '0.7em 0.3em' }}>History</th>
          </tr>
        </thead>
        <tbody>
          {companies.map(company => (
            <tr
              key={company.id}
              className="company-item"
              style={{ borderBottom: '1px solid #393c5a', background: '#23263a', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#282a3d')}
              onMouseLeave={e => (e.currentTarget.style.background = '#23263a')}
            >
              <td
                style={{
                  color: statusColors[company.status],
                  fontWeight: 700,
                  textAlign: 'center',
                  fontSize: '1.3em',
                  padding: '0.6em 0.3em',
                }}
              >
                {statusIcons[company.status]}
              </td>
              <td style={{ fontWeight: 500, fontSize: '1.05em', padding: '0.6em 0.3em' }}>{company.name}</td>
              <td style={{ padding: '0.6em 0.3em' }}>
                <a
                  href={company.statusPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#a18aff', textDecoration: 'underline', fontWeight: 500 }}
                >
                  Status Page
                </a>
              </td>
              <td style={{ fontSize: '0.95em', color: '#888', padding: '0.6em 0.3em' }}>
                {new Date(company.lastChecked).toLocaleString()}
              </td>
              <td style={{ minWidth: 180, padding: '0.6em 0.3em' }}>
                {company.latestIncidentTitle ? (
                  <div>
                    <strong style={{ color: '#ffb86c' }}>{company.latestIncidentTitle}</strong>
                    {company.latestIncidentAt && (
                      <span style={{ color: '#888', marginLeft: 8 }}>
                        ({new Date(company.latestIncidentAt).toLocaleString()})
                      </span>
                    )}
                    {company.latestIncidentSummary && (
                      <div style={{ color: '#e6e6f7', marginTop: 2, fontSize: '0.97em' }}>
                        {company.latestIncidentSummary}
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#888' }}>
                    No incidents
                  </span>
                )}
              </td>
              <td style={{ padding: '0.6em 0.3em' }}>
                <button
                  onClick={() => handleDelete(company.id)}
                  style={{
                    background: 'linear-gradient(90deg, #ff6b81 0%, #ffb6b6 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '0.4em 1em',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '1em',
                    boxShadow: '0 1px 4px #181a20',
                    transition: 'background 0.2s',
                  }}
                >
                  Remove
                </button>
              </td>
              <td style={{ minWidth: 180, padding: '0.6em 0.3em' }}>
                <button
                  onClick={() => toggleHistory(company.id)}
                  style={{
                    background: historyOpen[company.id]
                      ? 'linear-gradient(90deg, #23263a 0%, #a18aff 100%)'
                      : 'linear-gradient(90deg, #393c5a 0%, #7c6fff 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '0.4em 1em',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '1em',
                    marginBottom: 4,
                    boxShadow: '0 1px 4px #181a20',
                    transition: 'background 0.2s',
                  }}
                >
                  {historyOpen[company.id] ? 'Hide History' : 'Show History'}
                </button>

                {historyOpen[company.id] && (
                  <div
                    style={{
                      marginTop: 8,
                      background: '#23263a',
                      borderRadius: 6,
                      padding: 8,
                      boxShadow: "0 1px 4px #181a20",
                      minWidth: 320
                    }}
                  >
                    {historyLoading[company.id] ? (
                      <div style={{ color: "#888" }}>
                        Loading history...
                      </div>
                    ) : history[company.id]?.length ? (
                      <table
                        style={{
                          width: "100%",
                          fontSize: "0.95em",
                          color: "#e6e6f7",
                          borderCollapse: "collapse"
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              color: "#a18aff",
                              borderBottom:
                                "1px solid #393c5a"
                            }}
                          >
                            <th align="left">Time</th>
                            <th align="left">Status</th>
                            <th align="left">Incident</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history[company.id].map(h => (
                            <tr
                              key={h.id}
                              style={{
                                borderBottom:
                                  "1px solid #393c5a"
                              }}
                            >
                              <td>
                                {new Date(
                                  h.createdAt
                                ).toLocaleString()}
                              </td>
                              <td>{h.status}</td>
                              <td>
                                {h.incidentTitle && (
                                  <div>
                                    <strong>
                                      {h.incidentTitle}
                                    </strong>
                                  </div>
                                )}
                                {h.incidentSummary && (
                                  <div>
                                    {h.incidentSummary}
                                  </div>
                                )}
                                {h.incidentAt && (
                                  <div
                                    style={{
                                      color: "#888"
                                    }}
                                  >
                                    Incident Time:{" "}
                                    {new Date(
                                      h.incidentAt
                                    ).toLocaleString()}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ color: "#888" }}>
                        No history found.
                      </div>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

}

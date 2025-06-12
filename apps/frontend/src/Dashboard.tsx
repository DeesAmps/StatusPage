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
    <div className="dashboard">
      <h2>Monitored Companies</h2>
      <button onClick={handleRefresh} disabled={refreshing} style={{ marginBottom: 16 }}>
        {refreshing ? 'Refreshing...' : 'Manual Refresh'}
      </button>
      <form onSubmit={handleAdd} className="add-company-form">
        <input
          type="text"
          placeholder="Company Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          type="url"
          placeholder="Status Page RSS Feed URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>
      {error && <div className="error">{error}</div>}
      <ul className="company-list" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
          <thead>
            <tr style={{ color: '#a18aff', borderBottom: '1px solid #393c5a' }}>
              <th>Status</th>
              <th>Company</th>
              <th>Status Page</th>
              <th>Last Checked</th>
              <th>Actions</th>
              <th>History</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <tr key={company.id} className="company-item" style={{ borderBottom: '1px solid #393c5a' }}>
                <td style={{ color: statusColors[company.status], fontWeight: 'bold', textAlign: 'center' }}>
                  {statusIcons[company.status]}
                </td>
                <td>{company.name}</td>
                <td><a href={company.statusPageUrl} target="_blank" rel="noopener noreferrer">Status Page</a></td>
                <td style={{ fontSize: '0.8em', color: '#888' }}>{company.lastChecked}</td>
                <td>
                  <button onClick={() => handleDelete(company.id)} style={{ background: '#ff6b81', color: '#fff', border: 'none', borderRadius: 4, padding: '0.3em 0.7em', cursor: 'pointer', marginRight: 8 }}>Remove</button>
                </td>
                <td>
                  <button onClick={() => toggleHistory(company.id)} style={{ background: '#393c5a', color: '#a18aff', border: 'none', borderRadius: 4, padding: '0.3em 0.7em', cursor: 'pointer' }}>
                    {historyOpen[company.id] ? 'Hide History' : 'Show History'}
                  </button>
                  {historyOpen[company.id] && (
                    <div style={{ marginTop: 8, background: '#23263a', borderRadius: 6, padding: 8, boxShadow: '0 1px 4px #181a20', minWidth: 320 }}>
                      {historyLoading[company.id] ? (
                        <div style={{ color: '#888' }}>Loading history...</div>
                      ) : history[company.id]?.length ? (
                        <table style={{ width: '100%', fontSize: '0.95em', color: '#e6e6f7', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: '#a18aff', borderBottom: '1px solid #393c5a' }}>
                              <th align="left">Time</th>
                              <th align="left">Status</th>
                              <th align="left">Incident</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history[company.id].map(h => (
                              <tr key={h.id} style={{ borderBottom: '1px solid #393c5a' }}>
                                <td>{new Date(h.createdAt).toLocaleString()}</td>
                                <td>{h.status}</td>
                                <td>
                                  {h.incidentTitle && <div><strong>{h.incidentTitle}</strong></div>}
                                  {h.incidentSummary && <div>{h.incidentSummary}</div>}
                                  {h.incidentAt && <div style={{ color: '#888' }}>Incident Time: {new Date(h.incidentAt).toLocaleString()}</div>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div style={{ color: '#888' }}>No history found.</div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ul>
    </div>
  );
}

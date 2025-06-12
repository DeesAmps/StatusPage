import { useState, useEffect, useCallback } from 'react';
import type { Company, CompanyStatus } from './dashboardTypes';
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
      <ul className="company-list">
        {companies.map(company => (
          <li key={company.id} className="company-item">
            <span style={{ color: statusColors[company.status], fontWeight: 'bold' }}>
              {statusIcons[company.status]}
            </span>{' '}
            <span>{company.name}</span>{' '}
            <a href={company.statusPageUrl} target="_blank" rel="noopener noreferrer">Status Page</a>{' '}
            <span style={{ fontSize: '0.8em', color: '#888' }}>Last checked: {company.lastChecked}</span>
            <button onClick={() => handleDelete(company.id)} style={{ marginLeft: 8, background: '#ff6b81', color: '#fff', border: 'none', borderRadius: 4, padding: '0.3em 0.7em', cursor: 'pointer' }}>Remove</button>
            {company.latestIncidentTitle && (
              <div style={{ marginLeft: 32, marginTop: 4, textAlign: 'left', fontSize: '0.95em', color: '#a18aff' }}>
                <strong>Latest Incident:</strong> {company.latestIncidentTitle}
                {company.latestIncidentAt && (
                  <span style={{ color: '#888', marginLeft: 8 }}>
                    ({new Date(company.latestIncidentAt).toLocaleString()})
                  </span>
                )}
                {company.latestIncidentSummary && (
                  <div style={{ color: '#e6e6f7', marginTop: 2 }}>{company.latestIncidentSummary}</div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

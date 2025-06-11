import { useState, useEffect } from 'react';
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

type AddMethod = 'rss' | 'scrape';

export default function Dashboard({ token }: DashboardProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [addMethod, setAddMethod] = useState<AddMethod>('rss');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setCompanies(data))
      .catch(() => setCompanies([]));
  }, [token]);

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
        body: JSON.stringify({ name, statusPageUrl: url, method: addMethod }),
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

  return (
    <div className="dashboard">
      <h2>Monitored Companies</h2>
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
          placeholder={addMethod === 'rss' ? 'Status Page RSS Feed URL' : 'Status Page URL'}
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />
        <select value={addMethod} onChange={e => setAddMethod(e.target.value as AddMethod)}>
          <option value="rss">RSS Feed</option>
          <option value="scrape">Page Scrape</option>
        </select>
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
          </li>
        ))}
      </ul>
    </div>
  );
}

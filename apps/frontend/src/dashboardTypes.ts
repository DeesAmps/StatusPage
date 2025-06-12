export type CompanyStatus = 'up' | 'partially_down' | 'fully_down';

export interface Company {
  id: string;
  name: string;
  status: CompanyStatus;
  statusPageUrl: string;
  lastChecked: string;
  latestIncidentTitle?: string;
  latestIncidentSummary?: string;
  latestIncidentAt?: string;
}

export interface CompanyHistory {
  id: string;
  companyId: string;
  status: CompanyStatus | string;
  incidentTitle?: string;
  incidentSummary?: string;
  incidentAt?: string;
  createdAt: string;
}

export type CompanyStatus = 'up' | 'partially_down' | 'fully_down';

export interface Company {
  id: string;
  name: string;
  status: CompanyStatus;
  statusPageUrl: string;
  lastChecked: string;
}

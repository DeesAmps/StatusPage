export type CompanyStatus = 'up' | 'partially_down' | 'fully_down';

export interface Company {
  id: string;
  userId: string;
  name: string;
  status: CompanyStatus;
  statusPageUrl: string;
  lastChecked: string;
}

const companies: Company[] = [];

export function getCompaniesByUser(userId: string) {
  return companies.filter(c => c.userId === userId);
}

export function addCompany(company: Company) {
  companies.push(company);
  return company;
}

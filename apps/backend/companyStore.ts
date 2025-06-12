import { prisma } from './prismaClient';

export type CompanyStatus = 'up' | 'partially_down' | 'fully_down';

export interface Company {
  id: string;
  userId: string;
  name: string;
  status: CompanyStatus;
  statusPageUrl: string;
  lastChecked: string;
  latestIncidentTitle?: string;
  latestIncidentSummary?: string;
  latestIncidentAt?: string;
}

export async function getCompaniesByUser(userId: string) {
  return prisma.company.findMany({ where: { userId } });
}

export async function addCompany(company: {
  id: string;
  userId: string;
  name: string;
  status: string;
  statusPageUrl: string;
  lastChecked: Date;
  latestIncidentTitle?: string;
  latestIncidentSummary?: string;
  latestIncidentAt?: Date;
}) {
  return prisma.company.create({ data: company });
}

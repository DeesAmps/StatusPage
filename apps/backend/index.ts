import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { generateToken, authenticateToken } from './auth';
import { prisma } from './prismaClient';
import { findAuthByEmail, addAuthAndUser } from './userStore';
import { Company, CompanyStatus, getCompaniesByUser, addCompany } from './companyStore';
import Parser from 'rss-parser';

const app = express();
app.use(cors());
app.use(express.json());

const rssParser = new Parser();

async function fetchCompanyStatusFromRSS(statusPageUrl: string): Promise<{
  status: string;
  lastChecked: Date;
  latestIncidentTitle?: string;
  latestIncidentSummary?: string;
  latestIncidentAt?: Date;
}> {
  try {
    const feed = await rssParser.parseURL(statusPageUrl);
    let status: string = 'up';
    let latestIncidentTitle: string | undefined;
    let latestIncidentSummary: string | undefined;
    let latestIncidentAt: Date | undefined;
    if (feed.items && feed.items.length > 0) {
      // Find the most recent incident (first item)
      const item = feed.items[0];
      latestIncidentTitle = item.title || undefined;
      latestIncidentSummary = (item.contentSnippet || item.content || '').slice(0, 200) || undefined;
      latestIncidentAt = item.isoDate ? new Date(item.isoDate) : undefined;
      // Heuristic for status
      const text = `${item.title || ''} ${item.content || ''}`.toLowerCase();
      if (text.includes('fully down') || text.includes('major outage')) {
        status = 'fully_down';
      } else if (text.includes('partial') || text.includes('degraded') || text.includes('incident')) {
        status = 'partially_down';
      }
    }
    // If any item in the feed is a major incident, escalate status
    for (const item of feed.items) {
      const text = `${item.title || ''} ${item.content || ''}`.toLowerCase();
      if (text.includes('fully down') || text.includes('major outage')) {
        status = 'fully_down';
        break;
      } else if (text.includes('partial') || text.includes('degraded') || text.includes('incident')) {
        status = 'partially_down';
      }
    }
    return { status, lastChecked: new Date(), latestIncidentTitle, latestIncidentSummary, latestIncidentAt };
  } catch (e) {
    return { status: 'partially_down', lastChecked: new Date() };
  }
}

// Use dynamic import for node-fetch (ESM only)
let fetch: typeof import('node-fetch').default;
async function fetchCompanyStatusByScrape(statusPageUrl: string): Promise<{
  status: string;
  lastChecked: Date;
  latestIncidentTitle?: string;
  latestIncidentSummary?: string;
  latestIncidentAt?: Date;
}> {
  try {
    if (!fetch) {
      fetch = (await import('node-fetch')).default;
    }
    const res = await fetch(statusPageUrl);
    const html = await res.text();
    const cheerio = (await import('cheerio')).default;
    const $ = cheerio.load(html);
    // Heuristic: look for keywords in the page text
    const text = $('body').text().toLowerCase();
    let status: string = 'up';
    if (text.includes('fully down') || text.includes('major outage')) {
      status = 'fully_down';
    } else if (text.includes('partial') || text.includes('degraded') || text.includes('incident')) {
      status = 'partially_down';
    }
    // No incident details from scrape
    return { status, lastChecked: new Date(), latestIncidentTitle: undefined, latestIncidentSummary: undefined, latestIncidentAt: undefined };
  } catch (e) {
    return { status: 'partially_down', lastChecked: new Date(), latestIncidentTitle: undefined, latestIncidentSummary: undefined, latestIncidentAt: undefined };
  }
}

app.get('/', (req, res) => {
  res.send('StatusPage backend is running!');
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  // Check if auth already exists
  const existingAuth = await findAuthByEmail(email);
  if (existingAuth) return res.status(409).json({ error: 'User already exists' });
  // Create user and auth
  const passwordHash = await bcrypt.hash(password, 10);
  const { user } = await addAuthAndUser(email, passwordHash);
  const token = generateToken({ id: user.id, email });
  res.json({ token });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const auth = await findAuthByEmail(email);
  if (!auth) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, auth.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = generateToken({ id: auth.userId, email: auth.email });
  res.json({ token });
});

// Example protected route
app.get('/api/me', authenticateToken, async (req, res) => {
  // Only return user id and email, not passwordHash
  const userId = (req as any).user.id;
  const auth = await prisma.auth.findFirst({ where: { userId } });
  res.json({ user: { id: userId, email: auth?.email } });
});

// --- Company endpoints ---
app.get('/api/companies', authenticateToken, async (req, res) => {
  const userId = (req as any).user.id;
  const companies = await getCompaniesByUser(userId);
  res.json(companies);
});

// Refresh all company statuses (for cron job)
app.post('/api/refresh-status', async (req, res) => {
  const companies = await prisma.company.findMany();
  let updated = 0;
  for (const company of companies) {
    const statusInfo = await fetchCompanyStatusFromRSS(company.statusPageUrl);
    const updateData: any = {
      status: statusInfo.status,
      lastChecked: statusInfo.lastChecked,
      latestIncidentTitle: statusInfo.latestIncidentTitle,
      latestIncidentSummary: statusInfo.latestIncidentSummary,
      latestIncidentAt: statusInfo.latestIncidentAt,
    };
    await prisma.company.update({
      where: { id: company.id },
      data: updateData,
    });
    // Record history
    await prisma.companyHistory.create({
      data: {
        companyId: company.id,
        status: statusInfo.status,
        incidentTitle: statusInfo.latestIncidentTitle,
        incidentSummary: statusInfo.latestIncidentSummary,
        incidentAt: statusInfo.latestIncidentAt,
      },
    });
    updated++;
  }
  res.json({ updated });
});

app.post('/api/companies', authenticateToken, async (req, res) => {
  const userId = (req as any).user.id;
  const { name, statusPageUrl } = req.body;
  if (!name || !statusPageUrl) return res.status(400).json({ error: 'Name and statusPageUrl required' });
  // Only RSS method is supported
  const statusInfo = await fetchCompanyStatusFromRSS(statusPageUrl);
  const company = {
    id: uuidv4(),
    userId,
    name,
    status: statusInfo.status,
    statusPageUrl,
    lastChecked: statusInfo.lastChecked,
    latestIncidentTitle: statusInfo.latestIncidentTitle,
    latestIncidentSummary: statusInfo.latestIncidentSummary,
    latestIncidentAt: statusInfo.latestIncidentAt,
  };
  const created = await addCompany(company);
  // Record initial history
  await prisma.companyHistory.create({
    data: {
      companyId: company.id,
      status: statusInfo.status,
      incidentTitle: statusInfo.latestIncidentTitle,
      incidentSummary: statusInfo.latestIncidentSummary,
      incidentAt: statusInfo.latestIncidentAt,
    },
  });
  res.json(created);
});

// Set CORS headers for all API responses
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  next();
});

// CORS preflight for DELETE /api/companies/:id
app.options('/api/companies/:id', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.status(200).end();
});

// Add endpoint to delete a company by id (must belong to user)
app.delete('/api/companies/:id', authenticateToken, async (req, res) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  // Only allow deleting companies owned by the user
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company || company.userId !== userId) {
    return res.status(404).json({ error: 'Company not found' });
  }
  await prisma.company.delete({ where: { id } });
  res.json({ success: true });
});

// Get status/incident history for a company (must belong to user)
app.get('/api/companies/:id/history', authenticateToken, async (req, res) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company || company.userId !== userId) {
    return res.status(404).json({ error: 'Company not found' });
  }
  const history = await prisma.companyHistory.findMany({
    where: { companyId: id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(history);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

export default app;

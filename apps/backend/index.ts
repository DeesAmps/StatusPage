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

async function fetchCompanyStatusFromRSS(statusPageUrl: string): Promise<{ status: string; lastChecked: Date }> {
  try {
    const feed = await rssParser.parseURL(statusPageUrl);
    // Heuristic: if any item title or content contains 'down', 'incident', or 'degraded', mark as down/partial
    let status: string = 'up';
    for (const item of feed.items) {
      const text = `${item.title || ''} ${item.content || ''}`.toLowerCase();
      if (text.includes('fully down') || text.includes('major outage')) {
        status = 'fully_down';
        break;
      } else if (text.includes('partial') || text.includes('degraded') || text.includes('incident')) {
        status = 'partially_down';
      }
    }
    return { status, lastChecked: new Date() };
  } catch (e) {
    // If RSS fetch fails, mark as partially_down
    return { status: 'partially_down', lastChecked: new Date() };
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

app.post('/api/companies', authenticateToken, async (req, res) => {
  const userId = (req as any).user.id;
  const { name, statusPageUrl } = req.body;
  if (!name || !statusPageUrl) return res.status(400).json({ error: 'Name and statusPageUrl required' });
  // Fetch status from RSS
  const { status, lastChecked } = await fetchCompanyStatusFromRSS(statusPageUrl);
  const company = {
    id: uuidv4(),
    userId,
    name,
    status,
    statusPageUrl,
    lastChecked,
  };
  const created = await addCompany(company);
  res.json(created);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

export default app;

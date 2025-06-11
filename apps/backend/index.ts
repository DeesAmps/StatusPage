import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { generateToken, authenticateToken } from './auth';
import { users, findUserByEmail, addUser } from './userStore';
import { Company, CompanyStatus, getCompaniesByUser, addCompany } from './companyStore';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('StatusPage backend is running!');
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (findUserByEmail(email)) return res.status(409).json({ error: 'User already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), email, passwordHash };
  addUser(user);
  const token = generateToken({ id: user.id, email: user.email });
  res.json({ token });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = generateToken({ id: user.id, email: user.email });
  res.json({ token });
});

// Example protected route
app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ user: (req as any).user });
});

// --- Company endpoints ---
app.get('/api/companies', authenticateToken, (req, res) => {
  const userId = (req as any).user.id;
  res.json(getCompaniesByUser(userId));
});

app.post('/api/companies', authenticateToken, (req, res) => {
  const userId = (req as any).user.id;
  const { name, statusPageUrl } = req.body;
  if (!name || !statusPageUrl) return res.status(400).json({ error: 'Name and statusPageUrl required' });
  // Placeholder: always set status to 'up' and lastChecked to now
  const company: Company = {
    id: uuidv4(),
    userId,
    name,
    status: 'up',
    statusPageUrl,
    lastChecked: new Date().toISOString(),
  };
  addCompany(company);
  res.json(company);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

export default app;

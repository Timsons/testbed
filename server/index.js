import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import testCasesRouter from './routes/test-cases.js';
import suitesRouter from './routes/suites.js';
import bugsRouter from './routes/bugs.js';
import runsRouter from './routes/runs.js';
import dashboardRouter from './routes/dashboard.js';
import reportsRouter from './routes/reports.js';
import settingsRouter from './routes/settings.js';
import { seedIfEmpty, seedSuitesIfEmpty, seedBugsIfEmpty, seedRunsIfEmpty, seedReportsIfEmpty } from './seed.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function handleGetHealth(req, res) {
  res.json({ success: true, data: { status: 'ok' }, error: null });
}

app.get('/api/health', handleGetHealth);

app.use('/api/test-cases', testCasesRouter);
app.use('/api/suites', suitesRouter);
app.use('/api/bugs', bugsRouter);
app.use('/api/runs', runsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

seedIfEmpty();
seedSuitesIfEmpty();
seedBugsIfEmpty();
seedRunsIfEmpty();
seedReportsIfEmpty();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

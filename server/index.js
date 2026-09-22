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

// Deployed behind a reverse proxy (Render, etc.) that terminates TLS —
// without this, req.protocol always reports 'http' even on an https
// request, which would break the Discord alert link below.
app.set('trust proxy', true);

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

// In production there's one deployed service, not separate client/server
// dev ports — this serves the client's built files and falls back to
// index.html for any non-API GET so React Router's client-side routes
// (e.g. /bugs/3) work on a hard refresh. In local dev, client/dist won't
// exist (the client runs on its own Vite dev server instead), so this is a
// no-op: express.static finds nothing and sendFile 404s harmlessly.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Not found. Run `npm run build` to generate client/dist.');
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

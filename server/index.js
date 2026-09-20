import express from 'express';
import cors from 'cors';
import testCasesRouter from './routes/test-cases.js';
import suitesRouter from './routes/suites.js';
import bugsRouter from './routes/bugs.js';
import { seedIfEmpty, seedSuitesIfEmpty, seedBugsIfEmpty } from './seed.js';

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

seedIfEmpty();
seedSuitesIfEmpty();
seedBugsIfEmpty();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

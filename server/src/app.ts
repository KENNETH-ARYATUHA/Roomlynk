// Builds the Express application: middleware first, then routes, then the
// error handler LAST. (Order matters in Express: requests flow top to bottom.)

import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authRouter } from './routes/auth';
import { landlordRouter } from './routes/landlord';
import { adminRouter } from './routes/admin';
import { roomsRouter } from './routes/rooms';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

// CORS: only our own frontend may call this API from a browser.
app.use(cors({ origin: config.clientOrigin }));
// Parse JSON request bodies into req.body (and refuse huge ones).
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/landlord', landlordRouter);
app.use('/api/admin', adminRouter);
app.use('/api/rooms', roomsRouter);

// Any /api/... URL we haven't defined.
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

app.use(errorHandler);

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const authRoutes = require('./features/auth/routes/authRoutes');
const schoolRoutes = require('./features/schools/routes/schoolRoutes');
const classRoutes = require('./features/classes/routes/classRoutes');
const subjectRoutes = require('./features/subjects/routes/subjectRoutes');
const contentNodeRoutes = require('./features/contentNodes/routes/contentNodeRoutes');
const noteRoutes = require('./features/notes/routes/noteRoutes');
const questionRoutes = require('./features/questions/routes/questionRoutes');
const testMetaRoutes = require('./features/testMeta/routes/testMetaRoutes');
const testRoutes = require('./features/tests/routes/testRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { success } = require('./utils/response');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

app.get('/', (req, res) => {
  return success(res, {
    message: 'School Management System API',
    data: { version: '1.0.0' },
  });
});

app.get('/health', (req, res) => {
  return success(res, {
    data: { status: 'ok', timestamp: new Date().toISOString() },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/content-nodes', contentNodeRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/test-meta', testMetaRoutes);
app.use('/api/tests', testRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

const express = require('express');

const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const articleRoutes = require('./routes/article.routes');

const app = express();

app.use(express.json());
app.use(logger);

app.get('/', (req, res) => {
  res.json({ message: 'Blog API is running. Try /api/articles' });
});

app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);

app.use(errorHandler); // always last

module.exports = app;

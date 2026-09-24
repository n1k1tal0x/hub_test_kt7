const express = require('express');
const routes = require('./api/routes');
const { AppError } = require('./errors');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', routes);

  // Централизованная обработка ошибок -- маппинг доменных ошибок в HTTP-коды.
  app.use((err, req, res, next) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  });

  return app;
}

module.exports = createApp;

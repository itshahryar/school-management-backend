let app;
let initError = null;

try {
  app = require('../src/app');
} catch (error) {
  console.error('Failed to initialize Express app on Vercel:', error);
  initError = {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
}

module.exports = (req, res) => {
  if (initError) {
    return res.status(500).json({
      status: 'error',
      message: 'Backend initialization failed on Vercel',
      error: initError,
    });
  }

  return app(req, res);
};

// Fails fast at startup instead of letting the app crash later, mid-request,
// with a cryptic error (e.g. "uri must be a string, got undefined").
const REQUIRED_ENV_VARS = ['PORT', 'MONGO_URI', 'JWT_SECRET'];

const checkEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  if (missing.length > 0) {
    console.error('Missing required environment variable(s):', missing.join(', '));
    console.error('Check your .env file against .env.example, then try again.');
    process.exit(1);
  }
};

module.exports = checkEnv;

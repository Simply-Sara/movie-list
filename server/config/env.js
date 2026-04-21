function validateEnv() {
  const required = ['JWT_SECRET', 'TMDB_API_KEY', 'NODE_ENV'];
  const errors = [];

  required.forEach(key => {
    if (!process.env[key] || process.env[key].trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
    }
  });

  if (process.env.NODE_ENV && !['production', 'development'].includes(process.env.NODE_ENV)) {
    errors.push('NODE_ENV must be either "production" or "development"');
  }

  if (process.env.PORT) {
    const portNum = Number(process.env.PORT);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      errors.push('PORT must be a valid port number (1-65535)');
    }
  } else {
    console.warn('Warning: PORT not set, defaulting to 3001');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters for security');
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(err => console.error(`  • ${err}`));
    console.error('\nPlease set these variables in your .env file or hosting panel.');
    process.exit(1);
  }
}

validateEnv();

module.exports = { validateEnv };

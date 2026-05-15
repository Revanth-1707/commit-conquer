export function validateRequiredEnv(requiredVars = ["STRIPE_KEY", "DB_URL"]) {
  const missingVars = requiredVars.filter((name) => !process.env[name]);

  if (missingVars.length > 0) {
    console.error(`
  ❌ ERROR: Missing required environment variables:
     ${missingVars.join(", ")}

     The server cannot start without these. Please check your .env file.
  `);
    process.exit(1);
  }
}

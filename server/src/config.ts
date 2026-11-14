// Reads settings from the .env file ONE time, in ONE place.
// Every other file imports `config` instead of touching process.env directly,
// so a missing setting fails loudly at startup, not randomly at 2am.

import 'dotenv/config'; // loads server/.env into process.env

const jwtSecret = process.env.JWT_SECRET ?? '';
if (jwtSecret.length < 16) {
  throw new Error('JWT_SECRET is missing or too short. Copy .env.example to .env and set it.');
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret,
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
};

import dotenv from 'dotenv';

const result = dotenv.config();

if (result.error) {
  console.warn('[env] Failed to load .env file:', result.error.message);
}

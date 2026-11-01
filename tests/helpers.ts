import { buildApp } from '../src/app.js';

export const TOKEN = 'jeton-de-test-0123456789abcdef0123456789';
export const auth = { authorization: `Bearer ${TOKEN}` };

export const testApp = () => buildApp({ token: TOKEN });

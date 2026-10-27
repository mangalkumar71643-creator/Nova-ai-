// Vercel entry points: each file maps to its URL (/api/chat, /api/health)
// and hands the request to the same handler the standalone server uses.
import { createHandler } from '../src/index.js';

export default createHandler();

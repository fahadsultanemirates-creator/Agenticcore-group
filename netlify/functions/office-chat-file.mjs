import { createFileHandler } from '../lib/chat-files.mjs';
const env=key=>globalThis.Netlify?.env.get(key)||process.env[key];
export default createFileHandler({env});
export const config={path:'/api/office-chat-file',rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:60,windowLimit:30}};

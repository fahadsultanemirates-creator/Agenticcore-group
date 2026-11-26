import OpenAI from 'openai';
import office from '../../dist/office-model.js';
import packages from '../../dist/owned-office-model.js';
import guide from '../../dist/office-assistant-model.js';
import { createChatHandler } from '../lib/chat-handler.mjs';
import { createClaudeClient } from '../lib/claude-client.mjs';
const env=key=>globalThis.Netlify?.env.get(key)||process.env[key];
// Claude (ANTHROPIC_API_KEY) is the primary provider; OpenAI remains only as a fallback while the Claude key is being configured.
const client=()=>env('ANTHROPIC_API_KEY')?createClaudeClient({apiKey:env('ANTHROPIC_API_KEY'),timeout:30000}):new OpenAI({apiKey:env('OPENAI_API_KEY'),baseURL:'https://api.openai.com/v1',timeout:30000,maxRetries:0});
export default createChatHandler({env,office,packages,guide,client});
export const config={path:'/api/office-chat',rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:60,windowLimit:30}};

import OpenAI from 'openai';
import office from '../../dist/office-model.js';
import packages from '../../dist/owned-office-model.js';
import guide from '../../dist/office-assistant-model.js';
import { createChatHandler } from '../lib/chat-handler.mjs';
const env=key=>globalThis.Netlify?.env.get(key)||process.env[key];
export default createChatHandler({env,office,packages,guide,client:()=>new OpenAI({apiKey:env('OPENAI_API_KEY'),baseURL:'https://api.openai.com/v1',timeout:35000,maxRetries:0})});
export const config={path:'/api/office-chat',rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:60,windowLimit:30}};

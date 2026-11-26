// Claude adapter for the office chat (server-side only).
// Exposes the same `responses.create()` shape the chat handler already uses, so the
// handler logic, validation and storage bridge stay unchanged. The key comes from
// the ANTHROPIC_API_KEY environment variable in Netlify and is never sent to the browser.
import Anthropic from '@anthropic-ai/sdk';

function dataUrlParts(url){const m=/^data:([^;]+);base64,(.*)$/s.exec(url||'');return m?{media_type:m[1],data:m[2]}:null}

// OpenAI Responses-style content -> Anthropic Messages content blocks.
export function toClaudeContent(content){
 if(typeof content==='string')return content;
 return content.map(part=>{
  if(part.type==='input_text')return {type:'text',text:part.text};
  if(part.type==='input_image'){const d=dataUrlParts(part.image_url);return d?{type:'image',source:{type:'base64',...d}}:{type:'text',text:'[Image attachment could not be read]'}}
  if(part.type==='input_file'){const d=dataUrlParts(part.file_data);if(d&&d.media_type==='application/pdf')return {type:'document',source:{type:'base64',...d},title:part.filename};return {type:'text',text:'[Attachment '+(part.filename||'file')+' is in a format the assistant cannot read directly. Ask the client to paste the relevant text or attach a PDF.]'}}
  return {type:'text',text:String(part.text||'')};
 });
}

// Anthropic requires alternating roles; merge consecutive same-role turns.
export function toClaudeMessages(input){
 const out=[];
 for(const m of input){
  const role=m.role==='assistant'?'assistant':'user';
  const blocks=toClaudeContent(m.content);
  const arr=typeof blocks==='string'?[{type:'text',text:blocks}]:blocks;
  const last=out.at(-1);
  if(last&&last.role===role)last.content.push(...arr);else out.push({role,content:[...arr]});
 }
 return out;
}

export function createClaudeClient({apiKey,timeout=30000,sdk}={}){
 const c=sdk||new Anthropic({apiKey,timeout,maxRetries:0});
 return {responses:{create:async args=>{
  const schema=args.text?.format?.schema;
  const res=await c.messages.create({
   model:args.model,
   max_tokens:args.max_output_tokens||1800,
   system:[{type:'text',text:args.instructions,cache_control:{type:'ephemeral'}}],
   messages:toClaudeMessages(args.input),
   ...(schema?{output_config:{format:{type:'json_schema',schema}}}:{})
  });
  const output_text=(res.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
  return {status:res.stop_reason==='end_turn'||res.stop_reason==='stop_sequence'?'completed':'incomplete',model:res.model,output_text,usage:{input_tokens:res.usage?.input_tokens,output_tokens:res.usage?.output_tokens}};
 }}};
}

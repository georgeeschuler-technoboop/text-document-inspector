import { timingSafeEqual } from 'node:crypto';
const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export default async function handler(req){
 if(req.method!=='POST')return reply(405,{error:'POST required.'});
 const {INSPECTOR_ACCESS_TOKEN:access,WATERMARKS_SERVICE_URL:url,WATERMARKS_SERVER_API_KEY:key}=process.env;
 if(!access||!url||!key)return reply(503,{error:'Backend not configured. Local checks remain available.'});
 const given=Buffer.from(req.headers.get('authorization')||''),expected=Buffer.from('Bearer '+access);
 if(given.length!==expected.length||!timingSafeEqual(given,expected))return reply(401,{error:'Enter the service access password.'});
 try{
 const endpoint=new URL('/inspect',url);if(endpoint.protocol!=='https:')return reply(503,{error:'Backend requires HTTPS.'});
 if(Number(req.headers.get('content-length')||0)>2900000)return reply(413,{error:'Server inspection limit is 2 MB.'});
 const reader=req.body?.getReader();if(!reader)return reply(400,{error:'Missing body.'});let chunks=[],size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2900000){await reader.cancel();return reply(413,{error:'Server inspection limit is 2 MB.'});}chunks.push(value);}
 const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(typeof body.name!=='string'||!/^.{1,180}\.(txt|md|markdown|docx)$/i.test(body.name)||/[\\/\x00-\x1f]/.test(body.name)||typeof body.file!=='string'||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.file))return reply(400,{error:'Invalid document name or encoding.'});
 if(Buffer.from(body.file,'base64').length>2*1024*1024)return reply(413,{error:'Server inspection limit is 2 MB.'});
 const upstream=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({name:body.name,file:body.file,detect:false}),signal:AbortSignal.timeout(20000)});
 if(!upstream.ok)return reply(502,{error:'Inspection backend returned an error.'});
 const result=await upstream.json();if(result.ok!==true)return reply(502,{error:'Backend could not inspect this document.'});
 return reply(200,{engine:'guillaumemeyer/watermarks-remover',engineVersion:process.env.WATERMARKS_ENGINE_VERSION||'Not recorded',mode:'inspection-only',aiWatermarkStatus:'Not assessed',result});
 }catch{return reply(502,{error:'Inspection failed or timed out. Original unchanged.'});}
}

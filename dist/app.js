'use strict';
const $=id=>document.getElementById(id),I=Inspector;
let original='',originalBytes=null,name='newsletter-original.md',metadata={},findings=[],styleFindings=[],selected=new Set(),revised='',changeList=[],sourceVersion=0;
const APP_VERSION='1.3.0';
let activeGuide={name:'Supplied Writing Style Guide 2.3',text:SEED.guide,sha256:null},upstreamResult=null;
const encode=s=>new TextEncoder().encode(s);
async function hash(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function download(data,filename,type='text/plain;charset=utf-8'){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function element(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function xml(s){if(/<!DOCTYPE|<!ENTITY/i.test(s))throw Error('XML with DTD or entity declarations is unsupported.');const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('Malformed document XML.');return d;}
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function wordText(d){
 const paragraphs=Array.from(d.getElementsByTagNameNS(W,'p')).filter(p=>!p.parentElement?.closest('p'));
 return paragraphs.map(p=>{let s='';const walk=n=>{for(const c of n.childNodes){if(c.nodeType!==1)continue;if(c.namespaceURI===W&&['del','moveFrom'].includes(c.localName))continue;if(c.namespaceURI===W&&c.localName==='t')s+=c.textContent;else if(c.namespaceURI===W&&c.localName==='tab')s+='\t';else if(c.namespaceURI===W&&['br','cr'].includes(c.localName))s+='\n';else walk(c);}};walk(p);return s;}).join('\n\n');
}
async function docx(bytes){
 const files=await I.unzip(bytes),main=xml(files.get('word/document.xml')),props={};
 for(const [path,content] of files){if(path.startsWith('docProps/')&&content){const d=xml(content);props[path]=Array.from(d.documentElement.children).map(e=>({property:e.localName,name:e.getAttribute('name')||undefined,value:e.textContent}));}}
 const partReports=[];let tracked=0,hidden=0;for(const [path,content] of files){if(path.startsWith('word/')&&content){const d=xml(content);tracked+=d.getElementsByTagNameNS(W,'ins').length+d.getElementsByTagNameNS(W,'del').length;hidden+=d.getElementsByTagNameNS(W,'vanish').length;if(/word\/(header\d*|footer\d*|footnotes|endnotes|comments)\.xml/.test(path)){const t=wordText(d);partReports.push({part:path,extractedCharacters:t.length,unicodeFindings:I.scan(t)});}}}
 return {text:wordText(main),meta:{type:'DOCX',properties:props,trackedChangeElements:tracked,hiddenTextMarkers:hidden,additionalTextParts:partReports,packageEntries:files.size,scope:'Main body and tables extracted as paragraphs, including inserted text and excluding deleted/move-from text. Header/footer/note/comment Unicode findings appear here, report-only. Hidden text may remain in extracted text. Formatting, drawings, embedded objects, relationships, custom XML and full revision history are not fully inspected. No metadata is removed; revised export is plain text. Original bytes are available unchanged.'}};
}
async function inspect(text,filename='pasted-text.txt',bytes=null,meta={}){
 const version=++sourceVersion;original=text;name=filename;originalBytes=bytes||encode(text);selected.clear();metadata={...meta,sourceName:name,originalBytes:originalBytes.byteLength,originalSHA256:'Calculating…',scope:meta.scope||'UTF-8 text / Markdown Unicode inspection. No source-document metadata is available. Markdown frontmatter and comments remain content; not parsed as provenance metadata.'};findings=I.scan(original);upstreamResult=null;$('upstreamReport').textContent='';$('upstreamStatus').textContent='Not run for this source.';styleFindings=activeGuide.text && activeGuide.text===SEED.guide?I.style(original,SEED.suggestions):[];$('source').value=text;$('status').textContent='Inspection ready. No changes selected.';render();
 try {const digest=await hash(originalBytes);if(version===sourceVersion){metadata.originalSHA256=digest;$('metadata').textContent=JSON.stringify(metadata,null,2);}}catch{if(version===sourceVersion){metadata.originalSHA256='Unavailable in this browser context';$('metadata').textContent=JSON.stringify(metadata,null,2);}}
}
function card(f,technical){
 const box=element('div',undefined,'finding'),label=element('label'),input=document.createElement('input');input.type='checkbox';input.checked=selected.has(f.id);input.disabled=technical?f.replacement===null:f.after===null;input.setAttribute('aria-label',technical?`${f.codepoint} at line ${f.line}, column ${f.column}`:f.title);input.onchange=()=>{input.checked?selected.add(f.id):selected.delete(f.id);update();};label.append(input);const body=element('div');body.append(element('strong',technical?`${f.codepoint} · ${f.name} · line ${f.line}, column ${f.column}`:f.title));body.append(element('p',technical?f.reason:`${f.rule} · ${f.kind}. ${f.reason}`,'small'));if(technical)body.append(element('code',f.context));else{body.append(element('p',f.before,'quote'));if(f.after!==null)body.append(element('p',f.after||'[Remove this passage]','quote'));}label.append(body);box.append(label);return box;
}
function render(){
 $('stats').replaceChildren();for(const [value,label] of [[Array.from(original).length,'characters'],[findings.length,'Unicode findings'],[styleFindings.length,'style candidates']]){const e=element('div',undefined,'stat');e.append(element('b',String(value)),element('span',label,'small'));$('stats').append(e);}
 $('technicalSummary').textContent=findings.length?'Review each character in context. Nothing is selected automatically.':'No findings in the scanned Unicode categories. This is not a watermark-free certification.';
 $('technical').replaceChildren(...findings.map(f=>card(f,true)));$('style').replaceChildren(...styleFindings.map(f=>card(f,false)));if(!styleFindings.length)$('style').append(element('p','No automated suggestions available for this guide/source combination. Consult the loaded guide for editorial review.'));$('metadata').textContent=JSON.stringify(metadata,null,2);update();
}
function update(){
 const tech=findings.filter(f=>selected.has(f.id)&&f.replacement!==null).map(f=>({...f,before:f.char,after:f.replacement,kind:'technical'}));
 const st=$('styleEnabled').checked?styleFindings.filter(f=>selected.has(f.id)&&f.after!==null):[];changeList=[...tech,...st].sort((a,b)=>a.offset-b.offset);
 try{revised=I.edits(original,changeList);}catch(e){$('status').textContent=e.message;return;}
 $('changeCount').textContent=`${tech.length} technical changes · ${st.length} optional style changes`;$('diff').replaceChildren();let at=0;for(const c of changeList){$('diff').append(document.createTextNode(I.visible(original.slice(at,c.offset))));if(c.before)$('diff').append(element('del',I.visible(c.before)));if(c.after)$('diff').append(element('ins',I.visible(c.after)));at=c.end;}$('diff').append(document.createTextNode(I.visible(original.slice(at))));$('revised').textContent=revised;$('originalView').textContent=original;
}
$('inspect').onclick=()=>inspect($('source').value);$('loadDraft').onclick=()=>inspect(SEED.draft,'newsletter-original.md');$('sample').onclick=()=>inspect('Technical test fixture (not your newsletter)\n\nHello\u200b world. A\u00a0space. soft\u00adhyphen.\nEmoji: 👩‍👩‍👧‍👦; Persian: می‌روم; RTL: \u2067שלום\u2069.\nAn em dash — for optional style review.','technical-sample.txt');
$('file').onchange=async event=>{const file=event.target.files[0];if(!file)return;$('status').textContent='Reading document…';try{if(file.size>10*1024*1024)throw Error('Maximum upload size is 10 MB.');const bytes=new Uint8Array(await file.arrayBuffer());if(/\.docx$/i.test(file.name)){const d=await docx(bytes);await inspect(d.text,file.name,bytes,d.meta);}else if(/\.(txt|md|markdown)$/i.test(file.name)){const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);await inspect(text,file.name,bytes,{type:'UTF-8 text'});}else throw Error('Choose a .txt, .md or .docx file.');}catch(e){$('status').textContent='Could not inspect: '+e.message+'. Previous inspection retained.';}event.target.value='';};
$('styleEnabled').onchange=()=>{$('style').hidden=!$('styleEnabled').checked;update();};$('reset').onclick=()=>{selected.clear();render();};
$('saveOriginal').onclick=()=>download(originalBytes,name,'application/octet-stream');$('saveRevised').onclick=()=>download(revised,/\.(md|markdown)$/i.test(name)?'revised.md':'revised.txt');
function report(){return {prototypeVersion:APP_VERSION,upstreamInspection:upstreamResult,createdAt:new Date().toISOString(),aiWatermarkStatus:'Not assessed; no inference about authorship',metadata,unicodeFindings:findings,styleGuide:{...activeGuide},styleReviewEnabled:$('styleEnabled').checked,styleCoverage:'Exact em-dash scan plus curated, exact-anchor newsletter suggestions. Other semantic rules require human review.',styleCandidates:styleFindings,acceptedChanges:changeList.map(c=>({id:c.id,offset:c.offset,end:c.end,before:c.before,after:c.after,rule:c.rule,kind:c.kind})),offsetConvention:'UTF-16 offsets; lines and code-point columns are 1-based',originalText:original,revisedText:revised};}
$('saveReport').onclick=()=>download(JSON.stringify(report(),null,2),'inspection-report.json','application/json');
$('saveDiff').onclick=()=>{const lines=['Text & Document Inspector — selected-change diff','Offsets refer to the original UTF-16 text. Unusual characters shown as U+ markers.',''];for(const c of changeList)lines.push(`@@ offset ${c.offset} @@`,'- '+I.visible(c.before),'+ '+I.visible(c.after),'');if(!changeList.length)lines.push('No changes selected.');download(lines.join('\n'),'inspection.diff.txt');};
$('source').oninput=()=>{$('status').textContent='Source edited. Click “Inspect pasted text” to update the report and preview. Downloads still refer to the last inspected source.';};

let guideGeneration=0;
async function setGuide(text,name){
 const generation=++guideGeneration;activeGuide={name,text,sha256:null};$('guide').textContent=text;
 const baseline=Boolean(text)&&text===SEED.guide;
 $('guideStatus').textContent= text ? name+' · '+(text.match(/(?:Version|v)\s*\d+(?:\.\d+)+/i)?.[0]||'Version not specified')+(baseline?' · Bundled editorial checks available.':' · Loaded for reference. New rules require editorial review; previous guide suggestions disabled.'):'No writing guide loaded.';
 selected.clear();styleFindings=baseline?I.style(original,SEED.suggestions):[];render();
 try{const digest=await hash(encode(text));if(generation===guideGeneration)activeGuide.sha256=digest;}catch{}
}
$('guideFile').onchange=async event=>{const f=event.target.files[0];if(!f)return;try{if(f.size>1024*1024)throw Error('Guide limit is 1 MB.');if(!/\.(md|txt|markdown)$/i.test(f.name))throw Error('Choose UTF-8 Markdown or text.');const text=new TextDecoder('utf-8',{fatal:true}).decode(await f.arrayBuffer());if(!text.trim())throw Error('Guide is empty.');await setGuide(text,f.name);}catch(e){$('guideStatus').textContent='Guide not replaced: '+e.message;}event.target.value='';};
$('restoreGuide').onclick=()=>setGuide(SEED.guide,'Supplied Writing Style Guide 2.3');
$('runUpstream').onclick=async()=>{
 if(location.protocol==='file:'){$('upstreamStatus').textContent='Server inspection needs the Netlify deployment. Local inspection remains available.';return;}
 if(originalBytes.length>2*1024*1024){$('upstreamStatus').textContent='Server inspection limit is 2 MB. Local inspection remains available.';return;}
 const version=sourceVersion;$('runUpstream').disabled=true;$('upstreamStatus').textContent='Sending original for inspection…';
 try{let binary='';for(let i=0;i<originalBytes.length;i+=32768)binary+=String.fromCharCode(...originalBytes.subarray(i,i+32768));
 const r=await fetch('/.netlify/functions/inspect',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+$('servicePassword').value},body:JSON.stringify({name,file:btoa(binary)}),signal:AbortSignal.timeout(25000)});
 const result=await r.json();if(!r.ok)throw Error(result.error||'Inspection unavailable.');if(version!==sourceVersion)return;
 upstreamResult=result;$('upstreamReport').textContent=JSON.stringify(result,null,2);$('upstreamStatus').textContent='Additional inspection complete. Original unchanged; AI watermark status remains not assessed.';
 }catch(e){if(version===sourceVersion)$('upstreamStatus').textContent='Additional inspection unavailable: '+e.message;}finally{$('runUpstream').disabled=false;}
};

setGuide(SEED.guide,'Supplied Writing Style Guide 2.3');inspect(SEED.draft,SEED.draft?'newsletter-original.md':'pasted-text.txt');

// Document views keep the original and selected changes separately readable.
function chooseView(view){
 for(const key of ['changes','original','revised']){
  document.getElementById('view-'+key).setAttribute('aria-pressed',String(key===view));
  document.getElementById(key==='changes'?'diff':key==='original'?'originalView':'revised').hidden=key!==view;
 }
 document.getElementById('originalView').textContent=original;
}
for(const view of ['changes','original','revised'])document.getElementById('view-'+view).onclick=()=>chooseView(view);
const workflowLinks=document.querySelectorAll('.steps a');
workflowLinks.forEach(a=>a.addEventListener('click',()=>{workflowLinks.forEach(b=>b.removeAttribute('aria-current'));a.setAttribute('aria-current','step');}));

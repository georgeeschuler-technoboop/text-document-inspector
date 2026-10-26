(function(root){
'use strict';
const special = new Map([[0x00ad,'SOFT HYPHEN'],[0x034f,'COMBINING GRAPHEME JOINER'],[0x061c,'ARABIC LETTER MARK'],[0x180e,'MONGOLIAN VOWEL SEPARATOR'],[0x200b,'ZERO WIDTH SPACE'],[0x200c,'ZERO WIDTH NON-JOINER'],[0x200d,'ZERO WIDTH JOINER'],[0x200e,'LEFT-TO-RIGHT MARK'],[0x200f,'RIGHT-TO-LEFT MARK'],[0x202a,'LEFT-TO-RIGHT EMBEDDING'],[0x202b,'RIGHT-TO-LEFT EMBEDDING'],[0x202c,'POP DIRECTIONAL FORMATTING'],[0x202d,'LEFT-TO-RIGHT OVERRIDE'],[0x202e,'RIGHT-TO-LEFT OVERRIDE'],[0x2060,'WORD JOINER'],[0x2066,'LEFT-TO-RIGHT ISOLATE'],[0x2067,'RIGHT-TO-LEFT ISOLATE'],[0x2068,'FIRST STRONG ISOLATE'],[0x2069,'POP DIRECTIONAL ISOLATE'],[0xfeff,'ZERO WIDTH NO-BREAK SPACE / BOM'],[0xfffd,'REPLACEMENT CHARACTER']]);
const cpLabel=c=>'U+'+c.toString(16).toUpperCase().padStart(4,'0');
function scan(text){
 const out=[]; let offset=0,line=1,column=1;
 for(const char of text){
  const cp=char.codePointAt(0);let name=special.get(cp), replacement=null, reason='May be meaningful for language, layout, or emoji. Review in context; retained by default.';
  if(/\p{Zs}/u.test(char)&&cp!==32){name='NONSTANDARD SPACE';replacement=' ';reason='May prevent a line break or set spacing. Replace with an ordinary space only if intentional.';}
  if(!name && (/\p{Cf}/u.test(char)||(/\p{Cc}/u.test(char)&&!['\n','\r','\t'].includes(char))))name='FORMAT / CONTROL CHARACTER';
  if((cp>=0xfe00&&cp<=0xfe0f)||(cp>=0xe0100&&cp<=0xe01ef))name='VARIATION SELECTOR';
  if(cp>=0xe0020&&cp<=0xe007f)name='TAG CHARACTER';
  if([0x200b,0x00ad,0xfeff].includes(cp)){replacement='';reason='Possible layout artifact. Removal can affect word separation or hyphenation; review first.';}
  if(name)out.push({id:'u'+offset,offset,end:offset+char.length,line,column,codepoint:cpLabel(cp),name,char,replacement,reason,context:text.slice(Math.max(0,offset-25),offset)+'⟦'+cpLabel(cp)+'⟧'+text.slice(offset+char.length,offset+char.length+25)});
  offset+=char.length;if(char==='\n'){line++;column=1;}else column++;
 }
 return out;
}
function edits(text,changes){
 const sorted=[...changes].sort((a,b)=>a.offset-b.offset);let end=0,out='';
 for(const c of sorted){if(c.offset<end||c.offset<0||c.end>text.length||text.slice(c.offset,c.end)!==c.before)throw Error('Overlapping or stale edits. Reinspect the source.');out+=text.slice(end,c.offset)+c.after;end=c.end;}
 return out+text.slice(end);
}
function visible(text){let out='',pos=0;for(const f of scan(text)){out+=text.slice(pos,f.offset)+'⟦'+f.codepoint+'⟧';pos=f.end;}return out+text.slice(pos);}
function style(text,seed){
 const out=[];
 for(const s of seed){let offset=text.indexOf(s.before);if(offset>=0&&text.indexOf(s.before,offset+1)<0)out.push({...s,offset,end:offset+s.before.length,kind:'editorial judgment'});}
 let i=0;for(const ch of text){if(ch==='—')out.push({id:'dash'+i,offset:i,end:i+1,before:ch,after:null,title:'Em dash: rewrite in context',rule:'Optional em-dash check',reason:'You selected em-dash review. Consider a period, comma, or sentence rewrite where appropriate; no automatic substitution.',kind:'exact character check'});i+=ch.length;}
 return out;
}
async function unzip(buffer,inflate){
 const data=new Uint8Array(buffer),v=new DataView(data.buffer,data.byteOffset,data.byteLength);if(data.length>10*1024*1024)throw Error('Maximum upload size is 10 MB.');
 let e=-1;for(let p=data.length-22;p>=Math.max(0,data.length-65557);p--)if(v.getUint32(p,true)===0x06054b50&&p+22+v.getUint16(p+20,true)===data.length){e=p;break;}
 if(e<0)throw Error('Not a supported DOCX ZIP container.');
 if(v.getUint16(e+4,true)||v.getUint16(e+6,true))throw Error('Multi-volume ZIP is unsupported.');
 let count=v.getUint16(e+10,true),p=v.getUint32(e+16,true),total=0;const files=new Map();
 if(count>2000)throw Error('Too many ZIP entries.');
 for(let n=0;n<count;n++){
  if(p+46>data.length||v.getUint32(p,true)!==0x02014b50)throw Error('Invalid ZIP directory.');
  const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),packed=v.getUint32(p+20,true),size=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),local=v.getUint32(p+42,true);
  if(p+46+nl+el+cl>data.length)throw Error('Truncated ZIP directory.');
  const name=new TextDecoder('utf-8',{fatal:true}).decode(data.slice(p+46,p+46+nl));p+=46+nl+el+cl;
  total+=size;if(total>30*1024*1024||size>5*1024*1024)throw Error('Expanded DOCX exceeds safety limits.');
  if(files.has(name))throw Error('Duplicate ZIP entry.');
  files.set(name,null);
  if(!/^(word\/.*\.xml|docProps\/.*\.xml|\[Content_Types\]\.xml)$/.test(name))continue;
  if(flags&1)throw Error('Encrypted DOCX is unsupported.');if(![0,8].includes(method))throw Error('Unsupported ZIP compression.');
  if(local+30>data.length||v.getUint32(local,true)!==0x04034b50)throw Error('Invalid ZIP entry.');
  const start=local+30+v.getUint16(local+26,true)+v.getUint16(local+28,true);if(start+packed>data.length)throw Error('Truncated ZIP data.');
  let bytes=data.slice(start,start+packed);
  if(method===8){
   if(inflate)bytes=await inflate(bytes,size);
   else {const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();let chunks=[],length=0;while(true){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>size||length>5*1024*1024){await reader.cancel();throw Error('Expanded entry exceeds declared size.');}chunks.push(r.value);}bytes=new Uint8Array(length);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}}
  }
  if(bytes.length!==size)throw Error('DOCX entry size mismatch.');
  // Verify CRC32 so corrupted archives are never silently accepted.
  let crc=0xffffffff;for(const b of bytes){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
  if(crc!==v.getUint32(p-(46+nl+el+cl)+16,true))throw Error('DOCX entry checksum mismatch.');
  files.set(name,new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 }
 if(!files.get('word/document.xml')||!files.get('[Content_Types].xml'))throw Error('Not a DOCX document.');return files;
}
root.Inspector={scan,edits,visible,style,unzip};if(typeof module!=='undefined')module.exports=root.Inspector;
})(globalThis);

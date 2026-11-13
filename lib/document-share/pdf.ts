import {documentLines} from './document';
import type {SharedDocument} from './document';

// Dependency-free PDF 1.4 writer: multipage selectable text, no remote service.
// The source uses Helvetica's WinAnsi encoding; unsupported glyphs are transliterated.
const printable=(s:string)=>s.normalize('NFKD').replace(/[\u2013\u2014]/g,'-')
  .replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[₱]/g,'PHP ')
  .replace(/[^\x20-\x7e]/g,'?');
const escapePdf=(s:string)=>printable(s).replace(/[\\()]/g,c=>`\\${c}`);
const wrap=(line:string,max=92)=>{
  const words=printable(line).split(/\s+/);const out:string[]=[];
  let current='';for(const word of words){
    if(!word)continue;
    if(word.length>max){if(current){out.push(current);current='';}for(let i=0;i<word.length;i+=max)out.push(word.slice(i,i+max));continue;}
    if((current?current.length+1:0)+word.length>max){out.push(current);current=word;} else current+=(current?' ':'')+word;
  }
  if(current||!line.trim())out.push(current);
  return out;
};
export function documentPdf(doc:NonNullable<SharedDocument>):Buffer {
  const lines=documentLines(doc).flatMap(s=>wrap(s));
  const perPage=49;const pages:string[][]=[];
  for(let i=0;i<lines.length;i+=perPage)pages.push(lines.slice(i,i+perPage));
  if(!pages.length)pages.push([]);
  const objects:string[]=[];
  const add=(content:string)=>{objects.push(content);return objects.length;};
  const catalog=add('');const pageTree=add('');
  const regular=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const ids:number[]=[];
  pages.forEach((batch,idx)=>{
    const commands=['0.76 0.15 0.18 rg','0 815 595 27 re f','1 1 1 rg','BT /F2 12 Tf 42 823 Td (AUTOCARE  /  CUSTOMER DOCUMENT) Tj ET','0.12 0.14 0.18 rg',
      'BT /F1 9 Tf 42 788 Td 14 TL',
      ...batch.flatMap((line,i)=>[`${i===0?'/F2 11 Tf':''} (${escapePdf(line)}) Tj T* ${i===0?'/F1 9 Tf':''}`]),'ET',
      `BT /F1 8 Tf 42 29 Td (Page ${idx+1} of ${pages.length}   |   AutoCare   |   Generated ${escapePdf(new Date().toISOString().slice(0,10))}) Tj ET`];
    const stream=commands.join('\n');const length=Buffer.byteLength(stream,'latin1');
    const contentId=add(`<< /Length ${length} >>\nstream\n${stream}\nendstream`);
    const pageId=add(`<< /Type /Page /Parent ${pageTree} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${contentId} 0 R >>`);
    ids.push(pageId);
  });
  objects[catalog-1]=`<< /Type /Catalog /Pages ${pageTree} 0 R >>`;
  objects[pageTree-1]=`<< /Type /Pages /Kids [${ids.map(n=>`${n} 0 R`).join(' ')}] /Count ${ids.length} >>`;
  const chunks=['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'];const offsets=[0];let size=Buffer.byteLength(chunks[0],'latin1');
  objects.forEach((body,i)=>{offsets.push(size);const obj=`${i+1} 0 obj\n${body}\nendobj\n`;
    chunks.push(obj);size+=Buffer.byteLength(obj,'latin1');});
  const xrefOffset=size;
  chunks.push(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach(offset=>chunks.push(`${String(offset).padStart(10,'0')} 00000 n \n`));
  chunks.push(`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return Buffer.from(chunks.join(''),'latin1');
}

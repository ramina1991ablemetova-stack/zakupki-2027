'use strict';
const storageKey='procurement-schedule-v1';
const columns=[['name','Наименование закупки'],['contractNumber','Номер договора'],['supplier','Поставщик / примечание'],['owner','Ответственный'],['contractAmount','Сумма договора, ₸ без НДС'],['deviation','Отклонение от суммы договора, ₸'],['material','Материал SAP'],['category','Вид затрат'],['status','Статус закупки']];
const sections={priority:'Первоочередные закупки',regular:'Непервоочередные закупки'};
const months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const monthKeys=months.flatMap((_,i)=>[`plan${i}`,`fact${i}`]);
const message=document.querySelector('#message');
// XLSX is a ZIP archive; store its small XML files without compression for offline use.
function zipFiles(files){
  const encoder=new TextEncoder(),parts=[],central=[];let offset=0;
  function bytes(size,write){const a=new Uint8Array(size);write(new DataView(a.buffer));return a;}
  function crc32(data){let crc=0xffffffff;for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
  for(const [name,content] of Object.entries(files)){
    const n=encoder.encode(name),data=encoder.encode(content),crc=crc32(data);
    const local=bytes(30,v=>{v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);});
    const entry=bytes(46,v=>{v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint32(16,crc,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,n.length,true);v.setUint32(42,offset,true);});
    parts.push(local,n,data);central.push(entry,n);offset+=local.length+n.length+data.length;
  }
  const size=central.reduce((sum,p)=>sum+p.length,0),end=bytes(22,v=>{v.setUint32(0,0x06054b50,true);v.setUint16(8,Object.keys(files).length,true);v.setUint16(10,Object.keys(files).length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);});
  return new Blob([...parts,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function makeWorkbook(saved){
  const esc=s=>String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const text=(s,style=2)=>`<c s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(s)}</t></is></c>`;
  const money=(s,banded=false)=>{const style=banded?7:1;if(s===undefined||s==='')return `<c s="${style}"/>`;const n=BigInt(s),negative=n<0n,a=negative?-n:n;return `<c s="${style}"><v>${negative?'-':''}${a/100n}.${(a%100n).toString().padStart(2,'0')}</v></c>`;};
  const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
  const merges=['A1:AG1',...columns.map((_,i)=>`${col(i)}2:${col(i)}3`)];
  const header=columns.map(([,label])=>text(label,3));
  months.forEach((m,i)=>{const start=columns.length+i*2;header.push(text(m,3),text('',3));merges.push(`${col(start)}2:${col(start+1)}2`);});
  const lines=[[text('Сетевой график закупок — 2027',5),...Array(32).fill(text('',5))],header,columns.map(()=>text('',3)).concat(months.flatMap(()=>[text('План',6),text('Факт',6)]))],heights=[48,36,24];
  for(const [section,title] of Object.entries(sections)){
    const rowNumber=lines.length+1,categoryStyle=section==='priority'?4:6;lines.push([text(title,categoryStyle),...Array(32).fill(text('',categoryStyle))]);heights.push(26);merges.push(`A${rowNumber}:AG${rowNumber}`);
    saved.filter(row=>(row.section||'priority')===section).forEach((row,index)=>{
      const banded=index%2===1;
      lines.push(columns.map(([key])=>key==='contractAmount'||key==='deviation'?money(row[key],banded):text(row[key]||'',banded?8:2)).concat(monthKeys.map(key=>money(row[key],banded))));
      const widths=[28,20,24,24,22,22,20,20,20];
      const wrapped=columns.reduce((max,[key],i)=>Math.max(max,String(row[key]||'').split(/\r\n|\r|\n/).reduce((sum,part)=>sum+Math.max(1,Math.ceil([...part].length/(widths[i]-2))),0)),1);
      heights.push(Math.min(409,Math.max(24,wrapped*16+8)));
    });
  }
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane xSplit="2" ySplit="3" topLeftCell="C4" activePane="bottomRight" state="frozen"/><selection pane="topRight" activeCell="C1" sqref="C1"/><selection pane="bottomLeft" activeCell="A4" sqref="A4"/><selection pane="bottomRight" activeCell="C4" sqref="C4"/></sheetView></sheetViews><cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="20" customWidth="1"/><col min="3" max="4" width="24" customWidth="1"/><col min="5" max="6" width="22" customWidth="1"/><col min="7" max="9" width="20" customWidth="1"/><col min="10" max="33" width="19" customWidth="1"/></cols><sheetData>${lines.map((cells,i)=>`<row r="${i+1}" ht="${heights[i]}" customHeight="1">${cells.join('')}</row>`).join('')}</sheetData><mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells></worksheet>`;
  return zipFiles({
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="График 2027" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml':"<?xml version=\"1.0\" encoding=\"UTF-8\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><numFmts count=\"1\"><numFmt numFmtId=\"164\" formatCode=\"#,##0.00 &quot;₸&quot;\"/></numFmts><fonts count=\"4\"><font><sz val=\"11\"/><color rgb=\"FF182B3A\"/><name val=\"Arial\"/></font><font><b/><sz val=\"11\"/><color rgb=\"FFFFFFFF\"/><name val=\"Arial\"/></font><font><b/><sz val=\"20\"/><color rgb=\"FF064C50\"/><name val=\"Arial\"/></font><font><b/><sz val=\"11\"/><color rgb=\"FF12383A\"/><name val=\"Arial\"/></font></fonts><fills count=\"7\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FF087B73\"/><bgColor indexed=\"64\"/></patternFill></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FF005C57\"/><bgColor indexed=\"64\"/></patternFill></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFD9F2EF\"/><bgColor indexed=\"64\"/></patternFill></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFA5E3DC\"/><bgColor indexed=\"64\"/></patternFill></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFF0F8F7\"/><bgColor indexed=\"64\"/></patternFill></fill></fills><borders count=\"2\"><border/><border><left style=\"thin\"><color rgb=\"FF75B8B4\"/></left><right style=\"thin\"><color rgb=\"FF75B8B4\"/></right><top style=\"thin\"><color rgb=\"FF75B8B4\"/></top><bottom style=\"thin\"><color rgb=\"FF75B8B4\"/></bottom></border></borders><cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs><cellXfs count=\"9\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/><xf numFmtId=\"164\" fontId=\"0\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyNumberFormat=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment vertical=\"center\" horizontal=\"right\" wrapText=\"1\"/></xf><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyBorder=\"1\" applyAlignment=\"1\"><alignment vertical=\"center\" wrapText=\"1\"/></xf><xf numFmtId=\"0\" fontId=\"1\" fillId=\"2\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment horizontal=\"center\" vertical=\"center\" wrapText=\"1\"/></xf><xf numFmtId=\"0\" fontId=\"1\" fillId=\"3\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment vertical=\"center\" wrapText=\"1\"/></xf><xf numFmtId=\"0\" fontId=\"2\" fillId=\"4\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment vertical=\"center\" wrapText=\"1\"/></xf><xf numFmtId=\"0\" fontId=\"3\" fillId=\"5\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment vertical=\"center\" wrapText=\"1\"/></xf><xf numFmtId=\"164\" fontId=\"0\" fillId=\"6\" borderId=\"1\" xfId=\"0\" applyNumberFormat=\"1\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment vertical=\"center\" horizontal=\"right\" wrapText=\"1\"/></xf><xf numFmtId=\"0\" fontId=\"0\" fillId=\"6\" borderId=\"1\" xfId=\"0\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment vertical=\"center\" wrapText=\"1\"/></xf></cellXfs></styleSheet>",
    'xl/worksheets/sheet1.xml':sheet
  });
}
document.querySelector('#export-excel').addEventListener('click',()=>{try{if(!readable)throw new Error();const saved=JSON.parse(localStorage.getItem(storageKey)||'[]'),file=makeWorkbook(saved),url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download='График закупок 2027.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{message.textContent='Не удалось сформировать файл Excel. Проверьте сохранённые данные и повторите попытку.';}});
let rows=[],readable=true;
let mode='view',author='';
function parseMoney(value,signed=false){const v=value.trim().replace(/\s*₸$/,'').replace(/[\s\u00a0\u202f]/g,'').replace(',','.');if(!(signed?/^-?\d+(?:\.\d{1,2})?$/:/^\d+(?:\.\d{1,2})?$/).test(v))return null;const neg=v.startsWith('-'),[whole,fraction='']=(neg?v.slice(1):v).split('.');const n=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));return neg?-n:n;}
function formatMoney(value){const n=BigInt(value),neg=n<0n,a=neg?-n:n;return `${neg?'-':''}${(a/100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ')},${(a%100n).toString().padStart(2,'0')}`;}
function amount(row,key){return typeof row[key]==='string'&&/^-?\d+$/.test(row[key])?BigInt(row[key]):0n;}
function calculated(row,key){if(key.startsWith('diff')){const i=key.slice(4);return amount(row,'fact'+i)-amount(row,'plan'+i);}const plan=months.reduce((sum,_,i)=>sum+amount(row,'plan'+i),0n),fact=months.reduce((sum,_,i)=>sum+amount(row,'fact'+i),0n);if(key==='totalPlan')return plan;if(key==='totalFact')return fact;return row.contractAmount?amount(row,'contractAmount')-fact:null;}
function percent(numerator,denominator){if(denominator<=0n)return '—';const negative=numerator<0n,n=negative?-numerator:numerator,rounded=(n*10000n+denominator/2n)/denominator;return `${rounded===0n?'':negative?'-':'+'}${rounded/100n},${(rounded%100n).toString().padStart(2,'0')} %`;}
function showPercent(el,numerator,denominator,indicate=false){el.textContent=percent(numerator,denominator);el.classList.remove('deviation-orange','deviation-red');el.removeAttribute('title');if(indicate&&denominator>0n){const magnitude=numerator<0n?-numerator:numerator;if(magnitude*5n>=denominator){el.classList.add('deviation-red');const warning=document.createElement('span');warning.className='percent-warning';warning.textContent='Отклонение 20 % и более';el.append(warning);}else if(magnitude*10n>=denominator)el.classList.add('deviation-orange');}}
function persist(){if(!readable)return false;try{localStorage.setItem(storageKey,JSON.stringify(rows));message.textContent=document.querySelector('input[aria-invalid="true"]')?'Исправьте выделенные денежные значения: они пока не сохранены.':'';return true;}catch{message.textContent='Не удалось сохранить изменения. Измените ячейку ещё раз, чтобы повторить сохранение.';return false;}}
function shownValue(value,money){return value===''?'Пусто':money?formatMoney(value)+' ₸':value;}
function historyInfo(entry){return `Автор: ${entry.author}; дата и время: ${new Date(entry.time).toLocaleString('ru-RU')}; прежнее значение: ${shownValue(entry.old,entry.money)}`;}
function updateMarker(wrapper,row,key){const input=wrapper.querySelector('input');input.classList.toggle('changed-cell',(row.history||[]).some(item=>item.key===key));}
function renderHistory(){const root=document.querySelector('#history-list'),dateFilter=document.querySelector('#history-date').value,search=document.querySelector('#history-search').value.trim().toLocaleLowerCase('ru-RU');root.replaceChildren();const entries=rows.flatMap(row=>(row.history||[])).sort((a,b)=>b.time.localeCompare(a.time)).filter(entry=>{const d=new Date(entry.time),local=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');return(!dateFilter||local===dateFilter)&&(!search||entry.purchase.toLocaleLowerCase('ru-RU').includes(search));});document.querySelector('#history-empty').hidden=entries.length>0;entries.forEach(entry=>{const item=document.createElement('tr'),d=new Date(entry.time),values=[d.toLocaleDateString('ru-RU'),d.toLocaleTimeString('ru-RU'),entry.author,entry.purchase,entry.label,shownValue(entry.old,entry.money),shownValue(entry.new,entry.money)];values.forEach((value,i)=>{const cell=document.createElement('td');cell.textContent=value;if(i===5)cell.className='history-old';if(i===6)cell.className='history-new';item.append(cell);});root.append(item);});}
function isEmptyPurchase(row){
  return columns.every(([key])=>!row[key])&&monthKeys.every(key=>!row[key])&&!row.amount&&!row.need;
}
function addEmptyRows(){for(const section of Object.keys(sections))if(!rows.some(row=>row.section===section&&isEmptyPurchase(row)))rows.push({section});}
function updateTotal(){const sum=rows.reduce((n,row)=>n+(typeof row.amount==='string'&&/^\d+$/.test(row.amount)?BigInt(row.amount):0n),0n);document.querySelector('#total').textContent=`${formatMoney(sum)} ₸`;}
function makeInput(row,key,label,section,money=false){
  const wrapper=document.createElement('div');wrapper.className='input-wrap';const input=document.createElement('input');input.type='text';input.autocomplete='off';input.readOnly=mode!=='edit';input.setAttribute('aria-label',label);if(money)input.inputMode='decimal';input.value=money&&row[key]?formatMoney(row[key])+' ₸':row[key]||'';wrapper.append(input);updateMarker(wrapper,row,key);
  input.addEventListener('input',()=>{
    if(mode!=='edit')return;const old=row[key]||'';let next=input.value;
    if(money){const value=next.trim()?parseMoney(next,key==='deviation'):0n;if(value===null){input.setAttribute('aria-invalid','true');message.textContent='Введите сумму с не более чем двумя знаками после запятой. План, факт и сумма договора не могут быть отрицательными.';return;}input.removeAttribute('aria-invalid');next=next.trim()?value.toString():'';}
    row[key]=next;if(old!==next){row.history||=[];row.history.push({key,label,purchase:row.name||`Закупка ${rows.filter(r=>r.section===section).indexOf(row)+1} (${sections[section]})`,author,time:new Date().toISOString(),old,new:next,money});if(persist()){updateMarker(wrapper,row,key);renderHistory();}else{row.history.pop();row[key]=old;return;}}else persist();
    refresh(section);const before=rows.length;addEmptyRows();if(rows.length!==before){persist();const start=input.selectionStart,end=input.selectionEnd;const inputs=[...document.querySelectorAll(`#${section}-table input`)];const index=inputs.indexOf(input);const invalid=inputs.map((el,i)=>({el,i})).filter(x=>x.el.getAttribute('aria-invalid')==='true').map(x=>({i:x.i,value:x.el.value}));renderSection(section);const nextInputs=document.querySelectorAll(`#${section}-table input`);invalid.forEach(x=>{if(nextInputs[x.i]){nextInputs[x.i].value=x.value;nextInputs[x.i].setAttribute('aria-invalid','true');}});if(nextInputs[index]){nextInputs[index].focus();if(start!==null)nextInputs[index].setSelectionRange(start,end);}}
  });
  if(money){input.addEventListener('focus',()=>{if(!input.readOnly&&input.getAttribute('aria-invalid')!=='true'&&row[key])input.value=formatMoney(row[key]);});input.addEventListener('blur',()=>{if(input.getAttribute('aria-invalid')!=='true'&&row[key])input.value=formatMoney(row[key])+' ₸';});}return wrapper;
}
function renderSection(section){
  const root=document.querySelector(`#${section}-table`);root.replaceChildren();
  rows.filter(row=>row.section===section).forEach((row,index)=>{
    const card=document.createElement('article');card.className='purchase-card';card.dataset.row=index;
    const title=document.createElement('h4');title.textContent=`Закупка ${index+1}`;card.append(title);
    const details=document.createElement('div');details.className='purchase-details';
    columns.forEach(([key,label])=>{const field=document.createElement('div'),caption=document.createElement('span');field.className='detail-field';caption.textContent=label;field.append(caption,makeInput(row,key,`${label}, ${sections[section]}, закупка ${index+1}`,section,key==='contractAmount'||key==='deviation'));details.append(field);});card.append(details);
    const table=document.createElement('table');table.className='monthly-table';table.setAttribute('aria-label',`Помесячный план и факт, ${sections[section]}, закупка ${index+1}`);
    const head=document.createElement('thead'),header=document.createElement('tr'),first=document.createElement('th');first.textContent='Показатель';first.scope='col';header.append(first);
    months.forEach(month=>{const th=document.createElement('th');th.scope='col';th.textContent=month.slice(0,3);th.title=month;header.append(th);});head.append(header);table.append(head);
    const body=document.createElement('tbody');
    [['plan','План'],['fact','Факт'],['diff','Отклонение, ₸'],['percent','Отклонение, %']].forEach(([kind,label])=>{const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=label;tr.append(th);months.forEach((month,i)=>{const td=document.createElement('td');td.dataset.month=month;if(kind==='diff')td.dataset.calc=`diff${i}`;else if(kind==='percent')td.dataset.percent=i;else td.append(makeInput(row,kind+i,`${month} 2027, ${label}, ${sections[section]}, закупка ${index+1}`,section,true));tr.append(td);});body.append(tr);});table.append(body);card.append(table);
    const totals=document.createElement('div');totals.className='row-totals';[['totalPlan','Итого план'],['totalFact','Итого факт'],['balance','Остаток по договору'],['utilization','Освоение договора, %']].forEach(([key,label])=>{const item=document.createElement('div'),span=document.createElement('span'),strong=document.createElement('strong');span.textContent=label;if(key==='utilization')strong.dataset.utilization='';else strong.dataset.calc=key;item.append(span,strong);totals.append(item);});card.append(totals);root.append(card);
  });
  const summary=document.createElement('div');summary.className='section-totals';summary.innerHTML='<h4>Итого по разделу</h4><div class="summary-grid"></div>';root.append(summary);refresh(section);
}
function refresh(section){
  const root=document.querySelector(`#${section}-table`),list=rows.filter(row=>row.section===section);
  root.querySelectorAll('.purchase-card').forEach(card=>{const row=list[Number(card.dataset.row)];card.querySelectorAll('[data-calc]').forEach(el=>{const n=calculated(row,el.dataset.calc);el.textContent=n===null?'—':formatMoney(n)+' ₸';});card.querySelectorAll('[data-percent]').forEach(el=>{const i=el.dataset.percent,plan=amount(row,'plan'+i);showPercent(el,amount(row,'fact'+i)-plan,plan,true);});showPercent(card.querySelector('[data-utilization]'),calculated(row,'totalFact'),amount(row,'contractAmount'));});
  const grid=root.querySelector('.summary-grid');if(!grid)return;grid.replaceChildren();
  const entries=[['contractAmount','Сумма договоров'],['deviation','Отклонение от суммы договора'],...months.flatMap((month,i)=>[[`plan${i}`,`${month}: план`],[`fact${i}`,`${month}: факт`],[`diff${i}`,`${month}: отклонение`]]),['totalPlan','Итого план'],['totalFact','Итого факт'],['balance','Остаток по договорам']];
  entries.forEach(([key,label])=>{let sum=0n,present=false;list.forEach(row=>{const n=key.startsWith('diff')||['totalPlan','totalFact','balance'].includes(key)?calculated(row,key):amount(row,key);if(n!==null){sum+=n;present=true;}});const item=document.createElement('div'),name=document.createElement('span'),value=document.createElement('strong');name.textContent=label;value.textContent=present?formatMoney(sum)+' ₸':'—';item.append(name,value);grid.append(item);});
  function addPercent(label,numerator,denominator,indicate=false){const item=document.createElement('div'),name=document.createElement('span'),value=document.createElement('strong');name.textContent=label;showPercent(value,numerator,denominator,indicate);item.append(name,value);grid.append(item);}
  months.forEach((month,i)=>{const plan=list.reduce((sum,row)=>sum+amount(row,'plan'+i),0n),fact=list.reduce((sum,row)=>sum+amount(row,'fact'+i),0n);addPercent(`${month}: отклонение, %`,fact-plan,plan,true);});
  addPercent('Освоение договоров, %',list.reduce((sum,row)=>sum+calculated(row,'totalFact'),0n),list.reduce((sum,row)=>sum+amount(row,'contractAmount'),0n));
}
function readSavedRows(){
  const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');
  if(!Array.isArray(saved)||!saved.every(row=>
    row&&typeof row==='object'&&!Array.isArray(row)&&
    (row.section===undefined||Object.hasOwn(sections,row.section))&&
    columns.every(([key])=>row[key]===undefined||typeof row[key]==='string')&&
    ['contractAmount','deviation'].every(key=>!row[key]||/^-?\d+$/.test(row[key]))&&
    (row.amount===undefined||(typeof row.amount==='string'&&/^\d+$/.test(row.amount)))&&
    monthKeys.every(key=>row[key]===undefined||row[key]===''||(typeof row[key]==='string'&&/^\d+$/.test(row[key])))
  ))throw new Error('Invalid data');
  return saved.map(row=>({...row,section:row.section||'priority'}));
}

const budgetFilters=document.querySelector('#budget-filters');
const budgetSection=document.querySelector('#budget-section');
const budgetStart=document.querySelector('#budget-start');
const budgetEnd=document.querySelector('#budget-end');
const budgetPeriodError=document.querySelector('#budget-period-error');
let budgetPeriod={start:0,end:months.length-1};

Object.entries(sections).forEach(([value,label])=>budgetSection.add(new Option(label,value)));
months.forEach((month,index)=>{
  budgetStart.add(new Option(month,index,index===0));
  budgetEnd.add(new Option(month,index,index===months.length-1));
});
budgetFilters.reset();

function updateBudgetPeriod(){
  const start=Number(budgetStart.value),end=Number(budgetEnd.value);
  const invalid=start>end;
  budgetStart.setAttribute('aria-invalid',String(invalid));
  budgetEnd.setAttribute('aria-invalid',String(invalid));
  budgetPeriodError.textContent=invalid
    ?`Начальный месяц не может быть позже конечного. Применённый период: ${months[budgetPeriod.start]} — ${months[budgetPeriod.end]}.`
    :'';
  if(invalid)return;
  budgetPeriod={start,end};
  renderBudget();
}

budgetSection.addEventListener('change',renderBudget);
budgetStart.addEventListener('change',updateBudgetPeriod);
budgetEnd.addEventListener('change',updateBudgetPeriod);
document.querySelector('#budget-reset').addEventListener('click',()=>{
  budgetFilters.reset();
  updateBudgetPeriod();
});

function renderBudget(){
  const summary=document.querySelector('#budget-summary');
  const status=document.querySelector('#budget-status');
  let purchases;
  try{
    purchases=readSavedRows().filter(row=>
      (!budgetSection.value||row.section===budgetSection.value)&&!isEmptyPurchase(row)
    );
  }catch{
    summary.hidden=true;
    status.textContent='Данные бюджета недоступны. Не удалось прочитать сохранённые данные.';
    return;
  }

  let plan=0n,fact=0n,hasMonthlyValues=false;
  for(const row of purchases){
    for(let month=budgetPeriod.start;month<=budgetPeriod.end;month++){
      const planKey=`plan${month}`,factKey=`fact${month}`;
      plan+=amount(row,planKey);
      fact+=amount(row,factKey);
      if(row[planKey]||row[factKey])hasMonthlyValues=true;
    }
  }
  status.textContent='';
  if(!purchases.length)status.textContent='За выбранный период закупок нет';
  else if(!hasMonthlyValues)status.textContent='За выбранный период нет сумм плана и факта';

  document.querySelector('#budget-plan').textContent=formatMoney(plan)+' ₸';
  document.querySelector('#budget-fact').textContent=formatMoney(fact)+' ₸';
  document.querySelector('#budget-difference').textContent=formatMoney(fact-plan)+' ₸';
  document.querySelector('#budget-execution').textContent=percent(fact,plan).replace(/^\+/,'');
  summary.hidden=false;
}

try{rows=readSavedRows();}catch{readable=false;message.textContent='Не удалось прочитать сохранённые данные. Сохранение отключено, чтобы не перезаписать их.';}
addEmptyRows();updateTotal();Object.keys(sections).forEach(section=>{
  const container=document.querySelector(`#${section}-table`);
  const button=document.createElement('button');button.type='button';button.className='add-purchase';button.textContent='+ Добавить закупку';
  button.disabled=mode!=='edit';button.addEventListener('click',()=>{if(mode!=='edit')return;rows.push({section});persist();renderSection(section);});
  container.before(button);renderSection(section);
});
renderHistory();
document.querySelector('#history-date').addEventListener('input',renderHistory);document.querySelector('#history-search').addEventListener('input',renderHistory);
const tabs=document.querySelectorAll('.tabs button');
tabs.forEach(button=>button.addEventListener('click',()=>{
  tabs.forEach(tab=>{
    const active=tab===button;
    tab.setAttribute('aria-pressed',String(active));
    document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;
  });
  if(button.id==='tab-budget')renderBudget();
}));
const modeDialog=document.querySelector('#mode-dialog'),accessForm=document.querySelector('#access-form'),accessCode=document.querySelector('#access-code'),accessError=document.querySelector('#access-error'),switchButton=document.querySelector('#switch-mode');
function setMode(next){mode=next;document.querySelector('#current-mode').textContent=next==='edit'?'Режим: редактирование':'Режим: просмотр';switchButton.hidden=false;document.querySelectorAll('.purchase-card input').forEach(input=>{input.readOnly=next!=='edit';});document.querySelectorAll('.add-purchase').forEach(button=>{button.disabled=next!=='edit';});accessCode.value='';accessError.textContent='';modeDialog.close();}
function openModeDialog(){accessForm.hidden=true;accessCode.value='';accessError.textContent='';modeDialog.showModal();}
document.querySelector('#view-mode').addEventListener('click',()=>setMode('view'));
document.querySelector('#edit-mode').addEventListener('click',()=>{accessForm.hidden=false;accessError.textContent='';accessCode.focus();});
accessForm.addEventListener('submit',event=>{event.preventDefault();if(accessCode.value!=='1991'){accessError.textContent='Доступ запрещён';accessCode.value='';accessCode.focus();return;}const name=document.querySelector('#author-name').value.trim();if(!name){accessError.textContent='Укажите имя автора.';document.querySelector('#author-name').focus();return;}author=name;setMode('edit');});
switchButton.addEventListener('click',openModeDialog);
modeDialog.addEventListener('cancel',event=>event.preventDefault());
openModeDialog();

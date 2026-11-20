'use strict';
const storageKey='procurement-schedule-v1';
const columns=[['name','Наименование закупки'],['contractNumber','Номер договора'],['supplier','Поставщик / примечание'],['owner','Ответственный'],['contractAmount','Сумма договора, ₸ без НДС'],['deviation','Отклонение от суммы договора, ₸'],['material','Материал SAP'],['category','Вид затрат'],['status','Статус закупки']];
const sections={priority:'Первоочередные закупки',regular:'Непервоочередные закупки'};
const months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const monthKeys=months.flatMap((_,i)=>[`plan${i}`,`fact${i}`]);
const message=document.querySelector('#message');
let rows=[],readable=true;
function parseMoney(value,signed=false){const v=value.trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.');if(!(signed?/^-?\d+(?:\.\d{1,2})?$/:/^\d+(?:\.\d{1,2})?$/).test(v))return null;const neg=v.startsWith('-'),[whole,fraction='']=(neg?v.slice(1):v).split('.');const n=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));return neg?-n:n;}
function formatMoney(value){const n=BigInt(value),neg=n<0n,a=neg?-n:n;return `${neg?'-':''}${(a/100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ')},${(a%100n).toString().padStart(2,'0')}`;}
function amount(row,key){return typeof row[key]==='string'&&/^-?\d+$/.test(row[key])?BigInt(row[key]):0n;}
function calculated(row,key){if(key.startsWith('diff')){const i=key.slice(4);return amount(row,'fact'+i)-amount(row,'plan'+i);}const plan=months.reduce((sum,_,i)=>sum+amount(row,'plan'+i),0n),fact=months.reduce((sum,_,i)=>sum+amount(row,'fact'+i),0n);if(key==='totalPlan')return plan;if(key==='totalFact')return fact;return row.contractAmount?amount(row,'contractAmount')-fact:null;}
function persist(){if(!readable)return;try{localStorage.setItem(storageKey,JSON.stringify(rows));message.textContent=document.querySelector('input[aria-invalid="true"]')?'Исправьте выделенные денежные значения: они пока не сохранены.':'';}catch{message.textContent='Не удалось сохранить изменения. Измените ячейку ещё раз, чтобы повторить сохранение.';}}
function addEmptyRows(){for(const section of Object.keys(sections))if(!rows.some(row=>row.section===section&&columns.every(([key])=>!row[key])&&monthKeys.every(key=>!row[key])&&!row.amount&&!row.need))rows.push({section});}
function updateTotal(){const sum=rows.reduce((n,row)=>n+(typeof row.amount==='string'&&/^\d+$/.test(row.amount)?BigInt(row.amount):0n),0n);document.querySelector('#total').textContent=`${formatMoney(sum)} ₸`;}
function makeInput(row,key,label,section,money=false){
  const input=document.createElement('input');input.type='text';input.autocomplete='off';input.setAttribute('aria-label',label);if(money)input.inputMode='decimal';input.value=money&&row[key]?formatMoney(row[key]):row[key]||'';
  input.addEventListener('input',()=>{
    if(money){const value=input.value.trim()?parseMoney(input.value,key==='deviation'):0n;if(value===null){row[key]='';input.setAttribute('aria-invalid','true');message.textContent='Введите сумму с не более чем двумя знаками после запятой. План, факт и сумма договора не могут быть отрицательными.';refresh(section);return;}input.removeAttribute('aria-invalid');row[key]=input.value.trim()?value.toString():'';}
    else row[key]=input.value;
    persist();refresh(section);const before=rows.length;addEmptyRows();if(rows.length!==before){persist();const start=input.selectionStart,end=input.selectionEnd;const inputs=[...document.querySelectorAll(`#${section}-table input`)];const index=inputs.indexOf(input);const invalid=inputs.map((el,i)=>({el,i})).filter(x=>x.el.getAttribute('aria-invalid')==='true').map(x=>({i:x.i,value:x.el.value}));renderSection(section);const next=document.querySelectorAll(`#${section}-table input`);invalid.forEach(x=>{if(next[x.i]){next[x.i].value=x.value;next[x.i].setAttribute('aria-invalid','true');}});if(next[index]){next[index].focus();if(start!==null)next[index].setSelectionRange(start,end);}}
  });
  if(money)input.addEventListener('blur',()=>{if(input.getAttribute('aria-invalid')!=='true'&&row[key])input.value=formatMoney(row[key]);});return input;
}
function renderSection(section){
  const root=document.querySelector(`#${section}-table`);root.replaceChildren();
  rows.filter(row=>row.section===section).forEach((row,index)=>{
    const card=document.createElement('article');card.className='purchase-card';card.dataset.row=index;
    const title=document.createElement('h4');title.textContent=`Закупка ${index+1}`;card.append(title);
    const details=document.createElement('div');details.className='purchase-details';
    columns.forEach(([key,label])=>{const field=document.createElement('label');field.textContent=label;field.append(makeInput(row,key,`${label}, ${sections[section]}, закупка ${index+1}`,section,key==='contractAmount'||key==='deviation'));details.append(field);});card.append(details);
    const table=document.createElement('table');table.className='monthly-table';table.setAttribute('aria-label',`Помесячный план и факт, ${sections[section]}, закупка ${index+1}`);
    const head=document.createElement('thead'),header=document.createElement('tr'),first=document.createElement('th');first.textContent='Показатель';first.scope='col';header.append(first);
    months.forEach(month=>{const th=document.createElement('th');th.scope='col';th.textContent=month.slice(0,3);th.title=month;header.append(th);});head.append(header);table.append(head);
    const body=document.createElement('tbody');
    [['plan','План'],['fact','Факт'],['diff','Отклонение']].forEach(([kind,label])=>{const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=label;tr.append(th);months.forEach((month,i)=>{const td=document.createElement('td');td.dataset.month=month;if(kind==='diff')td.dataset.calc=`diff${i}`;else td.append(makeInput(row,kind+i,`${month} 2027, ${label}, ${sections[section]}, закупка ${index+1}`,section,true));tr.append(td);});body.append(tr);});table.append(body);card.append(table);
    const totals=document.createElement('div');totals.className='row-totals';[['totalPlan','Итого план'],['totalFact','Итого факт'],['balance','Остаток по договору']].forEach(([key,label])=>{const item=document.createElement('div'),span=document.createElement('span'),strong=document.createElement('strong');span.textContent=label;strong.dataset.calc=key;item.append(span,strong);totals.append(item);});card.append(totals);root.append(card);
  });
  const summary=document.createElement('div');summary.className='section-totals';summary.innerHTML='<h4>Итого по разделу</h4><div class="summary-grid"></div>';root.append(summary);refresh(section);
}
function refresh(section){
  const root=document.querySelector(`#${section}-table`),list=rows.filter(row=>row.section===section);
  root.querySelectorAll('.purchase-card').forEach(card=>{const row=list[Number(card.dataset.row)];card.querySelectorAll('[data-calc]').forEach(el=>{const key=el.dataset.calc,n=calculated(row,key);el.textContent=n===null?'—':formatMoney(n);if(key.startsWith('diff')){const plan=amount(row,'plan'+key.slice(4)),difference=n<0n?-n:n;el.classList.toggle('deviation-alert',difference*10n>plan);}});});
  const grid=root.querySelector('.summary-grid');if(!grid)return;grid.replaceChildren();
  const entries=[['contractAmount','Сумма договоров'],['deviation','Отклонение от суммы договора'],...months.flatMap((month,i)=>[[`plan${i}`,`${month}: план`],[`fact${i}`,`${month}: факт`],[`diff${i}`,`${month}: отклонение`]]),['totalPlan','Итого план'],['totalFact','Итого факт'],['balance','Остаток по договорам']];
  entries.forEach(([key,label])=>{let sum=0n,present=false;list.forEach(row=>{const n=key.startsWith('diff')||['totalPlan','totalFact','balance'].includes(key)?calculated(row,key):amount(row,key);if(n!==null){sum+=n;present=true;}});const item=document.createElement('div'),name=document.createElement('span'),value=document.createElement('strong');name.textContent=label;value.textContent=present?formatMoney(sum):'—';item.append(name,value);grid.append(item);});
}
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(saved)||!saved.every(row=>row&&typeof row==='object'&&!Array.isArray(row)&&(row.section===undefined||Object.hasOwn(sections,row.section))&&columns.every(([key])=>row[key]===undefined||typeof row[key]==='string')&&['contractAmount','deviation'].every(key=>!row[key]||/^-?\d+$/.test(row[key]))&&(row.amount===undefined||(typeof row.amount==='string'&&/^\d+$/.test(row.amount)))&&monthKeys.every(key=>row[key]===undefined||row[key]===''||(typeof row[key]==='string'&&/^\d+$/.test(row[key])))))throw new Error('Invalid data');rows=saved.map(row=>({...row,section:row.section||'priority'}));}catch{readable=false;message.textContent='Не удалось прочитать сохранённые данные. Сохранение отключено, чтобы не перезаписать их.';}
addEmptyRows();updateTotal();Object.keys(sections).forEach(section=>{
  const container=document.querySelector(`#${section}-table`);
  const button=document.createElement('button');button.type='button';button.className='add-purchase';button.textContent='+ Добавить закупку';
  button.addEventListener('click',()=>{rows.push({section});persist();renderSection(section);});
  container.before(button);renderSection(section);
});

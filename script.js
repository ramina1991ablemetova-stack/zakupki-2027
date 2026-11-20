'use strict';
const storageKey = 'procurement-schedule-v1';
const columns = [ ['name','Наименование закупки'], ['contractNumber','Номер договора'], ['supplier','Поставщик / примечание'], ['owner','Ответственный'], ['contractAmount','Сумма договора, ₸ без НДС'], ['deviation','Отклонение от суммы договора, ₸'], ['material','Материал SAP'], ['category','Вид затрат'], ['status','Статус закупки'] ];
const sections = {priority:'Первоочередные закупки',regular:'Непервоочередные закупки'};
const message = document.querySelector('#message');
let rows = [], readable = true;
function parseMoney(value, signed) {
  const v=value.trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
  if (!(signed ? /^-?\d+(?:\.\d{1,2})?$/ : /^\d+(?:\.\d{1,2})?$/).test(v)) return null;
  const negative=v.startsWith('-'), [whole,fraction='']=(negative?v.slice(1):v).split('.');
  const n=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0')); return negative?-n:n;
}
function formatMoney(value) { const n=BigInt(value), neg=n<0n, a=neg?-n:n; return `${neg?'-':''}${(a/100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ')},${(a%100n).toString().padStart(2,'0')}`; }
function persist() {
  if(!readable) return false;
  try { localStorage.setItem(storageKey,JSON.stringify(rows)); message.textContent=document.querySelector('input[aria-invalid="true"]')?'Исправьте выделенные денежные значения: они пока не сохранены.':''; return true; }
  catch { message.textContent='Не удалось сохранить изменения. Данные остаются на странице; измените ячейку ещё раз, чтобы повторить сохранение.'; return false; }
}
function addEmptyRows() { for(const section of Object.keys(sections)) if(!rows.some(row=>row.section===section && columns.every(([key])=>!row[key]) && !row.amount && !row.need)) rows.push({section}); }
function updateTotal(){ const sum=rows.reduce((n,row)=>n+(typeof row.amount==='string'&&/^\d+$/.test(row.amount)?BigInt(row.amount):0n),0n); document.querySelector('#total').textContent=`${formatMoney(sum)} ₸`; }
function renderSection(section) {
  const target=document.querySelector(`#${section}-table`); target.replaceChildren();
  const wrap=document.createElement('div'); wrap.className='table-wrap'; wrap.tabIndex=0; wrap.setAttribute('role','region'); wrap.setAttribute('aria-label',`Таблица: ${sections[section]}`);
  const table=document.createElement('table'), thead=document.createElement('thead'), head=document.createElement('tr');
  for(const [,label] of columns){const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);} thead.append(head);table.append(thead);
  const tbody=document.createElement('tbody');
  rows.filter(row=>row.section===section).forEach((row,index)=>{
    const tr=document.createElement('tr');
    for(const [key,label] of columns){
      const td=document.createElement('td'), input=document.createElement('input'); input.type='text'; input.autocomplete='off'; input.setAttribute('aria-label',`${label}, ${sections[section]}, строка ${index+1}`);
      const money=key==='contractAmount'||key==='deviation'; if(money) input.inputMode='decimal';
      input.value=money&&row[key]!==undefined&&row[key]!==''?formatMoney(row[key]):row[key]||'';
      input.addEventListener('input',()=>{
        if(money){
          if(!input.value.trim()){row[key]='';input.removeAttribute('aria-invalid');persist();}
          else {const n=parseMoney(input.value,key==='deviation');if(n===null){input.setAttribute('aria-invalid','true');message.textContent='Укажите сумму с не более чем двумя знаками после запятой. Сумма договора не может быть отрицательной.';return;} input.removeAttribute('aria-invalid');row[key]=n.toString();persist();}
        } else {row[key]=input.value;persist();}
        const before=rows.length; addEmptyRows(); if(rows.length!==before){persist();appendEmptyRow(section,tbody);}
      });
      if(money) input.addEventListener('blur',()=>{if(input.getAttribute('aria-invalid')!=='true'&&row[key])input.value=formatMoney(row[key]);});
      td.append(input);tr.append(td);
    }
    tbody.append(tr);
  });
  table.append(tbody);wrap.append(table);target.append(wrap);
}
function appendEmptyRow(section,tbody){
  // Перерисовываем только после завершения ввода, сохраняя фокус в текущей ячейке.
  const current=document.activeElement, start=current.selectionStart, end=current.selectionEnd;
  const oldInputs=[...tbody.querySelectorAll('input')], index=oldInputs.indexOf(current), invalid=oldInputs.map((input,i)=>({input,i})).filter(item=>item.input.getAttribute('aria-invalid')==='true').map(item=>({i:item.i,value:item.input.value}));
  renderSection(section);
  const inputs=document.querySelector(`#${section}-table`).querySelectorAll('input');
  for(const item of invalid){inputs[item.i].value=item.value;inputs[item.i].setAttribute('aria-invalid','true');}
  const next=inputs[index];
  if(next){next.focus();if(start!==null)next.setSelectionRange(start,end);}
}
try {
  const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');
  if(!Array.isArray(saved)||!saved.every(row=>row&&typeof row==='object'&&!Array.isArray(row)&&(row.section===undefined||Object.hasOwn(sections,row.section))&&columns.every(([key])=>row[key]===undefined||typeof row[key]==='string')&&['contractAmount','deviation'].every(key=>!row[key]||/^-?\d+$/.test(row[key]))&&(row.amount===undefined||(typeof row.amount==='string'&&/^\d+$/.test(row.amount)))))throw new Error('Invalid data');
  rows=saved.map(row=>({...row,section:row.section||'priority'}));
} catch {readable=false;message.textContent='Не удалось прочитать сохранённые данные. Сохранение отключено, чтобы не перезаписать их.';}
addEmptyRows(); updateTotal(); Object.keys(sections).forEach(renderSection);

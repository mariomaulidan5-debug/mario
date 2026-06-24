/* =====================================================================
   DUITKU — Catatan Keuangan Harian
   Semua data disimpan di localStorage. Tidak ada server/database.
===================================================================== */

const LS_KEYS = {
  TRX: 'duitku_transactions',
  GOALS: 'duitku_goals',
  BUDGETS: 'duitku_budgets',
  THEME: 'duitku_theme'
};

const KATEGORI = {
  pemasukan: [
    {id:'gaji', label:'Gaji', icon:'fa-money-check-dollar'},
    {id:'bonus', label:'Bonus', icon:'fa-gift'},
    {id:'freelance', label:'Freelance', icon:'fa-laptop-code'},
    {id:'thr', label:'THR', icon:'fa-hand-holding-dollar'},
    {id:'hadiah', label:'Hadiah', icon:'fa-gifts'},
    {id:'lainnya_in', label:'Lainnya', icon:'fa-ellipsis'}
  ],
  pengeluaran: [
    {id:'makan', label:'Makan', icon:'fa-utensils'},
    {id:'minum', label:'Minum', icon:'fa-mug-hot'},
    {id:'nongkrong', label:'Nongkrong', icon:'fa-mug-saucer'},
    {id:'transportasi', label:'Transportasi', icon:'fa-bus'},
    {id:'bensin', label:'Bensin', icon:'fa-gas-pump'},
    {id:'belanja', label:'Belanja', icon:'fa-bag-shopping'},
    {id:'pulsa', label:'Pulsa', icon:'fa-mobile-screen'},
    {id:'internet', label:'Internet', icon:'fa-wifi'},
    {id:'hiburan', label:'Hiburan', icon:'fa-film'},
    {id:'kesehatan', label:'Kesehatan', icon:'fa-kit-medical'},
    {id:'pendidikan', label:'Pendidikan', icon:'fa-graduation-cap'},
    {id:'tagihan', label:'Tagihan', icon:'fa-file-invoice'},
    {id:'lainnya_out', label:'Lainnya', icon:'fa-ellipsis'}
  ]
};

/* ---------------------- STORAGE HELPERS ---------------------- */
function loadData(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){ return fallback; }
}
function saveData(key, data){
  localStorage.setItem(key, JSON.stringify(data));
}

let transactions = loadData(LS_KEYS.TRX, []);
let goals = loadData(LS_KEYS.GOALS, []);
let budgets = loadData(LS_KEYS.BUDGETS, []);

/* ---------------------- UTIL ---------------------- */
function formatRupiah(num){
  num = Math.round(Number(num) || 0);
  const neg = num < 0;
  num = Math.abs(num);
  const str = num.toLocaleString('id-ID');
  return (neg ? '-Rp ' : 'Rp ') + str;
}
function parseNumber(str){
  if(typeof str !== 'string') return Number(str) || 0;
  return Number(str.replace(/[^0-9]/g,'')) || 0;
}
function formatInputNumber(el){
  el.addEventListener('input', ()=>{
    const cleaned = parseNumber(el.value);
    el.value = cleaned ? cleaned.toLocaleString('id-ID') : '';
  });
}
function uid(){ return 'id_'+Date.now()+'_'+Math.random().toString(36).slice(2,8); }
function todayStr(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function monthKey(dateStr){ return dateStr.slice(0,7); }
function getKategoriInfo(jenis, kategoriId){
  const list = KATEGORI[jenis] || [];
  return list.find(k=>k.id===kategoriId) || {label: kategoriId, icon:'fa-circle'};
}
function showToast(msg, type='success'){
  const box = document.getElementById('toastBox');
  const el = document.createElement('div');
  el.className = 'toast' + (type==='error' ? ' error':'');
  el.innerHTML = `<i class="fa-solid ${type==='error'?'fa-circle-exclamation':'fa-circle-check'}" style="color:${type==='error'?'var(--red-500)':'var(--green-500)'}"></i><span>${msg}</span>`;
  box.appendChild(el);
  setTimeout(()=>{
    el.classList.add('out');
    setTimeout(()=>el.remove(), 300);
  }, 2800);
}

/* ---------------------- NAVIGATION ---------------------- */
const pageTitles = {
  dashboard:'Dashboard', tambah:'Tambah Transaksi', riwayat:'Riwayat Transaksi',
  statistik:'Statistik', kalender:'Kalender', target:'Target Menabung',
  budget:'Budget Bulanan', pengaturan:'Pengaturan'
};

function gotoPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.page===page));
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;
  closeSidebarMobile();
  if(page==='dashboard') renderDashboard();
  if(page==='riwayat') renderHistory();
  if(page==='statistik') renderStatistik();
  if(page==='kalender') renderCalendar();
  if(page==='target') renderGoals();
  if(page==='budget') renderBudgets();
  window.scrollTo({top:0, behavior:'smooth'});
}

document.querySelectorAll('.nav-item').forEach(btn=>{
  btn.addEventListener('click', ()=> gotoPage(btn.dataset.page));
});
document.querySelectorAll('[data-goto]').forEach(btn=>{
  btn.addEventListener('click', ()=> gotoPage(btn.dataset.goto));
});

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
document.getElementById('hamburgerBtn').addEventListener('click', ()=>{
  sidebar.classList.add('open'); overlay.classList.add('show');
});
overlay.addEventListener('click', closeSidebarMobile);
function closeSidebarMobile(){
  sidebar.classList.remove('open'); overlay.classList.remove('show');
}

/* ---------------------- DARK MODE ---------------------- */
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('darkModeBtn');
  btn.innerHTML = theme==='dark'
    ? '<i class="fa-solid fa-sun"></i><span>Mode Terang</span>'
    : '<i class="fa-solid fa-moon"></i><span>Mode Gelap</span>';
  saveData(LS_KEYS.THEME, theme);
}
document.getElementById('darkModeBtn').addEventListener('click', ()=>{
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current==='dark' ? 'light' : 'dark');
});

/* ---------------------- FORM: TAMBAH TRANSAKSI ---------------------- */
const jenisSeg = document.getElementById('jenisSeg');
const inputJenis = document.getElementById('inputJenis');
const inputKategori = document.getElementById('inputKategori');
const inputTanggal = document.getElementById('inputTanggal');
const inputNominal = document.getElementById('inputNominal');
const inputCatatan = document.getElementById('inputCatatan');
const editIdField = document.getElementById('editId');
const trxForm = document.getElementById('trxForm');

formatInputNumber(inputNominal);

function populateKategoriSelect(jenis){
  inputKategori.innerHTML = KATEGORI[jenis].map(k=>`<option value="${k.id}">${k.label}</option>`).join('');
}
jenisSeg.querySelectorAll('.seg-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    jenisSeg.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    inputJenis.value = btn.dataset.jenis;
    populateKategoriSelect(btn.dataset.jenis);
  });
});
populateKategoriSelect('pemasukan');
inputTanggal.value = todayStr();

trxForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const nominal = parseNumber(inputNominal.value);
  if(!nominal || nominal <= 0){
    showToast('Nominal harus lebih dari 0', 'error'); return;
  }
  if(!inputTanggal.value){
    showToast('Tanggal wajib diisi', 'error'); return;
  }
  const data = {
    id: editIdField.value || uid(),
    tanggal: inputTanggal.value,
    jenis: inputJenis.value,
    kategori: inputKategori.value,
    nominal: nominal,
    catatan: inputCatatan.value.trim()
  };
  if(editIdField.value){
    const idx = transactions.findIndex(t=>t.id===editIdField.value);
    if(idx>-1) transactions[idx] = data;
    showToast('Transaksi berhasil diperbarui!');
  } else {
    transactions.push(data);
    showToast('Transaksi berhasil ditambahkan!');
  }
  saveData(LS_KEYS.TRX, transactions);
  checkBudgetWarning(data);
  resetTrxForm();
  gotoPage('dashboard');
});

document.getElementById('resetFormBtn').addEventListener('click', ()=>{
  setTimeout(resetTrxForm, 0);
});

function resetTrxForm(){
  editIdField.value = '';
  inputTanggal.value = todayStr();
  inputCatatan.value = '';
  inputNominal.value = '';
  jenisSeg.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.jenis==='pemasukan'));
  inputJenis.value = 'pemasukan';
  populateKategoriSelect('pemasukan');
  trxForm.querySelector('.btn-primary').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan';
}

function editTransaction(id){
  const trx = transactions.find(t=>t.id===id);
  if(!trx) return;
  editIdField.value = trx.id;
  inputTanggal.value = trx.tanggal;
  inputCatatan.value = trx.catatan || '';
  inputNominal.value = trx.nominal.toLocaleString('id-ID');
  jenisSeg.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.jenis===trx.jenis));
  inputJenis.value = trx.jenis;
  populateKategoriSelect(trx.jenis);
  inputKategori.value = trx.kategori;
  trxForm.querySelector('.btn-primary').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update';
  gotoPage('tambah');
}

function deleteTransaction(id){
  if(!confirm('Hapus transaksi ini?')) return;
  transactions = transactions.filter(t=>t.id!==id);
  saveData(LS_KEYS.TRX, transactions);
  showToast('Transaksi dihapus');
  renderHistory(); renderDashboard();
}

document.getElementById('fabAdd').addEventListener('click', ()=>{
  resetTrxForm();
  gotoPage('tambah');
});

/* ---------------------- DASHBOARD ---------------------- */
let chartBulanan, chartVs, chartKategoriOut, chartKategoriIn;

function getMonthRange(year, month){
  // month: 0-indexed
  return transactions.filter(t=>{
    const d = new Date(t.tanggal);
    return d.getFullYear()===year && d.getMonth()===month;
  });
}

function animateValue(el, target){
  const start = 0;
  const duration = 800;
  const startTime = performance.now();
  function step(now){
    const progress = Math.min((now-startTime)/duration, 1);
    const eased = 1 - Math.pow(1-progress, 3);
    const value = start + (target-start)*eased;
    el.textContent = formatRupiah(value);
    if(progress < 1) requestAnimationFrame(step);
    else el.textContent = formatRupiah(target);
  }
  requestAnimationFrame(step);
}

function renderDashboard(){
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const monthTrx = getMonthRange(y, m);

  const totalSaldo = transactions.reduce((s,t)=> s + (t.jenis==='pemasukan'? t.nominal : -t.nominal), 0);
  const totalIn = monthTrx.filter(t=>t.jenis==='pemasukan').reduce((s,t)=>s+t.nominal,0);
  const totalOut = monthTrx.filter(t=>t.jenis==='pengeluaran').reduce((s,t)=>s+t.nominal,0);
  const sisa = totalIn - totalOut;

  animateValue(document.getElementById('statSaldo'), totalSaldo);
  animateValue(document.getElementById('statPemasukan'), totalIn);
  animateValue(document.getElementById('statPengeluaran'), totalOut);
  animateValue(document.getElementById('statSisa'), sisa);

  // recent list
  const recent = [...transactions].sort((a,b)=> new Date(b.tanggal)-new Date(a.tanggal) || b.id.localeCompare(a.id)).slice(0,6);
  const recentList = document.getElementById('recentList');
  if(recent.length===0){
    recentList.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>Belum ada transaksi. Yuk tambahkan transaksi pertamamu!</p></div>`;
  } else {
    recentList.innerHTML = recent.map(trxItemHTML).join('');
    attachTrxActions(recentList);
  }

  renderChartBulanan();
}

function trxItemHTML(t){
  const info = getKategoriInfo(t.jenis, t.kategori);
  const tanggal = new Date(t.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'});
  return `
  <div class="trx-item" data-id="${t.id}">
    <div class="trx-icon ${t.jenis==='pemasukan'?'in':'out'}"><i class="fa-solid ${info.icon}"></i></div>
    <div class="trx-mid">
      <div class="trx-cat">${info.label}</div>
      <div class="trx-note">${t.catatan ? escapeHtml(t.catatan) : 'Tidak ada catatan'}</div>
      <div class="trx-date">${tanggal}</div>
    </div>
    <div class="trx-amount ${t.jenis==='pemasukan'?'in':'out'}">${t.jenis==='pemasukan'?'+':'-'} ${formatRupiah(t.nominal)}</div>
    <div class="trx-actions">
      <button class="btn-icon edit-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
      <button class="btn-icon danger del-btn" title="Hapus"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`;
}
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function attachTrxActions(container){
  container.querySelectorAll('.trx-item').forEach(item=>{
    const id = item.dataset.id;
    item.querySelector('.edit-btn').addEventListener('click', ()=> editTransaction(id));
    item.querySelector('.del-btn').addEventListener('click', ()=> deleteTransaction(id));
  });
}

function renderChartBulanan(){
  const ctx = document.getElementById('chartBulanan');
  const months = [];
  const now = new Date();
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push(d);
  }
  const labels = months.map(d=> d.toLocaleDateString('id-ID',{month:'short', year:'2-digit'}));
  const dataIn = months.map(d=> sumByMonth(d.getFullYear(), d.getMonth(), 'pemasukan'));
  const dataOut = months.map(d=> sumByMonth(d.getFullYear(), d.getMonth(), 'pengeluaran'));

  if(chartBulanan) chartBulanan.destroy();
  chartBulanan = new Chart(ctx, {
    type:'bar',
    data:{
      labels,
      datasets:[
        {label:'Pemasukan', data:dataIn, backgroundColor:'#1fae62', borderRadius:8, maxBarThickness:34},
        {label:'Pengeluaran', data:dataOut, backgroundColor:'#e5484d', borderRadius:8, maxBarThickness:34}
      ]
    },
    options: chartBaseOptions()
  });
}
function sumByMonth(y,m,jenis){
  return getMonthRange(y,m).filter(t=>t.jenis===jenis).reduce((s,t)=>s+t.nominal,0);
}
function chartBaseOptions(){
  const isDark = document.documentElement.getAttribute('data-theme')==='dark';
  const textColor = isDark ? '#c2cbc6' : '#4d5852';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{labels:{color:textColor, font:{family:'Poppins'}}},
      tooltip:{callbacks:{label:(ctx)=> `${ctx.dataset.label}: ${formatRupiah(ctx.parsed.y ?? ctx.parsed)}`}}
    },
    scales:{
      x:{ticks:{color:textColor, font:{family:'Poppins'}}, grid:{color:gridColor}},
      y:{ticks:{color:textColor, font:{family:'Poppins'}, callback:(v)=> 'Rp '+(v/1000)+'rb'}, grid:{color:gridColor}}
    }
  };
}

/* ---------------------- RIWAYAT ---------------------- */
function populateFilterKategori(){
  const sel = document.getElementById('filterKategori');
  const all = [...KATEGORI.pemasukan, ...KATEGORI.pengeluaran];
  const unique = [...new Map(all.map(k=>[k.label,k])).values()];
  sel.innerHTML = '<option value="">Semua Kategori</option>' + unique.map(k=>`<option value="${k.id}">${k.label}</option>`).join('');

  const budgetSel = document.getElementById('budgetKategori');
  budgetSel.innerHTML = KATEGORI.pengeluaran.map(k=>`<option value="${k.id}">${k.label}</option>`).join('');
}

function renderHistory(){
  const search = document.getElementById('searchInput').value.toLowerCase();
  const filterTanggal = document.getElementById('filterTanggal').value;
  const filterKategori = document.getElementById('filterKategori').value;
  const filterJenis = document.getElementById('filterJenis').value;

  let list = [...transactions].sort((a,b)=> new Date(b.tanggal)-new Date(a.tanggal));

  list = list.filter(t=>{
    const info = getKategoriInfo(t.jenis, t.kategori);
    const matchSearch = !search || info.label.toLowerCase().includes(search) || (t.catatan||'').toLowerCase().includes(search);
    const matchTanggal = !filterTanggal || t.tanggal === filterTanggal;
    const matchKategori = !filterKategori || t.kategori === filterKategori;
    const matchJenis = !filterJenis || t.jenis === filterJenis;
    return matchSearch && matchTanggal && matchKategori && matchJenis;
  });

  const tbody = document.getElementById('historyTbody');
  const emptyEl = document.getElementById('emptyHistory');
  if(list.length===0){
    tbody.innerHTML='';
    emptyEl.style.display='block';
  } else {
    emptyEl.style.display='none';
    tbody.innerHTML = list.map(t=>{
      const info = getKategoriInfo(t.jenis, t.kategori);
      const tanggal = new Date(t.tanggal).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
      return `<tr data-id="${t.id}">
        <td>${tanggal}</td>
        <td><span class="badge ${t.jenis==='pemasukan'?'in':'out'}">${t.jenis==='pemasukan'?'Pemasukan':'Pengeluaran'}</span></td>
        <td><i class="fa-solid ${info.icon}" style="color:var(--green-500);margin-right:6px;"></i>${info.label}</td>
        <td>${t.catatan ? escapeHtml(t.catatan) : '<span class="muted">-</span>'}</td>
        <td style="font-weight:700;color:${t.jenis==='pemasukan'?'var(--green-600)':'var(--red-500)'}">${t.jenis==='pemasukan'?'+':'-'} ${formatRupiah(t.nominal)}</td>
        <td>
          <div class="trx-actions">
            <button class="btn-icon edit-row" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon danger del-row" title="Hapus"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('tr').forEach(row=>{
      const id = row.dataset.id;
      row.querySelector('.edit-row').addEventListener('click', ()=> editTransaction(id));
      row.querySelector('.del-row').addEventListener('click', ()=> deleteTransaction(id));
    });
  }
}
['searchInput','filterTanggal','filterKategori','filterJenis'].forEach(id=>{
  document.getElementById(id).addEventListener('input', renderHistory);
  document.getElementById(id).addEventListener('change', renderHistory);
});
document.getElementById('clearFilterBtn').addEventListener('click', ()=>{
  document.getElementById('searchInput').value='';
  document.getElementById('filterTanggal').value='';
  document.getElementById('filterKategori').value='';
  document.getElementById('filterJenis').value='';
  renderHistory();
});

/* ---------------------- STATISTIK ---------------------- */
function renderStatistik(){
  const now = new Date();
  const months = [];
  for(let i=5;i>=0;i--){
    months.push(new Date(now.getFullYear(), now.getMonth()-i, 1));
  }
  const labels = months.map(d=>d.toLocaleDateString('id-ID',{month:'short',year:'2-digit'}));
  const dataIn = months.map(d=>sumByMonth(d.getFullYear(),d.getMonth(),'pemasukan'));
  const dataOut = months.map(d=>sumByMonth(d.getFullYear(),d.getMonth(),'pengeluaran'));

  if(chartVs) chartVs.destroy();
  chartVs = new Chart(document.getElementById('chartVs'), {
    type:'line',
    data:{labels, datasets:[
      {label:'Pemasukan', data:dataIn, borderColor:'#1fae62', backgroundColor:'rgba(31,174,98,0.15)', tension:.4, fill:true},
      {label:'Pengeluaran', data:dataOut, borderColor:'#e5484d', backgroundColor:'rgba(229,72,77,0.12)', tension:.4, fill:true}
    ]},
    options: chartBaseOptions()
  });

  const pieOptions = {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{position:'bottom', labels:{color: document.documentElement.getAttribute('data-theme')==='dark'?'#c2cbc6':'#4d5852', font:{family:'Poppins', size:11}}},
    tooltip:{callbacks:{label:(ctx)=> `${ctx.label}: ${formatRupiah(ctx.parsed)}`}}}
  };
  const palette = ['#1fae62','#34c773','#5aa7ff','#ffb84d','#e5484d','#8a958f','#9b7dfa','#ff9fb1','#13935a','#3b82f6','#f59e0b','#0d7a48','#64748b'];

  const outAgg = aggregateByCategory('pengeluaran');
  if(chartKategoriOut) chartKategoriOut.destroy();
  chartKategoriOut = new Chart(document.getElementById('chartKategoriOut'), {
    type:'doughnut',
    data:{ labels:outAgg.labels, datasets:[{data:outAgg.values, backgroundColor:palette, borderWidth:2, borderColor: document.documentElement.getAttribute('data-theme')==='dark'?'#172019':'#fff'}] },
    options: pieOptions
  });

  const inAgg = aggregateByCategory('pemasukan');
  if(chartKategoriIn) chartKategoriIn.destroy();
  chartKategoriIn = new Chart(document.getElementById('chartKategoriIn'), {
    type:'doughnut',
    data:{ labels:inAgg.labels, datasets:[{data:inAgg.values, backgroundColor:palette, borderWidth:2, borderColor: document.documentElement.getAttribute('data-theme')==='dark'?'#172019':'#fff'}] },
    options: pieOptions
  });
}
function aggregateByCategory(jenis){
  const map = {};
  transactions.filter(t=>t.jenis===jenis).forEach(t=>{
    const info = getKategoriInfo(jenis, t.kategori);
    map[info.label] = (map[info.label]||0) + t.nominal;
  });
  return { labels:Object.keys(map), values:Object.values(map) };
}

/* ---------------------- KALENDER ---------------------- */
let calYear, calMonth, calSelectedDate = null;
function renderCalendar(){
  const now = new Date();
  if(calYear===undefined){ calYear = now.getFullYear(); calMonth = now.getMonth(); }
  document.getElementById('calLabel').textContent = new Date(calYear,calMonth,1).toLocaleDateString('id-ID',{month:'long', year:'numeric'});

  const grid = document.getElementById('calendarGrid');
  const dows = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  let html = dows.map(d=>`<div class="cal-dow">${d}</div>`).join('');

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  for(let i=0;i<firstDay;i++) html += `<div class="cal-day empty"></div>`;

  const todayFull = todayStr();
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayTrx = transactions.filter(t=>t.tanggal===dateStr);
    const hasIn = dayTrx.some(t=>t.jenis==='pemasukan');
    const hasOut = dayTrx.some(t=>t.jenis==='pengeluaran');
    let dotClass = '';
    if(hasIn && hasOut) dotClass='both';
    else if(hasOut) dotClass='has-out';
    const isToday = dateStr===todayFull ? 'today' : '';
    const isSelected = dateStr===calSelectedDate ? 'selected' : '';
    html += `<div class="cal-day ${isToday} ${isSelected}" data-date="${dateStr}">
      <span>${d}</span>
      ${dayTrx.length ? `<span class="cal-dot ${dotClass}"></span>` : ''}
    </div>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll('.cal-day:not(.empty)').forEach(cell=>{
    cell.addEventListener('click', ()=>{
      calSelectedDate = cell.dataset.date;
      renderCalendar();
      showCalDetail(calSelectedDate);
    });
  });
  if(calSelectedDate) showCalDetail(calSelectedDate);
}
function showCalDetail(dateStr){
  const card = document.getElementById('calDetailCard');
  const list = document.getElementById('calDetailList');
  const dayTrx = transactions.filter(t=>t.tanggal===dateStr);
  const niceDate = new Date(dateStr).toLocaleDateString('id-ID',{weekday:'long', day:'2-digit', month:'long', year:'numeric'});
  document.getElementById('calDetailTitle').innerHTML = `<i class="fa-solid fa-list"></i> Transaksi — ${niceDate}`;
  card.style.display='block';
  if(dayTrx.length===0){
    list.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>Tidak ada transaksi pada tanggal ini.</p></div>`;
  } else {
    list.innerHTML = dayTrx.map(trxItemHTML).join('');
    attachTrxActions(list);
  }
}
document.getElementById('calPrev').addEventListener('click', ()=>{
  calMonth--; if(calMonth<0){calMonth=11; calYear--;}
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', ()=>{
  calMonth++; if(calMonth>11){calMonth=0; calYear++;}
  renderCalendar();
});

/* ---------------------- TARGET MENABUNG ---------------------- */
const targetForm = document.getElementById('targetForm');
const targetNominalInput = document.getElementById('targetNominal');
formatInputNumber(targetNominalInput);

targetForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const nama = document.getElementById('targetNama').value.trim();
  const nominal = parseNumber(targetNominalInput.value);
  if(!nama || !nominal){ showToast('Lengkapi nama dan nominal target', 'error'); return; }
  goals.push({ id:uid(), nama, target:nominal, terkumpul:0 });
  saveData(LS_KEYS.GOALS, goals);
  targetForm.reset();
  showToast('Target berhasil dibuat!');
  renderGoals();
});

function renderGoals(){
  const container = document.getElementById('targetList');
  if(goals.length===0){
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-bullseye"></i><p>Belum ada target menabung. Buat target pertamamu!</p></div>`;
    return;
  }
  const icons = {laptop:'fa-laptop', motor:'fa-motorcycle', liburan:'fa-plane', dana:'fa-shield-heart'};
  container.innerHTML = goals.map(g=>{
    const pct = Math.min(100, Math.round((g.terkumpul / g.target)*100));
    const lower = g.nama.toLowerCase();
    let icon='fa-piggy-bank';
    if(lower.includes('laptop')) icon='fa-laptop';
    else if(lower.includes('motor')) icon='fa-motorcycle';
    else if(lower.includes('libur')) icon='fa-plane';
    else if(lower.includes('darurat')) icon='fa-shield-heart';
    return `
    <div class="goal-card" data-id="${g.id}">
      <div class="goal-head"><h4><i class="fa-solid ${icon}"></i> ${escapeHtml(g.nama)}</h4>
        <button class="btn-icon danger del-goal" title="Hapus"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="goal-amounts"><span>Terkumpul: <b>${formatRupiah(g.terkumpul)}</b></span><span class="goal-pct">${pct}%</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="goal-amounts"><span>Target</span><span><b>${formatRupiah(g.target)}</b></span></div>
      <div class="goal-actions">
        <input type="text" class="goal-add-input" inputmode="numeric" placeholder="Nominal tambahan">
        <button class="btn btn-primary btn-add-goal"><i class="fa-solid fa-plus"></i></button>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.goal-card').forEach(card=>{
    const id = card.dataset.id;
    const input = card.querySelector('.goal-add-input');
    formatInputNumber(input);
    card.querySelector('.btn-add-goal').addEventListener('click', ()=>{
      const val = parseNumber(input.value);
      if(!val){ showToast('Masukkan nominal yang valid', 'error'); return; }
      const goal = goals.find(g=>g.id===id);
      goal.terkumpul += val;
      saveData(LS_KEYS.GOALS, goals);
      showToast(`Berhasil menambah ${formatRupiah(val)} ke "${goal.nama}"`);
      renderGoals();
    });
    card.querySelector('.del-goal').addEventListener('click', ()=>{
      if(!confirm('Hapus target ini?')) return;
      goals = goals.filter(g=>g.id!==id);
      saveData(LS_KEYS.GOALS, goals);
      renderGoals();
    });
  });
}

/* ---------------------- BUDGET BULANAN ---------------------- */
const budgetForm = document.getElementById('budgetForm');
const budgetNominalInput = document.getElementById('budgetNominal');
formatInputNumber(budgetNominalInput);

budgetForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const kategori = document.getElementById('budgetKategori').value;
  const nominal = parseNumber(budgetNominalInput.value);
  if(!nominal){ showToast('Masukkan batas budget', 'error'); return; }
  const existing = budgets.find(b=>b.kategori===kategori);
  if(existing) existing.limit = nominal;
  else budgets.push({ id:uid(), kategori, limit:nominal });
  saveData(LS_KEYS.BUDGETS, budgets);
  budgetForm.reset();
  showToast('Budget berhasil disimpan!');
  renderBudgets();
});

function renderBudgets(){
  const container = document.getElementById('budgetList');
  if(budgets.length===0){
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-sack-dollar"></i><p>Belum ada budget yang diatur.</p></div>`;
    return;
  }
  const now = new Date();
  const monthTrxOut = getMonthRange(now.getFullYear(), now.getMonth()).filter(t=>t.jenis==='pengeluaran');

  container.innerHTML = budgets.map(b=>{
    const info = getKategoriInfo('pengeluaran', b.kategori);
    const used = monthTrxOut.filter(t=>t.kategori===b.kategori).reduce((s,t)=>s+t.nominal,0);
    const pct = Math.min(100, Math.round((used/b.limit)*100));
    const over = used > b.limit;
    return `
    <div class="budget-card" data-id="${b.id}">
      <div class="goal-head"><h4><i class="fa-solid ${info.icon}"></i> ${info.label}</h4>
        <button class="btn-icon danger del-budget" title="Hapus"><i class="fa-solid fa-trash"></i></button>
      </div>
      <div class="goal-amounts"><span>Terpakai: <b>${formatRupiah(used)}</b></span><span><b>${pct}%</b></span></div>
      <div class="progress-bar"><div class="progress-fill ${over?'over':''}" style="width:${pct}%"></div></div>
      <div class="goal-amounts"><span>Batas Bulanan</span><span><b>${formatRupiah(b.limit)}</b></span></div>
      ${over
        ? `<div class="budget-warn"><i class="fa-solid fa-triangle-exclamation"></i> Melebihi budget sebesar ${formatRupiah(used-b.limit)}!</div>`
        : `<div class="budget-ok"><i class="fa-solid fa-circle-check"></i> Masih dalam batas budget.</div>`}
    </div>`;
  }).join('');

  container.querySelectorAll('.del-budget').forEach((btn,i)=>{
    btn.addEventListener('click', ()=>{
      const id = btn.closest('.budget-card').dataset.id;
      if(!confirm('Hapus budget ini?')) return;
      budgets = budgets.filter(b=>b.id!==id);
      saveData(LS_KEYS.BUDGETS, budgets);
      renderBudgets();
    });
  });
}

function checkBudgetWarning(trx){
  if(trx.jenis!=='pengeluaran') return;
  const budget = budgets.find(b=>b.kategori===trx.kategori);
  if(!budget) return;
  const now = new Date();
  const used = getMonthRange(now.getFullYear(), now.getMonth())
    .filter(t=>t.jenis==='pengeluaran' && t.kategori===trx.kategori)
    .reduce((s,t)=>s+t.nominal,0);
  if(used > budget.limit){
    const info = getKategoriInfo('pengeluaran', trx.kategori);
    showToast(`⚠️ Budget "${info.label}" sudah melebihi batas (${formatRupiah(budget.limit)})!`, 'error');
  }
}

/* ---------------------- EXPORT EXCEL & PDF ---------------------- */
document.getElementById('exportExcelBtn').addEventListener('click', ()=>{
  if(transactions.length===0){ showToast('Tidak ada data untuk diexport', 'error'); return; }
  const rows = [...transactions].sort((a,b)=>new Date(a.tanggal)-new Date(b.tanggal)).map(t=>({
    Tanggal: t.tanggal,
    Jenis: t.jenis==='pemasukan'?'Pemasukan':'Pengeluaran',
    Kategori: getKategoriInfo(t.jenis, t.kategori).label,
    Catatan: t.catatan || '',
    Nominal: t.nominal
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
  XLSX.writeFile(wb, `DuitKu_Transaksi_${todayStr()}.xlsx`);
  showToast('Data berhasil diexport ke Excel!');
});

document.getElementById('exportPdfBtn').addEventListener('click', ()=>{
  if(transactions.length===0){ showToast('Tidak ada data untuk diexport', 'error'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('DuitKu - Riwayat Transaksi', 14, 16);
  doc.setFontSize(10);
  doc.text(`Diexport pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

  const rows = [...transactions].sort((a,b)=>new Date(a.tanggal)-new Date(b.tanggal)).map(t=>[
    t.tanggal,
    t.jenis==='pemasukan'?'Pemasukan':'Pengeluaran',
    getKategoriInfo(t.jenis, t.kategori).label,
    t.catatan || '-',
    formatRupiah(t.nominal)
  ]);
  doc.autoTable({
    head:[['Tanggal','Jenis','Kategori','Catatan','Nominal']],
    body: rows,
    startY: 28,
    styles:{ fontSize:9 },
    headStyles:{ fillColor:[31,174,98] }
  });
  doc.save(`DuitKu_Transaksi_${todayStr()}.pdf`);
  showToast('Data berhasil diexport ke PDF!');
});

/* ---------------------- BACKUP & RESTORE ---------------------- */
document.getElementById('backupBtn').addEventListener('click', ()=>{
  const backup = { transactions, goals, budgets, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `DuitKu_Backup_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup berhasil diunduh!');
});

document.getElementById('restoreBtnLabel').addEventListener('click', ()=>{
  document.getElementById('restoreInput').click();
});
document.getElementById('restoreInput').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try{
      const data = JSON.parse(ev.target.result);
      if(!Array.isArray(data.transactions)) throw new Error('Format tidak valid');
      transactions = data.transactions || [];
      goals = data.goals || [];
      budgets = data.budgets || [];
      saveData(LS_KEYS.TRX, transactions);
      saveData(LS_KEYS.GOALS, goals);
      saveData(LS_KEYS.BUDGETS, budgets);
      showToast('Data berhasil direstore!');
      gotoPage('dashboard');
    }catch(err){
      showToast('Gagal restore: file JSON tidak valid', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('clearAllBtn').addEventListener('click', ()=>{
  if(!confirm('Yakin ingin menghapus SEMUA data (transaksi, target, budget)? Tindakan ini tidak bisa dibatalkan.')) return;
  transactions = []; goals = []; budgets = [];
  saveData(LS_KEYS.TRX, transactions);
  saveData(LS_KEYS.GOALS, goals);
  saveData(LS_KEYS.BUDGETS, budgets);
  showToast('Semua data telah dihapus');
  gotoPage('dashboard');
});

/* ---------------------- INIT ---------------------- */
function init(){
  const savedTheme = loadData(LS_KEYS.THEME, 'light');
  applyTheme(savedTheme);

  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('id-ID',{weekday:'long', day:'2-digit', month:'long', year:'numeric'});

  populateFilterKategori();
  renderDashboard();

  setTimeout(()=>{
    document.getElementById('loadingScreen').classList.add('hide');
  }, 900);
}
init();

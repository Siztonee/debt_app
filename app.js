'use strict';

/* ─── Storage ─── */
const STORE_KEY = 'debtDiaryRecords';

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}
function save(records) {
  localStorage.setItem(STORE_KEY, JSON.stringify(records));
}

/* ─── State ─── */
let records = load();
let editingId = null;
let deletingId = null;

/* ─── Helpers ─── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₸';
}

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

/* ─── Render ─── */
function render() {
  const tbody = document.getElementById('tableBody');
  const wrapper = document.getElementById('tableWrapper');
  const empty = document.getElementById('emptyState');

  // Sort by date desc
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    wrapper.style.display = 'none';
    empty.style.display = '';
  } else {
    wrapper.style.display = '';
    empty.style.display = 'none';
  }

  tbody.innerHTML = '';
  let totalTaken = 0, totalPaid = 0, totalDebt = 0;

  sorted.forEach(r => {
    const debt = (r.taken || 0) - (r.paid || 0);
    totalTaken += r.taken || 0;
    totalPaid += r.paid || 0;
    totalDebt += debt;

    const debtClass = debt > 0 ? 'negative' : debt < 0 ? 'positive' : 'zero';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-date">${fmtDate(r.date)}</td>
      <td class="td-taken">${fmt(r.taken)}</td>
      <td class="td-paid">${fmt(r.paid)}</td>
      <td class="td-debt ${debtClass}">${fmt(debt)}</td>
      <td class="td-actions">
        <div class="row-actions">
          <button class="row-btn edit" data-id="${r.id}" title="Редактировать">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="row-btn del" data-id="${r.id}" title="Удалить">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Footer
  document.getElementById('footTaken').textContent = totalTaken ? fmt(totalTaken) : '—';
  document.getElementById('footPaid').textContent = totalPaid ? fmt(totalPaid) : '—';
  const footDebt = document.getElementById('footDebt');
  footDebt.textContent = records.length ? fmt(totalDebt) : '—';
  footDebt.className = 'tf-debt';

  // Stats
  document.getElementById('totalTaken').textContent = fmt(totalTaken);
  document.getElementById('totalPaid').textContent = fmt(totalPaid);
  document.getElementById('totalDebt').textContent = fmt(totalDebt);

  // Row events
  tbody.querySelectorAll('.row-btn.edit').forEach(btn => {
    btn.addEventListener('click', () => openEdit(btn.dataset.id));
  });
  tbody.querySelectorAll('.row-btn.del').forEach(btn => {
    btn.addEventListener('click', () => openConfirm(btn.dataset.id));
  });
}

/* ─── Modal ─── */
function openAdd() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Новая запись';
  document.getElementById('fieldDate').value = todayISO();
  document.getElementById('fieldTaken').value = '';
  document.getElementById('fieldPaid').value = '';
  updateDebtPreview();
  openModal();
}

function openEdit(id) {
  const r = records.find(x => x.id === id);
  if (!r) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = 'Редактировать';
  document.getElementById('fieldDate').value = r.date || '';
  document.getElementById('fieldTaken').value = r.taken != null ? r.taken : '';
  document.getElementById('fieldPaid').value = r.paid != null ? r.paid : '';
  updateDebtPreview();
  openModal();
}

function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('fieldTaken').focus(), 300);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function saveRecord() {
  const date = document.getElementById('fieldDate').value;
  const taken = parseFloat(document.getElementById('fieldTaken').value) || 0;
  const paid = parseFloat(document.getElementById('fieldPaid').value) || 0;

  if (!date) { showToast('Укажите дату'); return; }

  if (editingId) {
    const idx = records.findIndex(x => x.id === editingId);
    if (idx !== -1) records[idx] = { id: editingId, date, taken, paid };
  } else {
    records.push({ id: uid(), date, taken, paid });
  }

  save(records);
  render();
  closeModal();
  showToast(editingId ? 'Запись обновлена' : 'Запись добавлена');
}

/* ─── Confirm delete ─── */
function openConfirm(id) {
  deletingId = id;
  document.getElementById('confirmOverlay').classList.add('open');
}
function closeConfirm() {
  deletingId = null;
  document.getElementById('confirmOverlay').classList.remove('open');
}
function deleteRecord() {
  if (!deletingId) return;
  records = records.filter(x => x.id !== deletingId);
  save(records);
  render();
  closeConfirm();
  showToast('Запись удалена');
}

/* ─── Debt preview ─── */
function updateDebtPreview() {
  const taken = parseFloat(document.getElementById('fieldTaken').value) || 0;
  const paid = parseFloat(document.getElementById('fieldPaid').value) || 0;
  const debt = taken - paid;
  const el = document.getElementById('debtPreview');
  el.textContent = fmt(debt);
  el.style.color = debt > 0 ? 'var(--accent)' : debt < 0 ? 'var(--green)' : 'var(--text3)';
}

/* ─── Export CSV ─── */
function exportCSV() {
  if (records.length === 0) { showToast('Нет записей для экспорта'); return; }
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const rows = [['Дата', 'Взято товаров', 'Сдано', 'Долг']];
  sorted.forEach(r => {
    const debt = (r.taken || 0) - (r.paid || 0);
    rows.push([fmtDate(r.date), r.taken || 0, r.paid || 0, debt]);
  });
  const csv = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diary_${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV экспортирован');
}

/* ─── Events ─── */
document.getElementById('addBtn').addEventListener('click', openAdd);
document.getElementById('exportBtn').addEventListener('click', exportCSV);
document.getElementById('saveBtn').addEventListener('click', saveRecord);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

document.getElementById('confirmOk').addEventListener('click', deleteRecord);
document.getElementById('confirmCancel').addEventListener('click', closeConfirm);
document.getElementById('confirmOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('confirmOverlay')) closeConfirm();
});

document.getElementById('fieldTaken').addEventListener('input', updateDebtPreview);
document.getElementById('fieldPaid').addEventListener('input', updateDebtPreview);

// Keyboard
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeConfirm(); }
  if (e.key === 'Enter' && document.getElementById('modalOverlay').classList.contains('open')) {
    if (document.activeElement.tagName !== 'BUTTON') saveRecord();
  }
});

/* ─── Service Worker ─── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

/* ─── Init ─── */
render();
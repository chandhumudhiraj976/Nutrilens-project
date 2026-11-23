// ============================================================
// NutriLens – Main Application Controller
// app.js  – UI rendering, event wiring, page routing
// ============================================================

'use strict';

// ─── STATE ──────────────────────────────────────────────────
let state = {
  currentPage: 'search',
  searchQuery: '',
  activeCategory: 'all',
  selectedSnack: null,
  compareWith: null,
  modalTab: 'nutrition',
  debounceTimer: null
};

// ─── DOM REFS ────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderHeroStats();
  renderFilterPills();
  renderSnackGrid(SNACKS);
  renderHostelHacks();
  renderTrackerDashboard();
  wireEvents();
  updateNavActive('search');
});

// ─── HERO STATS ──────────────────────────────────────────────
function renderHeroStats() {
  const junk = SNACKS.filter(s => s.type === 'junk').length;
  const healthy = SNACKS.filter(s => s.type === 'healthy').length;
  $('#stat-total').textContent = SNACKS.length;
  $('#stat-junk').textContent = junk;
  $('#stat-healthy').textContent = healthy;
}

// ─── FILTER PILLS ────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all', label: '🍽️ All Snacks' },
  { id: 'chips', label: '🥔 Chips & Crisps' },
  { id: 'fried-snacks', label: '🥟 Fried Snacks' },
  { id: 'beverages', label: '🥤 Beverages' },
  { id: 'biscuits', label: '🍪 Biscuits' },
  { id: 'sweets', label: '🍫 Sweets' },
  { id: 'noodles', label: '🍜 Noodles & Meals' },
  { id: 'fast-food', label: '🍔 Fast Food' },
  { id: 'junk', label: '⚠️ Junk Only' },
  { id: 'healthy', label: '✅ Healthy Only' }
];

function renderFilterPills() {
  const container = $('#filter-pills');
  container.innerHTML = CATEGORIES.map(cat => `
    <button class="pill ${cat.id === 'all' ? 'active' : ''}" data-cat="${cat.id}">
      ${cat.label}
    </button>
  `).join('');
}

// ─── SNACK GRID ──────────────────────────────────────────────
function getFilteredSnacks() {
  let snacks = SNACKS;
  const q = state.searchQuery.toLowerCase().trim();
  if (q) {
    snacks = snacks.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.brand.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.flavour.toLowerCase().includes(q)
    );
  }
  if (state.activeCategory !== 'all') {
    if (state.activeCategory === 'junk' || state.activeCategory === 'healthy') {
      snacks = snacks.filter(s => s.type === state.activeCategory);
    } else {
      snacks = snacks.filter(s => s.category === state.activeCategory);
    }
  }
  return snacks;
}

function renderSnackGrid(snacks) {
  const grid = $('#snack-grid');
  const count = $('#result-count');
  if (count) count.textContent = `${snacks.length} snacks`;

  if (snacks.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔍</div>
        <h3>No snacks found</h3>
        <p>Try a different search term or category.</p>
      </div>`;
    return;
  }

  grid.innerHTML = snacks.map(snack => renderSnackCard(snack)).join('');

  // Animate bars
  requestAnimationFrame(() => {
    $$('.nutr-bar-fill').forEach(bar => {
      const target = bar.dataset.width;
      bar.style.width = target + '%';
    });
  });
}

function renderSnackCard(snack) {
  const ns = NutriScore.calculate(snack);
  const maxCal = 600, maxFat = 55, maxSugar = 70, maxProtein = 30, maxFiber = 15, maxSodium = 1800;
  const calPerServing = Math.round((snack.calories * snack.servingSize) / 100);

  return `
  <div class="snack-card ${snack.type === 'healthy' ? 'healthy-card' : ''}"
       data-id="${snack.id}" id="card-${snack.id}"
       onclick="openSnackModal('${snack.id}')">
    <div class="card-header">
      <span class="card-emoji">${snack.emoji}</span>
      <div class="card-info">
        <div class="card-name">${snack.name}</div>
        <div class="card-brand">${snack.brand}</div>
        <div class="card-badges">
          <span class="grade-badge ${ns.textClass}">${ns.grade}</span>
          <span class="type-badge ${snack.type}">${snack.type}</span>
        </div>
      </div>
      <div class="grade-badge-lg ${ns.textClass}" style="text-align:center;min-width:52px;padding:4px;">
        <span style="font-size:1.5rem;font-weight:900;">${ns.grade}</span>
        <span class="grade-label" style="font-size:0.55rem;display:block;">${ns.label}</span>
      </div>
    </div>

    <div class="nutrition-bars">
      ${nutritionBar('Calories', snack.calories, maxCal, 'bar-calories', 'kcal')}
      ${nutritionBar('Fat', snack.totalFat, maxFat, 'bar-fat', 'g')}
      ${nutritionBar('Sugar', snack.sugar, maxSugar, 'bar-sugar', 'g')}
      ${nutritionBar('Protein', snack.protein, maxProtein, 'bar-protein', 'g')}
      ${nutritionBar('Fiber', snack.fiber, maxFiber, 'bar-fiber', 'g')}
      ${nutritionBar('Sodium', snack.sodium, maxSodium, 'bar-sodium', 'mg')}
    </div>

    <div class="ns-meter">
      ${['a','b','c','d','e'].map(g => `<div class="ns-seg ns-${g} ${ns.grade.toLowerCase() === g ? 'active' : ''}"></div>`).join('')}
    </div>

    <div style="margin-top:8px; font-size:0.72rem; color:var(--text-muted);">
      Serving: ${snack.servingSize}g · ${calPerServing} kcal/serving
    </div>

    <div class="card-footer">
      <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openSnackModal('${snack.id}')">
        📊 Details & Swap
      </button>
      ${snack.type === 'junk' ? `
      <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); quickSwap('${snack.id}')">
        🔄 Swap
      </button>` : ''}
    </div>
  </div>`;
}

function nutritionBar(label, val, max, cls, unit) {
  const pct = Math.min(100, Math.round((val / max) * 100));
  return `
  <div class="nutr-row">
    <span class="nutr-label">${label}</span>
    <div class="nutr-bar-track">
      <div class="nutr-bar-fill ${cls}" data-width="${pct}" style="width:0%"></div>
    </div>
    <span class="nutr-val">${val}${unit}</span>
  </div>`;
}

// ─── MODAL ───────────────────────────────────────────────────
function openSnackModal(id) {
  const snack = SNACKS.find(s => s.id === id);
  if (!snack) return;
  state.selectedSnack = snack;
  state.modalTab = 'nutrition';
  renderModal(snack);
  $('#snack-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('#snack-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function renderModal(snack) {
  const ns = NutriScore.calculate(snack);
  const modal = $('#snack-modal');

  // Header
  $('#modal-emoji').textContent = snack.emoji;
  $('#modal-name').textContent = snack.name;
  $('#modal-brand').textContent = `${snack.brand} · ${snack.category}`;
  $('#modal-desc').textContent = snack.description;
  const gradeBadge = $('#modal-grade');
  gradeBadge.className = `grade-badge-lg ${ns.textClass}`;
  gradeBadge.innerHTML = `<span style="font-size:1.75rem;font-weight:900;">${ns.grade}</span><span class="grade-label">${ns.label}</span>`;

  renderModalTab('nutrition');
}

function renderModalTab(tab) {
  state.modalTab = tab;
  $$('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

  const body = $('#modal-tab-body');
  const snack = state.selectedSnack;
  const ns = NutriScore.calculate(snack);

  if (tab === 'nutrition') {
    const calPerServing = Math.round((snack.calories * snack.servingSize) / 100);
    body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
      <div>
        <h4 style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">Nutrition per 100g</h4>
        <table class="nutr-table">
          <tr><th>Nutrient</th><th>Amount</th></tr>
          ${nutritionTableRow('🔥 Calories', snack.calories, 'kcal', ns)}
          ${nutritionTableRow('🫙 Total Fat', snack.totalFat, 'g')}
          ${nutritionTableRow('🧈 Saturated Fat', snack.saturatedFat, 'g')}
          ${nutritionTableRow('🍬 Sugars', snack.sugar, 'g')}
          ${nutritionTableRow('🫘 Protein', snack.protein, 'g')}
          ${nutritionTableRow('🌾 Fiber', snack.fiber, 'g')}
          ${nutritionTableRow('🧂 Sodium', snack.sodium, 'mg')}
          ${nutritionTableRow('🍞 Carbohydrates', snack.carbs, 'g')}
        </table>
        <div style="margin-top:12px;padding:12px;background:var(--bg-card);border-radius:var(--radius-sm);font-size:0.8rem;">
          <span style="color:var(--text-muted);">Per serving (${snack.servingSize}g): </span>
          <strong>${calPerServing} kcal</strong>
        </div>
      </div>
      <div>
        <h4 style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">Nutri-Score Breakdown</h4>
        <div class="chart-wrapper" style="margin-bottom:1rem;">
          <canvas id="modal-radar-chart" height="260"></canvas>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-card);border-radius:var(--radius-sm);">
          <div class="grade-badge-lg ${NutriScore.calculate(snack).textClass}" style="min-width:52px;">
            <span style="font-size:1.5rem;font-weight:900;">${ns.grade}</span>
            <span class="grade-label">${ns.label}</span>
          </div>
          <div>
            <div style="font-size:0.8rem;color:var(--text-muted);">Nutri-Score</div>
            <div style="font-size:1.1rem;font-weight:700;">${ns.score} points</div>
            <div class="ns-meter" style="margin-top:4px;">
              ${['a','b','c','d','e'].map(g => `<div class="ns-seg ns-${g} ${ns.grade.toLowerCase() === g ? 'active' : ''}"></div>`).join('')}
            </div>
          </div>
        </div>
        ${snack.category === 'beverages' ? SugarVisualizer.renderHTML(snack) : ''}
      </div>
    </div>`;

    renderRadarChart('modal-radar-chart', snack);

  } else if (tab === 'swaps') {
    const swaps = SwapRecommender.recommend(snack, SNACKS, 3);
    if (snack.type === 'healthy') {
      body.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><h3>Already a healthy choice!</h3><p>This snack has an excellent nutritional profile.</p></div>`;
      return;
    }
    body.innerHTML = `
    <h4 style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">
      Recommended Swaps for ${snack.name}
    </h4>
    <div class="swap-cards">
      ${swaps.map(sw => {
        const savings = SwapRecommender.getSavings(snack, sw);
        const swNS = NutriScore.calculate(sw);
        const calSaved = savings.caloriesSaved;
        return `
        <div class="swap-card" onclick="openCompareFromSwap('${snack.id}', '${sw.id}')">
          <span class="swap-emoji">${sw.emoji}</span>
          <div class="swap-info">
            <div class="swap-name">${sw.name}</div>
            <div class="swap-savings">
              ${calSaved > 0 ? `💚 Save ${calSaved} kcal` : `📊 Grade ${swNS.grade} (${swNS.label})`}
              ${savings.proteinGain > 0 ? ` · +${savings.proteinGain}g protein` : ''}
            </div>
          </div>
          <span class="grade-badge ${swNS.textClass}">${swNS.grade}</span>
          <div class="swap-actions">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openCompareFromSwap('${snack.id}', '${sw.id}')">Compare</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;

  } else if (tab === 'compare') {
    renderCompareTab();

  } else if (tab === 'exercise') {
    const exercises = ExerciseCalc.getForSnack(snack);
    const calPerServing = Math.round((snack.calories * snack.servingSize) / 100);
    body.innerHTML = `
    <div style="text-align:center;margin-bottom:1.5rem;">
      <div style="font-size:0.85rem;color:var(--text-secondary);">
        To burn off <strong style="color:var(--accent)">${calPerServing} kcal</strong>
        from one serving of <strong>${snack.name}</strong>, you'd need to…
      </div>
    </div>
    <div class="exercise-grid">
      ${exercises.map(ex => `
      <div class="exercise-card">
        <div class="exercise-emoji">${ex.emoji}</div>
        <div class="exercise-name">${ex.name}</div>
        <div class="exercise-time">${ex.minutes}</div>
        <div class="exercise-unit">minutes</div>
      </div>`).join('')}
    </div>
    <p style="text-align:center;font-size:0.75rem;color:var(--text-muted);margin-top:1rem;">
      * Calculated for a 65kg person using MET values
    </p>`;
  }
}

function nutritionTableRow(label, val, unit) {
  return `<tr><td>${label}</td><td>${val} ${unit}</td></tr>`;
}

// ─── COMPARE TAB ─────────────────────────────────────────────
function renderCompareTab() {
  const body = $('#modal-tab-body');
  const snack = state.selectedSnack;

  if (!state.compareWith) {
    // Show selector
    const others = SNACKS.filter(s => s.id !== snack.id);
    body.innerHTML = `
    <div style="margin-bottom:1rem;">
      <h4 style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">
        Select a snack to compare with
      </h4>
      <input type="text" id="compare-search" class="search-input" placeholder="Search snack…" style="border-radius:var(--radius);" oninput="filterCompareList(this.value)">
    </div>
    <div id="compare-list" style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto;">
      ${renderCompareList(others)}
    </div>`;
  } else {
    renderComparison(snack, state.compareWith);
  }
}

function renderCompareList(snacks) {
  return snacks.map(s => {
    const ns = NutriScore.calculate(s);
    return `
    <div class="swap-card" onclick="selectCompare('${s.id}')">
      <span class="swap-emoji">${s.emoji}</span>
      <div class="swap-info">
        <div class="swap-name">${s.name}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">${s.brand}</div>
      </div>
      <span class="grade-badge ${ns.textClass}">${ns.grade}</span>
    </div>`;
  }).join('');
}

function filterCompareList(query) {
  const q = query.toLowerCase();
  const filtered = SNACKS.filter(s =>
    s.id !== state.selectedSnack.id &&
    (s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q))
  );
  $('#compare-list').innerHTML = renderCompareList(filtered);
}

function selectCompare(id) {
  state.compareWith = SNACKS.find(s => s.id === id);
  renderCompareTab();
}

function openCompareFromSwap(origId, swapId) {
  state.selectedSnack = SNACKS.find(s => s.id === origId);
  state.compareWith = SNACKS.find(s => s.id === swapId);
  renderModal(state.selectedSnack);
  renderModalTab('compare');
  if (!$('#snack-modal').classList.contains('open')) {
    $('#snack-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function renderComparison(a, b) {
  const body = $('#modal-tab-body');
  const nsA = NutriScore.calculate(a);
  const nsB = NutriScore.calculate(b);
  const savings = SwapRecommender.getSavings(a, b);

  const fields = [
    { label: 'Calories (kcal)', keyA: 'calories', keyB: 'calories', unit: 'kcal', lowerBetter: true },
    { label: 'Total Fat (g)', keyA: 'totalFat', keyB: 'totalFat', unit: 'g', lowerBetter: true },
    { label: 'Saturated Fat (g)', keyA: 'saturatedFat', keyB: 'saturatedFat', unit: 'g', lowerBetter: true },
    { label: 'Sugars (g)', keyA: 'sugar', keyB: 'sugar', unit: 'g', lowerBetter: true },
    { label: 'Protein (g)', keyA: 'protein', keyB: 'protein', unit: 'g', lowerBetter: false },
    { label: 'Fiber (g)', keyA: 'fiber', keyB: 'fiber', unit: 'g', lowerBetter: false },
    { label: 'Sodium (mg)', keyA: 'sodium', keyB: 'sodium', unit: 'mg', lowerBetter: true },
    { label: 'Carbs (g)', keyA: 'carbs', keyB: 'carbs', unit: 'g', lowerBetter: true }
  ];

  const compareRows = fields.map(f => {
    const vA = a[f.keyA], vB = b[f.keyB];
    const aClass = f.lowerBetter ? (vA < vB ? 'better' : vA > vB ? 'worse' : 'same') : (vA > vB ? 'better' : vA < vB ? 'worse' : 'same');
    const bClass = f.lowerBetter ? (vB < vA ? 'better' : vB > vA ? 'worse' : 'same') : (vB > vA ? 'better' : vB < vA ? 'worse' : 'same');
    return `
    <div class="compare-row">
      <span class="compare-label">${f.label}</span>
      <span class="compare-val ${aClass}">${vA}${f.unit}</span>
      <span style="color:var(--text-muted);padding:0 8px;">vs</span>
      <span class="compare-val ${bClass}">${vB}${f.unit}</span>
    </div>`;
  }).join('');

  body.innerHTML = `
  <div class="savings-banner">
    <div class="savings-title">💡 Swap Summary: ${a.name} → ${b.name}</div>
    <div class="savings-grid">
      ${savings.caloriesSaved !== 0 ? `<div class="saving-item"><div class="saving-val">${savings.caloriesSaved > 0 ? '-' : '+'}${Math.abs(savings.caloriesSaved)}</div><div class="saving-label">kcal ${savings.caloriesSaved > 0 ? 'saved' : 'more'}</div></div>` : ''}
      ${savings.proteinGain !== 0 ? `<div class="saving-item"><div class="saving-val">${savings.proteinGain > 0 ? '+' : ''}${savings.proteinGain}g</div><div class="saving-label">Protein</div></div>` : ''}
      ${savings.fiberGain !== 0 ? `<div class="saving-item"><div class="saving-val">${savings.fiberGain > 0 ? '+' : ''}${savings.fiberGain}g</div><div class="saving-label">Fiber</div></div>` : ''}
      ${savings.sodiumReduction !== 0 ? `<div class="saving-item"><div class="saving-val">${savings.sodiumReduction > 0 ? '-' : '+'}${Math.abs(savings.sodiumReduction)}mg</div><div class="saving-label">Sodium</div></div>` : ''}
      <div class="saving-item"><div class="saving-val">${savings.gradeImprovement}</div><div class="saving-label">Grade Change</div></div>
    </div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span>${a.emoji}</span>
      <strong>${a.name}</strong>
      <span class="grade-badge ${nsA.textClass}">${nsA.grade}</span>
    </div>
    <span style="color:var(--text-muted);">VS</span>
    <div style="display:flex;align-items:center;gap:8px;">
      <span class="grade-badge ${nsB.textClass}">${nsB.grade}</span>
      <strong>${b.name}</strong>
      <span>${b.emoji}</span>
    </div>
  </div>

  ${compareRows}

  <div style="margin-top:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
    <div class="chart-wrapper">
      <canvas id="compare-radar-chart" height="260"></canvas>
    </div>
    <div style="display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
      <div style="font-size:0.8rem;color:var(--text-secondary);">
        Values shown per 100g for fair comparison.
      </div>
      <button class="btn btn-primary w-full" onclick="logSwap('${a.id}', '${b.id}')">
        ✅ I Swapped This!
      </button>
      <button class="btn btn-secondary w-full" onclick="state.compareWith=null;renderCompareTab()">
        🔄 Choose Different Snack
      </button>
    </div>
  </div>`;

  renderCompareRadar('compare-radar-chart', a, b);
}

// ─── RADAR CHART ─────────────────────────────────────────────
function renderRadarChart(canvasId, snack) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (ctx._chartInstance) ctx._chartInstance.destroy();

  const labels = ['Calories', 'Fat', 'Sugar', 'Protein', 'Fiber', 'Sodium'];
  const maxVals = [800, 55, 70, 30, 15, 1800];
  const data = [snack.calories, snack.totalFat, snack.sugar, snack.protein, snack.fiber, snack.sodium];
  const normalized = data.map((v, i) => Math.min(100, Math.round((v / maxVals[i]) * 100)));
  const ns = NutriScore.calculate(snack);

  ctx._chartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: snack.name,
        data: normalized,
        fill: true,
        backgroundColor: ns.color + '33',
        borderColor: ns.color,
        pointBackgroundColor: ns.color,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } } },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { display: false },
          grid: { color: 'rgba(255,255,255,0.08)' },
          angleLines: { color: 'rgba(255,255,255,0.08)' },
          pointLabels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
        }
      }
    }
  });
}

function renderCompareRadar(canvasId, a, b) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (ctx._chartInstance) ctx._chartInstance.destroy();

  const labels = ['Calories', 'Fat', 'Sugar', 'Protein', 'Fiber', 'Sodium'];
  const maxVals = [800, 55, 70, 30, 15, 1800];
  const normalize = snack => [snack.calories, snack.totalFat, snack.sugar, snack.protein, snack.fiber, snack.sodium]
    .map((v, i) => Math.min(100, Math.round((v / maxVals[i]) * 100)));
  const nsA = NutriScore.calculate(a);
  const nsB = NutriScore.calculate(b);

  ctx._chartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label: a.name,
          data: normalize(a),
          fill: true,
          backgroundColor: '#ef444433',
          borderColor: '#ef4444',
          pointBackgroundColor: '#ef4444',
          pointRadius: 4
        },
        {
          label: b.name,
          data: normalize(b),
          fill: true,
          backgroundColor: '#10b98133',
          borderColor: '#10b981',
          pointBackgroundColor: '#10b981',
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
        }
      },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { display: false },
          grid: { color: 'rgba(255,255,255,0.08)' },
          angleLines: { color: 'rgba(255,255,255,0.08)' },
          pointLabels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
        }
      }
    }
  });
}

// ─── QUICK SWAP ───────────────────────────────────────────────
function quickSwap(id) {
  const snack = SNACKS.find(s => s.id === id);
  state.selectedSnack = snack;
  state.compareWith = null;
  openSnackModal(id);
  setTimeout(() => renderModalTab('swaps'), 50);
}

// ─── LOG SWAP ─────────────────────────────────────────────────
function logSwap(origId, swapId) {
  const orig = SNACKS.find(s => s.id === origId);
  const swap = SNACKS.find(s => s.id === swapId);
  SwapTracker.logSwap(orig, swap);
  showToast(`✅ Swap logged! You chose ${swap.name} over ${orig.name}`, 'success');
  renderTrackerDashboard();
  setTimeout(() => {
    navigateTo('tracker');
    closeModal();
  }, 1200);
}

// ─── TRACKER ─────────────────────────────────────────────────
function renderTrackerDashboard() {
  const summary = SwapTracker.getSummary();
  const container = $('#tracker-page');
  if (!container) return;

  const dashboard = $('#tracker-dashboard');
  if (!dashboard) return;

  dashboard.innerHTML = `
  <div class="tracker-stats">
    <div class="tracker-stat-card">
      <div class="tracker-stat-val">${summary.totalSwaps}</div>
      <div class="tracker-stat-label">🔄 Total Swaps</div>
    </div>
    <div class="tracker-stat-card">
      <div class="tracker-stat-val">${summary.totalCaloriesSaved}</div>
      <div class="tracker-stat-label">🔥 Calories Saved</div>
    </div>
    <div class="tracker-stat-card">
      <div class="tracker-stat-val">${summary.totalSugarReduction}g</div>
      <div class="tracker-stat-label">🍬 Sugar Reduced</div>
    </div>
    <div class="tracker-stat-card">
      <div class="tracker-stat-val">${summary.totalSodiumReduction}mg</div>
      <div class="tracker-stat-label">🧂 Sodium Reduced</div>
    </div>
    <div class="tracker-stat-card">
      <div class="tracker-stat-val">+${summary.totalProteinGain}g</div>
      <div class="tracker-stat-label">💪 Protein Gained</div>
    </div>
  </div>

  <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
    <span class="section-title" style="margin:0;">📋 Swap Log</span>
    ${summary.totalSwaps > 0 ? `<button class="btn btn-danger btn-sm" onclick="clearSwaps()">🗑️ Clear All</button>` : ''}
  </div>

  ${summary.totalSwaps === 0 ? `
    <div class="empty-state">
      <div class="empty-state-icon">📊</div>
      <h3>No swaps logged yet</h3>
      <p>Search for a junk snack and click "I Swapped This!" to start tracking.</p>
    </div>` : `
    <div class="tracker-log">
      ${summary.entries.map(e => `
      <div class="log-entry" id="log-${e.id}">
        <div class="log-names">
          <span class="log-orig">${e.originalName}</span>
          <span class="log-swap-arrow"> → </span>
          <span class="log-new">${e.swapName}</span>
        </div>
        <div>
          <div class="log-saved">-${e.caloriesSaved || 0} kcal</div>
          <div class="log-date">${new Date(e.date).toLocaleDateString('en-IN', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <button class="log-remove" onclick="removeLogEntry(${e.id})" title="Remove">✕</button>
      </div>`).join('')}
    </div>`}`;
}

function clearSwaps() {
  if (confirm('Clear all logged swaps?')) {
    SwapTracker.clearAll();
    renderTrackerDashboard();
    showToast('Swap log cleared', 'info');
  }
}

function removeLogEntry(id) {
  SwapTracker.removeEntry(id);
  renderTrackerDashboard();
}

// ─── HOSTEL HACKS ─────────────────────────────────────────────
function renderHostelHacks() {
  const container = $('#hostel-grid');
  if (!container) return;
  container.innerHTML = HOSTEL_HACKS.map(h => `
  <div class="hostel-card">
    <div class="hostel-header">
      <span class="hostel-emoji">${h.emoji}</span>
      <div>
        <div class="hostel-name">${h.name}</div>
      </div>
    </div>
    <div class="hostel-meta">
      <span class="hostel-tag prep">${h.prep}</span>
      <span class="hostel-tag time">⏱ ${h.time}</span>
      <span class="hostel-tag cost">${h.cost}</span>
      <span class="hostel-tag cal">🔥 ${h.calories} kcal</span>
    </div>
    <div class="hostel-desc">${h.description}</div>
    <div class="hostel-ingredients">
      ${h.ingredients.map(i => `<span class="hostel-ing">🧪 ${i}</span>`).join('')}
    </div>
  </div>`).join('');
}

// ─── NAVIGATION ───────────────────────────────────────────────
function navigateTo(page) {
  state.currentPage = page;
  $$('.page').forEach(p => p.classList.remove('active'));
  $(`#${page}-page`).classList.add('active');
  updateNavActive(page);
  if (page === 'tracker') renderTrackerDashboard();
}

function updateNavActive(page) {
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
}

// ─── TOAST ───────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-msg">${msg}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ─── EVENT WIRING ─────────────────────────────────────────────
function wireEvents() {
  // Search input debounce
  const searchInput = $('#search-input');
  searchInput.addEventListener('input', (e) => {
    clearTimeout(state.debounceTimer);
    state.searchQuery = e.target.value;
    const clearBtn = $('#search-clear');
    clearBtn.classList.toggle('visible', e.target.value.length > 0);
    state.debounceTimer = setTimeout(() => {
      renderSnackGrid(getFilteredSnacks());
    }, 250);
  });

  $('#search-clear').addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    $('#search-clear').classList.remove('visible');
    renderSnackGrid(getFilteredSnacks());
    searchInput.focus();
  });

  // Filter pills
  document.addEventListener('click', (e) => {
    if (e.target.matches('.pill[data-cat]')) {
      $$('.pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      state.activeCategory = e.target.dataset.cat;
      renderSnackGrid(getFilteredSnacks());
    }
  });

  // Modal close
  $('#modal-close-btn').addEventListener('click', () => {
    closeModal();
    state.compareWith = null;
  });
  $('#snack-modal').addEventListener('click', (e) => {
    if (e.target === $('#snack-modal')) {
      closeModal();
      state.compareWith = null;
    }
  });

  // Modal tabs
  document.addEventListener('click', (e) => {
    if (e.target.matches('.modal-tab')) {
      state.compareWith = null;
      renderModalTab(e.target.dataset.tab);
    }
  });

  // Keyboard escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      state.compareWith = null;
    }
  });

  // Nav
  document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-btn[data-page]')) {
      navigateTo(e.target.closest('.nav-btn[data-page]').dataset.page);
    }
  });
}

// ─── BARCODE SCANNER (placeholder) ──────────────────────────
function startBarcodeScanner() {
  showToast('📸 Camera access requires HTTPS or localhost. Open browser console to use OpenFoodFacts API manually.', 'info', 5000);
  const video = $('#scanner-video');
  const wrapper = $('#scanner-wrapper');
  if (!video || !wrapper) return;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        video.srcObject = stream;
        video.classList.add('active');
        video.play();
        wrapper.classList.add('scanning');
        showToast('📸 Camera active. Point at a barcode.', 'info');
      })
      .catch(() => {
        showToast('Camera not available. Try on a mobile device.', 'error');
      });
  }
}

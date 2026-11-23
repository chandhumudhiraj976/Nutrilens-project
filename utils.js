// ============================================================
// NutriLens Core Utilities
// nutriScore.js  |  swapRecommender.js  |  exerciseCalc.js
// swapTracker.js  |  sugarVisualizer.js
// ============================================================

// ─── NUTRI-SCORE ALGORITHM ────────────────────────────────────
// Based on FSA/ANSES nutrient profiling model
// Returns { score, grade, label, color, bgColor }

const NutriScore = {
  calculate(snack) {
    const per100 = snack;

    // Negative points (bad nutrients) — 0 to 10 each
    const energyPoints = this._energyPoints(per100.calories);
    const satFatPoints = this._satFatPoints(per100.saturatedFat);
    const sugarPoints = this._sugarPoints(per100.sugar);
    const sodiumPoints = this._sodiumPoints(per100.sodium);

    const negativePoints = energyPoints + satFatPoints + sugarPoints + sodiumPoints;

    // Positive points (good nutrients) — 0 to 5 each
    const fiberPoints = this._fiberPoints(per100.fiber);
    const proteinPoints = this._proteinPoints(per100.protein);

    let score;
    if (negativePoints >= 11 && fiberPoints < 5) {
      score = negativePoints - fiberPoints;
    } else {
      score = negativePoints - fiberPoints - proteinPoints;
    }

    return { score, ...this._grade(score) };
  },

  _energyPoints(kcal) {
    if (kcal <= 80) return 0;
    if (kcal <= 160) return 1;
    if (kcal <= 240) return 2;
    if (kcal <= 320) return 3;
    if (kcal <= 400) return 4;
    if (kcal <= 480) return 5;
    if (kcal <= 560) return 6;
    if (kcal <= 640) return 7;
    if (kcal <= 720) return 8;
    if (kcal <= 800) return 9;
    return 10;
  },

  _satFatPoints(g) {
    if (g <= 1) return 0;
    if (g <= 2) return 1;
    if (g <= 3) return 2;
    if (g <= 4) return 3;
    if (g <= 5) return 4;
    if (g <= 6) return 5;
    if (g <= 7) return 6;
    if (g <= 8) return 7;
    if (g <= 9) return 8;
    if (g <= 10) return 9;
    return 10;
  },

  _sugarPoints(g) {
    if (g <= 4.5) return 0;
    if (g <= 9) return 1;
    if (g <= 13.5) return 2;
    if (g <= 18) return 3;
    if (g <= 22.5) return 4;
    if (g <= 27) return 5;
    if (g <= 31) return 6;
    if (g <= 36) return 7;
    if (g <= 40) return 8;
    if (g <= 45) return 9;
    return 10;
  },

  _sodiumPoints(mg) {
    if (mg <= 90) return 0;
    if (mg <= 180) return 1;
    if (mg <= 270) return 2;
    if (mg <= 360) return 3;
    if (mg <= 450) return 4;
    if (mg <= 540) return 5;
    if (mg <= 630) return 6;
    if (mg <= 720) return 7;
    if (mg <= 810) return 8;
    if (mg <= 900) return 9;
    return 10;
  },

  _fiberPoints(g) {
    if (g <= 0.9) return 0;
    if (g <= 1.9) return 1;
    if (g <= 2.8) return 2;
    if (g <= 3.7) return 3;
    if (g <= 4.7) return 4;
    return 5;
  },

  _proteinPoints(g) {
    if (g <= 1.6) return 0;
    if (g <= 3.2) return 1;
    if (g <= 4.8) return 2;
    if (g <= 6.4) return 3;
    if (g <= 8.0) return 4;
    return 5;
  },

  _grade(score) {
    if (score <= -1) return { grade: 'A', label: 'Excellent', color: '#10b981', bgColor: '#d1fae5', textClass: 'grade-a' };
    if (score <= 2)  return { grade: 'B', label: 'Good',      color: '#84cc16', bgColor: '#ecfccb', textClass: 'grade-b' };
    if (score <= 10) return { grade: 'C', label: 'Fair',      color: '#f59e0b', bgColor: '#fef3c7', textClass: 'grade-c' };
    if (score <= 18) return { grade: 'D', label: 'Poor',      color: '#f97316', bgColor: '#ffedd5', textClass: 'grade-d' };
    return             { grade: 'E', label: 'Avoid',     color: '#ef4444', bgColor: '#fee2e2', textClass: 'grade-e' };
  }
};

// ─── SWAP RECOMMENDER ─────────────────────────────────────────
// Euclidean distance on normalized nutrient vectors

const SwapRecommender = {
  recommend(snack, allSnacks, topN = 3) {
    const snackScore = NutriScore.calculate(snack);
    const healthySnacks = allSnacks.filter(s => s.type === 'healthy');

    // Use explicit swapsTo list if present
    if (snack.swapsTo && snack.swapsTo.length > 0) {
      const explicit = snack.swapsTo
        .map(id => allSnacks.find(s => s.id === id))
        .filter(Boolean)
        .slice(0, topN);
      if (explicit.length > 0) return explicit;
    }

    // Normalize features across all snacks
    const features = ['calories', 'totalFat', 'saturatedFat', 'sugar', 'protein', 'fiber', 'sodium'];
    const maxValues = {};
    features.forEach(f => {
      maxValues[f] = Math.max(...allSnacks.map(s => s[f] || 0)) || 1;
    });

    const normalize = (s) => features.map(f => (s[f] || 0) / maxValues[f]);

    const snackVec = normalize(snack);

    const scored = healthySnacks.map(hs => {
      const hsVec = normalize(hs);
      const dist = Math.sqrt(snackVec.reduce((sum, val, i) => sum + (val - hsVec[i]) ** 2, 0));
      const hsScore = NutriScore.calculate(hs);
      return { snack: hs, dist, grade: hsScore.grade };
    });

    return scored
      .sort((a, b) => a.dist - b.dist)
      .slice(0, topN)
      .map(x => x.snack);
  },

  getSavings(original, swap) {
    const perServing = (val, serving) => Math.round((val * serving) / 100);

    const oCal = perServing(original.calories, original.servingSize);
    const sCal = perServing(swap.calories, swap.servingSize);

    const oNS = NutriScore.calculate(original);
    const sNS = NutriScore.calculate(swap);

    return {
      caloriesSaved: oCal - sCal,
      fatReduction: +(original.totalFat - swap.totalFat).toFixed(1),
      satFatReduction: +(original.saturatedFat - swap.saturatedFat).toFixed(1),
      sugarReduction: +(original.sugar - swap.sugar).toFixed(1),
      proteinGain: +(swap.protein - original.protein).toFixed(1),
      fiberGain: +(swap.fiber - original.fiber).toFixed(1),
      sodiumReduction: Math.round(original.sodium - swap.sodium),
      gradeImprovement: `${oNS.grade} → ${sNS.grade}`,
      originalGrade: oNS,
      swapGrade: sNS
    };
  }
};

// ─── EXERCISE EQUIVALENCY CALCULATOR ─────────────────────────
// MET-based calculation assuming 65 kg user

const ExerciseCalc = {
  WEIGHT_KG: 65,
  EXERCISES: [
    { name: 'Walking', emoji: '🚶', met: 3.5, unit: 'min' },
    { name: 'Jogging', emoji: '🏃', met: 7.0, unit: 'min' },
    { name: 'Cycling', emoji: '🚴', met: 6.0, unit: 'min' },
    { name: 'Swimming', emoji: '🏊', met: 8.0, unit: 'min' },
    { name: 'Jump Rope', emoji: '🪂', met: 11.0, unit: 'min' },
    { name: 'Yoga', emoji: '🧘', met: 2.5, unit: 'min' }
  ],

  calculate(calories, servingSize = 100) {
    const calPerServing = Math.round((calories * servingSize) / 100);
    return this.EXERCISES.map(ex => {
      const minutes = Math.round((calPerServing * 60) / (ex.met * this.WEIGHT_KG));
      return { ...ex, minutes, calories: calPerServing };
    });
  },

  getForSnack(snack) {
    return this.calculate(snack.calories, snack.servingSize);
  }
};

// ─── SWAP TRACKER (LocalStorage) ──────────────────────────────

const SwapTracker = {
  STORAGE_KEY: 'nutrilens_swaps',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch { return []; }
  },

  logSwap(original, swapSnack) {
    const savings = SwapRecommender.getSavings(original, swapSnack);
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      originalId: original.id,
      originalName: original.name,
      swapId: swapSnack.id,
      swapName: swapSnack.name,
      caloriesSaved: savings.caloriesSaved,
      sugarReduction: savings.sugarReduction,
      sodiumReduction: savings.sodiumReduction,
      proteinGain: savings.proteinGain
    };
    const all = this.getAll();
    all.unshift(entry);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
    return entry;
  },

  getSummary() {
    const all = this.getAll();
    return {
      totalSwaps: all.length,
      totalCaloriesSaved: all.reduce((s, x) => s + (x.caloriesSaved || 0), 0),
      totalSugarReduction: +all.reduce((s, x) => s + (x.sugarReduction || 0), 0).toFixed(1),
      totalSodiumReduction: Math.round(all.reduce((s, x) => s + (x.sodiumReduction || 0), 0)),
      totalProteinGain: +all.reduce((s, x) => s + (x.proteinGain || 0), 0).toFixed(1),
      entries: all
    };
  },

  clearAll() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  removeEntry(id) {
    const all = this.getAll().filter(x => x.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
  }
};

// ─── SUGAR CUBE VISUALIZER ────────────────────────────────────
// 1 sugar cube ≈ 4g sugar

const SugarVisualizer = {
  CUBE_GRAMS: 4,

  getCubeCount(snack) {
    const totalSugar = (snack.sugar * snack.servingSize) / 100;
    return Math.ceil(totalSugar / this.CUBE_GRAMS);
  },

  renderHTML(snack) {
    const count = this.getCubeCount(snack);
    const totalG = +(snack.sugar * snack.servingSize / 100).toFixed(1);
    let html = `<div class="sugar-info">
      <span class="sugar-label">🍬 ${totalG}g sugar = ${count} sugar cubes</span>
      <div class="sugar-cubes-grid">`;
    for (let i = 0; i < Math.min(count, 40); i++) {
      html += `<span class="sugar-cube" title="4g sugar" style="animation-delay:${i * 30}ms">🟫</span>`;
    }
    if (count > 40) html += `<span class="sugar-more">+${count - 40} more</span>`;
    html += `</div></div>`;
    return html;
  }
};

// ─── HOSTEL SNACK HACKS ───────────────────────────────────────

const HOSTEL_HACKS = [
  {
    name: "Peanut Butter Banana",
    emoji: "🥜🍌",
    prep: "No cook",
    time: "2 min",
    cost: "₹20",
    calories: 280,
    description: "Slice banana, spread peanut butter. Protein + natural energy.",
    ingredients: ["1 banana", "2 tbsp peanut butter"]
  },
  {
    name: "Sprouted Chaat",
    emoji: "🌱",
    prep: "No cook",
    time: "5 min",
    cost: "₹15",
    calories: 120,
    description: "Mix sprouted moong with lemon, salt, chaat masala. Super nutritious.",
    ingredients: ["½ cup sprouted moong", "lemon", "chaat masala"]
  },
  {
    name: "Makhana Munch",
    emoji: "🌾",
    prep: "Microwave",
    time: "3 min",
    cost: "₹25",
    calories: 150,
    description: "Microwave makhana with turmeric and salt for crispy snack.",
    ingredients: ["1 cup makhana", "salt", "turmeric", "ghee (optional)"]
  },
  {
    name: "Greek Yogurt Parfait",
    emoji: "🥛",
    prep: "No cook",
    time: "3 min",
    cost: "₹35",
    calories: 160,
    description: "Layer yogurt with banana and roasted chana for satisfying crunch.",
    ingredients: ["1 cup Greek yogurt", "banana", "roasted chana"]
  },
  {
    name: "Oats in a Cup",
    emoji: "🥣",
    prep: "Hot water",
    time: "5 min",
    cost: "₹20",
    calories: 180,
    description: "Add boiling water to oats + honey + cinnamon. Zero utensils needed.",
    ingredients: ["½ cup rolled oats", "honey", "cinnamon", "hot water"]
  },
  {
    name: "Dates & Nuts Energy Ball",
    emoji: "🌴🥜",
    prep: "No cook",
    time: "5 min",
    cost: "₹30",
    calories: 220,
    description: "Blend dates + nuts in hands. Roll into balls. Natural candy.",
    ingredients: ["4 dates", "mixed nuts", "optional cocoa powder"]
  }
];

# NutriLens – SnackSwap Showdown 🥗

> **Hackathon Project** | Nutrition Facts Lookup & Healthy Snack Swap Web App

A fully client-side web application that helps college students and young professionals make healthier snack choices through instant nutrition lookup, Nutri-Score grading, and smart swap recommendations.

---

## 🚀 Quick Start

**No installation needed!** Just open `index.html` in any modern browser.

```
nutrilens/
├── index.html          ← Open this in your browser
├── css/
│   └── style.css       ← Dark-mode glassmorphism stylesheet
├── js/
│   ├── utils.js        ← NutriScore, SwapRecommender, ExerciseCalc, Tracker
│   └── app.js          ← UI controller, rendering, event handling
└── data/
    └── snacks.js       ← 40-snack JSON dataset
```

---

## ✨ Features

### Core Features
| Feature | Description |
|---|---|
| 🔍 **Snack Search** | Instant debounced search across 40 snacks with category filter pills |
| 🏷️ **Nutri-Score Grade** | A–E health grade using FSANZ/French Nutri-Score algorithm |
| 🔄 **Swap Recommender** | 2–3 healthier alternatives matched by texture/flavour profile |
| ⚖️ **Side-by-Side Compare** | Interactive diff table with calories saved, protein gained, sodium reduced |
| 🏃 **Exercise Equivalency** | Calories translated to walking/jogging/cycling/swimming minutes |
| 📊 **My Swaps Tracker** | LocalStorage-based cumulative savings dashboard |
| 📡 **Radar Charts** | Chart.js radar charts comparing 6 nutrient dimensions |

### Stretch Features
| Feature | Description |
|---|---|
| 🏠 **Hostel Hacks** | 6 no-cook dorm-room snack recipes with cost & prep time |
| 🍬 **Sugar Cube Visualizer** | Visual sugar cube count for beverages |
| 📷 **Barcode Scanner** | Camera + Open Food Facts API integration |
| 🌐 **OFF API Lookup** | Search Open Food Facts by product name or barcode |

---

## 🧮 Algorithms

### Nutri-Score (A–E Grade)
Based on the FSANZ/French Nutri-Score model:
- **Negative points** (bad): energy, saturated fat, sugars, sodium
- **Positive points** (good): fiber, protein
- **Score** = Σ negative − Σ positive
- **Grade**: A (≤−1) → B (0–2) → C (3–10) → D (11–18) → E (≥19)

### Swap Recommender
- Normalizes nutrient vectors across all 40 snacks
- Computes Euclidean distance from selected junk snack to each healthy alternative
- Uses explicit `swapsTo` mappings + texture/flavour-based filtering
- Returns top 3 closest healthier alternatives

### Exercise Equivalency
MET-based formula: `minutes = (kcal_per_serving × 60) / (MET × 65kg)`

| Activity | MET |
|---|---|
| Walking | 3.5 |
| Jogging | 7.0 |
| Cycling | 6.0 |
| Swimming | 8.0 |
| Jump Rope | 11.0 |
| Yoga | 2.5 |

---

## 📦 Dataset

40 snacks (20 junk + 20 healthy) with per-100g nutrition:
- Calories, Total Fat, Saturated Fat, Carbohydrates, Sugar, Protein, Fiber, Sodium
- Category, texture, flavour profile, serving size

**Junk snacks:** Potato Chips, Samosa, Cola, Instant Noodles, Cream Biscuits, Burger, Energy Drink, Pani Puri, Chocolate Bar, French Fries, Nachos, Cheesecake, Vada Pav, Ice Cream, Bread Pakora, Cookies, Pizza, Jalebi, Pretzel, Fried Momos

**Healthy alternatives:** Roasted Makhana, Baked Soya Crisps, Roasted Chana, Coconut Water, Lemon Water, Buttermilk, Oats Upma, Poha, Multigrain Roti, Greek Yogurt, Dark Chocolate, Mixed Nuts, Banana, Sprouted Moong, Hummus & Crackers, Multigrain Crackers, Rice Cakes, Green Tea, Dates, Trail Mix

---

## 🎮 Demo Flow

1. Open `index.html` in browser
2. Search **"Potato Chips"** → see Grade **E** rating
3. Click **"Details & Swap"** → open modal
4. Click **🔄 Swaps** tab → see "Roasted Makhana" (Grade A) recommended
5. Click **Compare** → see "90 kcal saved, +9.6g fiber, −452mg sodium"
6. Click **✅ I Swapped This!** → logged to tracker
7. Navigate to **📊 My Swaps** → see cumulative savings

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5 + CSS3 + JavaScript (ES2020) |
| Styling | Custom dark-mode CSS (glassmorphism, CSS variables, animations) |
| Charts | Chart.js 4.4 (radar charts via CDN) |
| Fonts | Google Fonts – Inter |
| Storage | Browser LocalStorage |
| API | Open Food Facts (barcode/name lookup) |

> **Why no framework?** Zero build step = instant demo. Works offline (except CDN + API calls).

---

## 🌐 Browser Compatibility

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## 📄 License

MIT License – Free for hackathon and educational use.

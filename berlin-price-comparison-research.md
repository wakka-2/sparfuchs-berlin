# Berlin Supermarket Price Comparison Platform — Research Findings

## 💡 The Idea

A platform that compares **shelf prices of daily products** (eggs, milk, vegetables, etc.) across local Berlin supermarkets, and helps customers find the best place to buy their shopping list.

**Key differentiator:** Basket-level optimization — not just "where is milk cheapest?" but "which combination of stores saves you the most money this week?"

---

## 🗺️ Market Landscape

### Existing competitors
| App | What they do | Gap |
|---|---|---|
| Marktguru | Promotional flyers & cashback | No shelf prices |
| KaufDA | Flyer aggregation, 1500+ retailers | No shelf prices, no public API |
| Smhaggle | Flyer deals | No shelf prices |

### Why there's still a gap
- None of the existing apps compare **regular shelf prices** across stores
- None offer true **basket optimization** (cheapest combination of stores for your list)
- Berlin has real price differences between Rewe, Edeka, Lidl, Aldi, Penny, Kaufland — the savings are real

---

## 📊 Data Sources

### ❌ Ruled Out — Flyer/Promo APIs only

**Marktguru API**
- Endpoint: `api.marktguru.de/api/v1/offers/search`
- Queryable by product + zip code, returns structured JSON
- **Problem:** Promotional/weekly sale prices only — not regular shelf prices

**KaufDA**
- Covers 1500+ German retailers including all major Berlin chains
- **Problem:** No public developer API, promotional data only

---

### ✅ Viable Data Sources — Shelf Prices

#### REWE (Best covered)

| Option | Details |
|---|---|
| **Pepesto API** | Paid API wrapping `shop.rewe.de` — live pricing, nutritional data, full catalog, clean JSON, one API key, no monthly commitment |
| **Apify Actor** | Ready-made scraper for REWE online store — prices, availability, descriptions, ratings |
| **GitHub CSV** | Open dataset: daily updated prices of all REWE items including EAN, grammage, product images |

#### Lidl
| Option | Details |
|---|---|
| **Apify Actor** | Scrapes `lidl.de` — prices, images, descriptions, ratings, stock status, structured JSON output |

#### Aldi
| Option | Details |
|---|---|
| **Apify (US only)** | Existing scrapers target `aldi.us`, not `aldi.de` |
| **Custom scraper** | Needed — Aldi Germany's site is less structured |

#### Penny / Kaufland / Edeka
| Option | Details |
|---|---|
| **No ready-made solution** | Custom scrapers needed for each |
| **Technically feasible** | All have online shop presences with listed prices |

---

## 🗃️ Current Data Coverage

| Store | Shelf Prices | Method | Effort |
|---|---|---|---|
| REWE | ✅ | Pepesto API or Apify | Low — plug & play |
| Lidl | ✅ | Apify Actor | Low — plug & play |
| Aldi | ⚠️ | Custom scraper | Medium |
| Penny | ⚠️ | Custom scraper | Medium |
| Kaufland | ⚠️ | Custom scraper | Medium |
| Edeka | ⚠️ | Custom scraper | Medium |

---

## ⚠️ Known Limitations & Risks

- **Promo vs shelf prices:** Flyer APIs (Marktguru/KaufDA) cover only promotional prices — not useful as primary data source for this platform
- **Aldi.de structure:** Less accessible than Rewe/Lidl — needs investigation
- **Scraper fragility:** If a supermarket redesigns their website, scrapers break and need updating
- **ToS risk:** Scraping is technically possible but may conflict with store terms of service — worth checking per store
- **No real-time stock:** None of the sources provide live stock availability

---

## 🚀 Recommended MVP Approach

### Phase 1 — Launch with 2 stores
- **REWE** via Pepesto API (or Apify)
- **Lidl** via Apify Actor
- Cover ~20 staple products: eggs, milk, bread, butter, pasta, rice, vegetables, fruit, cheese, yogurt, etc.

### Phase 2 — Expand
- Add Aldi, Penny with custom scrapers
- Expand product catalog

### Phase 3 — Differentiation
- Add price history / trend graphs
- Weekly email/push: "This week, shop at Lidl for X, Rewe for Y — saves you €5.20"
- User shopping list → optimal store recommendation

---

## 🛠️ Suggested Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript (already your stack) |
| Backend | Node.js / Python |
| Data pipeline | Apify Actors + Pepesto API + custom scrapers |
| Database | PostgreSQL (products, prices, price history) |
| Scheduler | Cron jobs — daily price refresh |
| Hosting | Vercel (frontend) + Railway or Render (backend) |

---

## 🔗 Key Links

- Pepesto REWE API: https://www.pepesto.com/supermarkets/rewe/
- Apify Lidl Scraper: https://apify.com/easyapi/lidl-product-scraper
- Apify REWE Scraper: https://apify.com/scraping_empire/rewe-market
- REWE daily prices GitHub: https://github.com/topics/rewe
- Marktguru npm package: https://github.com/sydev/marktguru

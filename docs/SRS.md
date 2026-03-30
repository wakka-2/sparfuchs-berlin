# Software Requirements Specification (SRS)

## Berlin Supermarket Price Comparison Platform — "Sparfuchs Berlin"

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Date** | 2026-03-30 |
| **Status** | Draft |
| **Author** | Engineering Team |
| **Stakeholders** | Product Owner, Engineering, Design |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Architecture](#3-system-architecture)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Requirements](#6-data-requirements)
7. [External Interfaces](#7-external-interfaces)
8. [User Interface Requirements](#8-user-interface-requirements)
9. [Security Requirements](#9-security-requirements)
10. [Legal & Compliance](#10-legal--compliance)
11. [Constraints & Assumptions](#11-constraints--assumptions)
12. [Acceptance Criteria](#12-acceptance-criteria)
13. [Glossary](#13-glossary)
14. [Appendices](#14-appendices)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements for a web-based platform that compares **regular shelf prices** of daily grocery products across major Berlin supermarkets. The platform enables users to find the cheapest store for individual items and optimized shopping baskets.

### 1.2 Scope

**In scope (MVP — Phase 1):**
- Price comparison for ~50 staple products across REWE and Lidl
- Product search and category browsing
- Simple shopping list with per-store total calculation
- Daily automated price data ingestion
- Mobile-first responsive web application (PWA)

**Out of scope (MVP):**
- User accounts and authentication
- Basket optimization algorithm (multi-store splitting)
- Price history and trend graphs
- Push notifications and email alerts
- Aldi, Penny, Kaufland, Edeka integration
- Native mobile apps (iOS/Android)

### 1.3 Definitions & Acronyms

| Term | Definition |
|------|-----------|
| **Shelf price** | The regular, non-promotional retail price of a product |
| **Basket** | A user's collection of products they intend to purchase |
| **Product match** | A mapping between equivalent products across different stores |
| **EAN** | European Article Number — unique barcode identifier for products |
| **PWA** | Progressive Web App |
| **GTM** | Go-to-Market |

### 1.4 References

- [berlin-price-comparison-research.md](../berlin-price-comparison-research.md) — Initial market research
- Pepesto API Documentation: https://www.pepesto.com/supermarkets/rewe/
- Apify Lidl Scraper: https://apify.com/easyapi/lidl-product-scraper

---

## 2. Overall Description

### 2.1 Product Vision

> Help Berlin residents save money on groceries by showing them real shelf prices across supermarkets — not promotional flyers, but the actual prices on the shelf today.

### 2.2 Target Users

#### Primary Persona: Budget-Conscious Berlin Resident
- **Age**: 25-45
- **Behavior**: Shops weekly at 1-2 supermarkets, price-aware due to inflation
- **Need**: Wants to know if switching stores for certain items saves meaningful money
- **Tech**: Smartphone-primary, uses apps daily, expects fast mobile UX
- **Language**: German primary, English secondary (large expat population)

#### Secondary Persona: Berlin Expat
- **Behavior**: Unfamiliar with German supermarket landscape
- **Need**: Needs guidance on which stores are cheapest for staples
- **Language**: English primary

### 2.3 User Stories (MVP)

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|-----------|----------|
| US-01 | Shopper | Search for a product by name | I can find its price at different stores | P0 |
| US-02 | Shopper | See prices of a product at REWE and Lidl side by side | I know which store is cheaper | P0 |
| US-03 | Shopper | Browse products by category (dairy, bread, etc.) | I can explore staple items | P0 |
| US-04 | Shopper | Add products to a shopping list | I can plan my weekly shop | P0 |
| US-05 | Shopper | See the total cost of my list at each store | I know which store saves me more overall | P0 |
| US-06 | Shopper | See the per-unit price (€/kg, €/L) | I can compare different package sizes fairly | P1 |
| US-07 | Shopper | See when prices were last updated | I trust the data is current | P1 |
| US-08 | Shopper | Use the app on my phone while shopping | I can check prices in-store | P0 |
| US-09 | Shopper | Switch between German and English | I can use the app in my preferred language | P2 |
| US-10 | Shopper | Share my shopping list via link | I can coordinate with my household | P2 |

### 2.4 Product Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    Sparfuchs Berlin                      │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │ Product   │  │ Shopping │  │ Price Comparison      │ │
│  │ Catalog   │  │ List     │  │ Engine                │ │
│  │           │  │          │  │                       │ │
│  │ - Search  │  │ - Add    │  │ - Per-item compare    │ │
│  │ - Browse  │  │ - Remove │  │ - Basket total/store  │ │
│  │ - Filter  │  │ - Share  │  │ - Unit price norm.    │ │
│  └──────────┘  └──────────┘  └───────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Data Pipeline (Background)                        │   │
│  │                                                   │   │
│  │ REWE API ──► Normalizer ──► PostgreSQL            │   │
│  │ Lidl Scraper ──► Normalizer ──►   ↑              │   │
│  │                              Product Matcher       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
                    ┌─────────────────┐
                    │   Client (PWA)  │
                    │   React 19 + TS │
                    │   Mobile-first  │
                    └────────┬────────┘
                             │ HTTPS
                             ▼
                    ┌─────────────────┐
                    │   API Gateway   │
                    │   Node.js       │
                    │   Express/Hono  │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Product  │  │ Price    │  │ List     │
        │ Service  │  │ Service  │  │ Service  │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │              │              │
             ▼              ▼              ▼
        ┌─────────────────────────────────────┐
        │          PostgreSQL                  │
        │  products | prices | stores          │
        │  categories | product_matches        │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │           Redis Cache                │
        │  price lookups | search results      │
        └─────────────────────────────────────┘

        ┌─────────────────────────────────────┐
        │     Data Pipeline (Cron)             │
        │                                      │
        │  ┌─────────┐    ┌──────────────┐    │
        │  │ Pepesto  │───►│ Normalizer   │   │
        │  │ (REWE)   │    │ & Matcher    │───► DB
        │  ├─────────┤    │              │    │
        │  │ Apify    │───►│              │    │
        │  │ (Lidl)   │    └──────────────┘    │
        │  └─────────┘                         │
        └─────────────────────────────────────┘
```

### 3.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React 19, TypeScript, TailwindCSS, Vite | Modern, fast, developer-friendly, PWA-capable |
| **Backend** | Node.js 22, Hono (or Express), TypeScript | Shared language with frontend, lightweight, fast |
| **Database** | PostgreSQL 16 | Relational integrity for product/price data, JSONB for flexible attributes |
| **Cache** | Redis 7 | Sub-millisecond price lookups, search result caching |
| **ORM** | Drizzle ORM | Type-safe, lightweight, excellent PostgreSQL support |
| **Data Pipeline** | Node.js scripts + node-cron | Same language, no infra overhead for MVP |
| **Hosting** | Vercel (frontend) + Railway (backend + DB + Redis) | Fast deployment, generous free tiers, EU regions |
| **State Management** | Zustand | Lightweight, TypeScript-native, no boilerplate |
| **Monorepo** | Turborepo | Shared types between frontend/backend |
| **Testing** | Vitest (unit), Playwright (E2E) | Fast, modern, TypeScript-native |
| **CI/CD** | GitHub Actions | Free for public repos, well-integrated |

### 3.3 Monorepo Structure

```
sparfuchs-berlin/
├── apps/
│   ├── web/                    # React frontend (Vite + React 19)
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── pages/          # Route pages
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── stores/         # Zustand state management
│   │   │   ├── lib/            # Utilities, API client
│   │   │   ├── i18n/           # German/English translations
│   │   │   └── types/          # Frontend-specific types
│   │   ├── public/
│   │   │   ├── manifest.json   # PWA manifest
│   │   │   └── sw.js           # Service worker
│   │   └── package.json
│   │
│   └── api/                    # Backend API (Hono)
│       ├── src/
│       │   ├── routes/         # API route handlers
│       │   ├── services/       # Business logic
│       │   ├── db/             # Database schema + migrations
│       │   │   ├── schema.ts   # Drizzle schema
│       │   │   └── migrations/ # SQL migrations
│       │   ├── cache/          # Redis caching layer
│       │   └── middleware/     # Rate limiting, CORS, logging
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types, constants, validation
│   │   ├── src/
│   │   │   ├── types/          # Product, Price, Store interfaces
│   │   │   ├── constants/      # Categories, store IDs
│   │   │   └── validation/     # Zod schemas for API contracts
│   │   └── package.json
│   │
│   └── data-pipeline/          # Data ingestion scripts
│       ├── src/
│       │   ├── sources/        # Per-store data fetchers
│       │   │   ├── rewe.ts     # Pepesto API client
│       │   │   └── lidl.ts     # Apify Lidl scraper client
│       │   ├── normalizer/     # Price & unit normalization
│       │   ├── matcher/        # Product matching logic
│       │   ├── scheduler.ts    # Cron job orchestration
│       │   └── monitor.ts      # Data freshness monitoring
│       └── package.json
│
├── docs/                       # Project documentation
│   ├── SRS.md                  # This document
│   ├── database-schema.md      # Database design
│   └── api-spec.md             # API contract
│
├── turbo.json                  # Turborepo config
├── package.json                # Root package.json
├── .env.example                # Environment variables template
├── docker-compose.yml          # Local development (Postgres + Redis)
└── README.md
```

### 3.4 API Versioning Strategy

- Current version: `v1` (prefix `/api/v1/`)
- Breaking changes (response shape, removed fields) require a new version (`v2`)
- Non-breaking additions (new optional fields, new endpoints) stay in current version
- Deprecated versions receive 6-month sunset notice via `Sunset` HTTP header
- For MVP: only `v1` exists; versioning strategy is documented for future expansion

---

## 4. Functional Requirements

### 4.1 Product Catalog

| ID | Requirement | Priority | Acceptance Criteria |
|----|------------|----------|-------------------|
| FR-01 | System shall display products with name, image, category, and unit size | P0 | All 50 MVP products visible with complete data |
| FR-02 | System shall support product search by name (German primary, English secondary) | P0 | Search returns results in <200ms; German full-text search with GIN index; English search via secondary GIN index on `name_en`; handles partial matches and umlauts (ä→ae fallback) |
| FR-03 | System shall organize products into categories | P0 | Min 8 categories: Dairy, Bread, Meat, Fruits, Vegetables, Beverages, Pantry, Frozen |
| FR-04 | System shall display per-unit price (€/kg, €/L, €/Stück) | P1 | Unit prices calculated and shown for all products |
| FR-05 | System shall show "last updated" timestamp per product | P1 | Timestamp visible, updated after each pipeline run |

### 4.2 Price Comparison

| ID | Requirement | Priority | Acceptance Criteria |
|----|------------|----------|-------------------|
| FR-10 | System shall show prices from REWE and Lidl side-by-side | P0 | Both prices visible on product card, cheaper store highlighted |
| FR-11 | System shall highlight the cheaper option per product | P0 | Visual indicator (color, badge) on cheaper price |
| FR-12 | System shall show price difference in € and % | P1 | "€0.30 cheaper (12%)" format |
| FR-13 | System shall handle missing prices gracefully | P0 | "Not available at [store]" message when product not found |
| FR-14 | System shall show product image from each store when available | P2 | Images lazy-loaded, fallback placeholder for missing images |

### 4.3 Shopping List

| ID | Requirement | Priority | Acceptance Criteria |
|----|------------|----------|-------------------|
| FR-20 | User shall add/remove products to a shopping list | P0 | Add from product card or search results |
| FR-21 | User shall adjust quantity per item | P0 | Quantity selector (1-99), defaults to 1 |
| FR-22 | System shall calculate total basket cost per store | P0 | Running total updates in real-time as items added/removed |
| FR-23 | System shall indicate which store is cheapest for the full basket | P0 | Clear "You save €X.XX at [store]" message |
| FR-24 | Shopping list shall persist in browser localStorage | P0 | List survives page refresh and browser close |
| FR-25 | User shall share shopping list via URL | P2 | MVP: list encoded as base64 in URL hash (no backend needed, ~20 items max). Post-MVP: short ID via `POST /api/v1/basket/share` → `GET /api/v1/basket/shared/:id` |

### 4.4 Data Pipeline

| ID | Requirement | Priority | Acceptance Criteria |
|----|------------|----------|-------------------|
| FR-30 | Pipeline shall fetch REWE prices daily via Pepesto API | P0 | All MVP products updated by 06:00 CET |
| FR-31 | Pipeline shall fetch Lidl prices daily via Apify Actor | P0 | All MVP products updated by 06:00 CET |
| FR-32 | Pipeline shall normalize product data to common schema | P0 | All products have: name, price, unit, unit_price, store, category, EAN (when available) |
| FR-33 | Pipeline shall log ingestion results (success/failure per product) | P0 | Logs stored, alerting on >10% failure rate |
| FR-34 | Pipeline shall not overwrite prices with null/zero on fetch failure | P0 | Previous valid price retained on error |
| FR-35 | Pipeline shall record price history for every price change | P1 | price_history table updated on each price delta |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Target |
|----|------------|--------|
| NFR-01 | Page load time (first contentful paint) | < 1.5s on 4G |
| NFR-02 | Search response time | < 200ms (cached), < 500ms (uncached) |
| NFR-03 | Product list rendering (50 items) | < 100ms |
| NFR-04 | Shopping list total recalculation | < 50ms |
| NFR-05 | API response time (p95) | < 300ms |
| NFR-06 | Daily pipeline execution time | < 10 minutes |

### 5.2 Availability & Reliability

| ID | Requirement | Target |
|----|------------|--------|
| NFR-10 | System uptime | 99.5% (allows ~3.6 hours downtime/month) |
| NFR-11 | Data freshness | Prices no older than 26 hours |
| NFR-12 | Graceful degradation | App functional with cached data when API is down |
| NFR-13 | Pipeline failure recovery | Auto-retry 3x with exponential backoff |

### 5.3 Scalability (MVP targets)

| ID | Requirement | Target |
|----|------------|--------|
| NFR-20 | Concurrent users | 500 |
| NFR-21 | Products in catalog | 50 (MVP), expandable to 5,000+ |
| NFR-22 | Stores supported | 2 (MVP), architecture supports 10+ |
| NFR-23 | Database size (year 1) | < 1 GB |

### 5.4 Accessibility

| ID | Requirement | Target |
|----|------------|--------|
| NFR-30 | WCAG compliance level | AA |
| NFR-31 | Keyboard navigation | Full app navigable without mouse |
| NFR-32 | Screen reader support | All interactive elements labeled |
| NFR-33 | Color contrast ratio | Min 4.5:1 (text), 3:1 (large text) |

### 5.5 Internationalization

| ID | Requirement | Target |
|----|------------|--------|
| NFR-40 | Default language | German (de-DE) |
| NFR-41 | Supported languages | German, English |
| NFR-42 | Currency formatting | Euro (€) with German locale (1.234,56 €) |
| NFR-43 | Date formatting | DD.MM.YYYY (German standard) |

---

## 6. Data Requirements

### 6.1 Data Model Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   stores     │     │   products       │     │ categories  │
│              │     │                  │     │             │
│ id           │     │ id               │     │ id          │
│ name         │     │ name_de          │     │ name_de     │
│ slug         │     │ name_en          │     │ name_en     │
│ logo_url     │     │ category_id (FK) │────►│ slug        │
│ website_url  │     │ image_url        │     │ icon        │
│ color_hex    │     │ default_unit     │     │ sort_order  │
│ is_active    │     │ created_at       │     └─────────────┘
└──────┬───────┘     │ updated_at       │
       │             └────────┬─────────┘
       │                      │
       │     ┌────────────────┴────────────────┐
       │     │       product_matches           │
       │     │                                  │
       │     │ id                               │
       │     │ product_id (FK)                  │
       │     │ store_id (FK) ◄─────────────────┤
       │     │ external_product_id              │
       │     │ external_name                    │
       │     │ ean                              │
       │     │ match_confidence (0.0-1.0)       │
       │     │ is_verified (manual review flag) │
       │     └────────────────┬────────────────┘
       │                      │
       │     ┌────────────────┴────────────────┐
       │     │          prices                  │
       │     │   (one row per product_match)    │
       ├────►│ id                               │
             │ product_match_id (FK, unique)    │
             │ price_cents (integer)            │
             │ unit_size                        │
             │ unit_type (kg|L|Stück|Packung)   │
             │ unit_price_cents                 │
             │ currency (EUR)                   │
             │ fetched_at                       │
             └────────────────┬────────────────┘
                              │
             ┌────────────────┴────────────────┐
             │       price_history              │
             │                                  │
             │ id                               │
             │ product_match_id (FK)            │
             │ price_cents                      │
             │ unit_price_cents                 │
             │ valid_from                       │
             │ valid_until (nullable)           │
             └─────────────────────────────────┘
```

### 6.2 Key Data Rules

| Rule | Description |
|------|-----------|
| **Prices in cents** | All prices stored as integers in cents to avoid floating-point issues (€1.99 → 199) |
| **Unit normalization** | All unit prices normalized to per-kg or per-liter for comparison |
| **Soft deletes** | Products are deactivated, never deleted, to preserve price history |
| **UTC timestamps** | All timestamps stored in UTC, converted to CET/CEST in frontend |
| **Match confidence** | Product matches below 0.7 confidence flagged for manual review |
| **One price per match** | `prices` table has exactly one row per product_match (unique constraint); history tracked separately in `price_history` |

### 6.3 MVP Product Catalog (50 items)

| Category | Products | Count |
|----------|---------|-------|
| **Dairy** | Vollmilch 3.5%, Fettarme Milch 1.5%, Butter, Gouda (sliced), Mozzarella, Naturjoghurt, Griechischer Joghurt, Sahne, Frischkäse | 9 |
| **Bread & Bakery** | Toastbrot, Vollkornbrot, Brötchen (Aufback) | 3 |
| **Meat & Deli** | Hähnchenbrust, Hackfleisch (gemischt), Salami, Kochschinken | 4 |
| **Fruits** | Bananen, Äpfel, Trauben, Zitronen, Erdbeeren (seasonal) | 5 |
| **Vegetables** | Tomaten, Gurke, Paprika, Kartoffeln, Zwiebeln, Karotten, Eisbergsalat | 7 |
| **Beverages** | Mineralwasser (1.5L), Orangensaft, Apfelsaft, Kaffee (Filterkaffee), Schwarzer Tee | 5 |
| **Pantry** | Spaghetti, Reis, Mehl, Zucker, Sonnenblumenöl, Passierte Tomaten, Müsli | 7 |
| **Frozen** | TK-Pizza, TK-Gemüse (Erbsen), Fischstäbchen, TK-Spinat | 4 |
| **Eggs** | Eier Freilandhaltung (10er), Eier Bodenhaltung (10er) | 2 |
| **Household** | Spülmittel, Toilettenpapier, Küchenrolle, Waschmittel | 4 |
| | **Total** | **50** |

---

## 7. External Interfaces

### 7.1 Data Source APIs

#### REWE — Pepesto API

| Attribute | Value |
|-----------|-------|
| **Provider** | Pepesto (https://www.pepesto.com) |
| **Data** | Product name, price, EAN, grammage, image URL, nutritional info |
| **Format** | REST API, JSON response |
| **Auth** | API key |
| **Rate Limit** | TBD — verify during Phase 0 |
| **Refresh** | Daily (05:00 CET) |
| **Fallback** | Apify REWE Actor or GitHub CSV dataset |

#### Lidl — Apify Actor

| Attribute | Value |
|-----------|-------|
| **Provider** | Apify (community actor: easyapi/lidl-product-scraper) |
| **Data** | Product name, price, image, description, ratings |
| **Format** | Apify Actor run → JSON dataset |
| **Auth** | Apify API token |
| **Rate Limit** | Based on Apify plan (free tier: limited compute) |
| **Refresh** | Daily (05:30 CET) |
| **Fallback** | Custom scraper targeting lidl.de |

### 7.2 Backend API Endpoints (REST)

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/api/v1/products` | List products with prices (filter via `?category=slug`) | Paginated product list with prices per store |
| GET | `/api/v1/products/:id` | Single product detail | Product + all store prices + match info |
| GET | `/api/v1/products/search?q=` | Search products | Filtered product list |
| GET | `/api/v1/categories` | List categories | Category list with product counts |
| GET | `/api/v1/stores` | List active stores | Store info (name, logo, color) |
| POST | `/api/v1/basket/calculate` | Calculate basket totals | Per-store totals, savings, cheapest store |
| GET | `/api/v1/health` | Health check | Pipeline status, data freshness |

> **Note:** Category filtering is handled via the `?category=slug` query parameter on `GET /products`, not a separate endpoint. See [api-spec.md](api-spec.md) for full contract details.

### 7.3 API Response Schemas

> **Canonical source:** [api-spec.md](api-spec.md) is the single source of truth for response shapes. The examples below are summaries — always defer to api-spec.md during implementation.

#### Product with Prices
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Vollmilch 3.5%",
  "category": { "slug": "dairy", "name": "Milchprodukte" },
  "image_url": "https://cdn.sparfuchs-berlin.de/products/vollmilch.jpg",
  "default_unit": "L",
  "prices": [
    {
      "store_slug": "rewe",
      "store_name": "REWE",
      "store_color": "#CC0000",
      "price_cents": 119,
      "price_formatted": "1,19 €",
      "unit_size": "1L",
      "unit_price_cents": 119,
      "unit_price_formatted": "1,19 €/L",
      "fetched_at": "2026-03-30T04:00:00Z",
      "is_cheapest": true
    },
    {
      "store_slug": "lidl",
      "store_name": "Lidl",
      "store_color": "#0050AA",
      "price_cents": 129,
      "price_formatted": "1,29 €",
      "unit_size": "1L",
      "unit_price_cents": 129,
      "unit_price_formatted": "1,29 €/L",
      "fetched_at": "2026-03-30T04:30:00Z",
      "is_cheapest": false
    }
  ],
  "savings": {
    "amount_cents": 10,
    "percentage": 7.75,
    "cheapest_store_slug": "rewe",
    "label": "0,10 € günstiger bei REWE"
  }
}
```

#### Basket Calculation Response
```json
{
  "items": [
    {
      "product_id": "550e8400-...",
      "name": "Vollmilch 3.5%",
      "quantity": 2,
      "prices": {
        "rewe": { "unit_cents": 119, "subtotal_cents": 238 },
        "lidl": { "unit_cents": 129, "subtotal_cents": 258 }
      }
    }
  ],
  "totals": {
    "rewe": {
      "total_cents": 1589,
      "total_formatted": "15,89 €",
      "items_available": 8,
      "items_missing": 0,
      "missing_products": []
    },
    "lidl": {
      "total_cents": 1449,
      "total_formatted": "14,49 €",
      "items_available": 7,
      "items_missing": 1,
      "missing_products": ["Griechischer Joghurt"]
    }
  },
  "recommendation": {
    "cheapest_complete_store": "rewe",
    "cheapest_store": "lidl",
    "max_savings_cents": 140,
    "max_savings_formatted": "1,40 €",
    "savings_percentage": 8.8,
    "note": "Lidl is cheapest but missing 1 item. REWE has all items."
  }
}
```

---

## 8. User Interface Requirements

### 8.1 Pages

| Page | Route | Description |
|------|-------|-----------|
| **Home** | `/` | Hero + search bar + featured categories + "today's biggest savings" |
| **Category** | `/kategorie/:slug` | Product grid filtered by category |
| **Product Detail** | `/produkt/:id` | Full price comparison, store links, unit details |
| **Shopping List** | `/liste` | User's basket with per-store totals |
| **About** | `/ueber-uns` | Project info, data sources, legal disclaimer |

### 8.2 Core UI Components

| Component | Description |
|-----------|-----------|
| **SearchBar** | Autocomplete search with debounced API calls (300ms) |
| **ProductCard** | Product image, name, prices from each store, "add to list" button, savings badge |
| **PriceTag** | Store-branded price display (store color, logo icon) |
| **SavingsBadge** | Green badge showing "€0.30 cheaper" or "12% günstiger" |
| **CategoryNav** | Horizontal scrollable category chips with icons |
| **BasketSummary** | Sticky bottom bar showing item count + cheapest total |
| **StoreCompareBar** | Per-store total comparison in shopping list |

### 8.3 Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Mobile-first** | Design for 375px width first, scale up to desktop |
| **Scannable** | Prices are the largest visual element on every card |
| **Store-branded** | Each store uses its brand color for instant recognition (REWE=red, Lidl=blue/yellow) |
| **Fast** | Skeleton loaders, optimistic UI, aggressive caching |
| **Accessible** | WCAG AA, high contrast, large touch targets (min 44px) |

### 8.4 Wireframe — Product Card

```
┌──────────────────────────────────┐
│  [Product Image]                 │
│                                  │
│  Vollmilch 3.5%                  │
│  1 Liter                         │
│                                  │
│  ┌──────────┐  ┌──────────┐     │
│  │ 🔴 REWE  │  │ 🔵 Lidl  │     │
│  │  €1.19   │  │  €1.29   │     │
│  │ ✓ BEST   │  │          │     │
│  └──────────┘  └──────────┘     │
│                                  │
│  💚 €0.10 günstiger bei REWE     │
│                                  │
│  [ + Zur Liste hinzufügen ]      │
└──────────────────────────────────┘
```

---

## 9. Security Requirements

| ID | Requirement | Implementation |
|----|------------|----------------|
| SEC-01 | No user data collection (MVP) | No auth, no PII stored, GDPR-minimal |
| SEC-02 | API rate limiting | 100 req/min per IP |
| SEC-03 | Input sanitization | All search queries sanitized against injection |
| SEC-04 | HTTPS only | TLS enforced via hosting provider |
| SEC-05 | API keys secured | All external API keys in environment variables, never in code |
| SEC-06 | CORS policy | Whitelist frontend domain only |
| SEC-07 | Content Security Policy | Strict CSP headers on frontend |
| SEC-08 | Dependency scanning | GitHub Dependabot enabled |

### 9.2 Monitoring & Alerting

| ID | Requirement | Implementation |
|----|------------|----------------|
| MON-01 | Pipeline failure alerting | Sentry (error tracking) + email notification on >10% failure rate |
| MON-02 | Data freshness monitoring | `/health` endpoint checked every 30 min; alert if data_age_hours > 26 |
| MON-03 | Application error tracking | Sentry DSN configured in production; captures unhandled exceptions |
| MON-04 | Uptime monitoring | Free tier external monitor (e.g., UptimeRobot) pinging `/health` every 5 min |
| MON-05 | Alert recipients | Configured via `ALERT_EMAIL` env var; defaults to project owner |

### 9.3 Backup & Recovery

| ID | Requirement | Implementation |
|----|------------|----------------|
| BAK-01 | Database backups | Railway managed PostgreSQL: automatic daily backups with 7-day retention |
| BAK-02 | Point-in-time recovery | Supported by Railway managed Postgres (Pro plan) |
| BAK-03 | Data re-ingestion | Pipeline can re-fetch all prices on demand via `run:once` command |
| BAK-04 | Configuration backup | All config in git; `.env` values documented in `.env.example` |

---

## 10. Legal & Compliance

### 10.1 Required Actions Before Launch

| Action | Status | Responsible |
|--------|--------|-------------|
| Legal review of price data scraping under German law (UWG, EU Database Directive) | NOT STARTED | External counsel |
| Review Pepesto API ToS for commercial redistribution rights | NOT STARTED | Product owner |
| Review Apify Lidl Actor ToS and data usage rights | NOT STARTED | Product owner |
| Create Impressum (legally required for German websites) | NOT STARTED | Product owner |
| Create Datenschutzerklärung (privacy policy) | NOT STARTED | Product owner |
| Cookie consent (if analytics used) | NOT STARTED | Engineering |

### 10.2 Legal Risk Mitigation

| Strategy | Description |
|----------|-----------|
| **Attribution** | Clearly state data sources: "Preise von rewe.de und lidl.de" |
| **No caching abuse** | Don't store more historical data than needed for features |
| **Disclaimer** | "Prices may differ in-store. Last updated [timestamp]" on every page |
| **Takedown readiness** | Architecture allows disabling any store's data within minutes |
| **User-contributed fallback** | Design for community price submissions as legal Plan B |

---

## 11. Constraints & Assumptions

### 11.1 Constraints

| ID | Constraint | Impact |
|----|-----------|--------|
| C-01 | MVP budget: €0-50/month hosting | Limits to free/cheap tiers (Vercel free, Railway starter) |
| C-02 | Solo developer / small team | Limits velocity, no 24/7 on-call |
| C-03 | Data source dependency | Platform value is zero if APIs go down |
| C-04 | Legal uncertainty | May need to pivot data strategy post-launch |

### 11.2 Assumptions

| ID | Assumption | Risk if Wrong |
|----|-----------|---------------|
| A-01 | Pepesto API remains available and affordable | Need to build custom REWE scraper |
| A-02 | Apify Lidl Actor is maintained by community | Need to build custom Lidl scraper |
| A-03 | Berlin supermarket prices are consistent across locations per chain | Need per-store pricing, much higher complexity |
| A-04 | 50 products cover the majority of a typical weekly shop | Users may find catalog too limited |
| A-05 | Price-sensitive users will adopt a new tool | Validate via content-first GTM |
| A-06 | German law permits price comparison from public web data | Legal review may invalidate this |

---

## 12. Acceptance Criteria

### 12.1 MVP Launch Criteria

| # | Criterion | Measurable Target |
|---|----------|------------------|
| 1 | Product catalog populated | 50 products × 2 stores with verified price data |
| 2 | Search works | Returns relevant results for German product names in <500ms |
| 3 | Price comparison visible | Every product shows both store prices side-by-side |
| 4 | Shopping list functional | Add, remove, quantity adjust, total calculation correct |
| 5 | Data pipeline stable | 7 consecutive days of successful daily updates |
| 6 | Mobile usable | Lighthouse mobile score >80 (Performance + Accessibility) |
| 7 | Legal clearance | Legal review completed, no blocking issues identified |
| 8 | Impressum & Datenschutz | Legal pages published and accessible |

### 12.2 Post-MVP Success Metrics

| Metric | 1-Month Target | 3-Month Target |
|--------|---------------|----------------|
| Weekly active users | 200 | 1,000 |
| Products in catalog | 100 | 300 |
| Shopping lists created | 50/week | 300/week |
| Data pipeline uptime | 95% | 99% |
| Average session duration | >2 min | >3 min |

---

## 13. Glossary

| Term | Definition |
|------|-----------|
| **Sparfuchs** | German slang for "bargain hunter" (lit. "saving fox") |
| **Freilandhaltung** | Free-range (egg farming method) |
| **Bodenhaltung** | Barn-raised (egg farming method) |
| **Impressum** | Legally required publisher identification page under German law (TMG §5) |
| **Datenschutzerklärung** | Privacy policy as required by GDPR |
| **UWG** | Gesetz gegen den unlauteren Wettbewerb (Unfair Competition Act) |
| **EAN/GTIN** | European Article Number / Global Trade Item Number |

---

## 14. Appendices

### Appendix A: Phase Roadmap

| Phase | Scope | Timeline |
|-------|-------|----------|
| **Phase 0** | Validation — legal review, data source testing, demand validation | Weeks 1-3 |
| **Phase 1 (MVP)** | 50 products × 2 stores, search, compare, shopping list | Weeks 4-10 |
| **Phase 2** | Add Aldi + Penny, expand to 200 products, price history | Weeks 11-18 |
| **Phase 3** | Basket optimizer, weekly email, user accounts, price alerts | Weeks 19-26 |

### Appendix B: Risk Register

| Risk | Probability | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| Legal cease-and-desist | Medium | Critical | Pre-launch legal review | Product Owner |
| Pepesto API shutdown | Medium | High | Build custom REWE scraper as backup | Engineering |
| Product matching errors | High | Medium | Manual curation for MVP 50 products | Engineering |
| Low user adoption | Medium | High | Content-first GTM, validate before building | Product Owner |
| Scraper breakage on site redesign | High | Medium | Monitoring + alerting + 24h fix SLA | Engineering |

### Appendix C: Open Questions

| # | Question | Decision Needed By |
|---|---------|-------------------|
| 1 | Is Pepesto API legally safe for commercial use? | Before Phase 1 |
| 2 | Does Lidl Apify actor include EAN codes for matching? | Before Phase 1 |
| 3 | Are Berlin REWE prices uniform across all locations? | Before Phase 1 |
| 4 | What is the Pepesto API cost at 50-product daily fetch? | Before Phase 1 |
| 5 | Should we support offline mode via service worker? | During Phase 1 |
| 6 | Brand name: "Sparfuchs Berlin" or something else? | Before launch |

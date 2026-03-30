# API Contract Specification

## Berlin Supermarket Price Comparison Platform

**Base URL**: `https://api.sparfuchs-berlin.de/api/v1`
**Format**: JSON
**Encoding**: UTF-8
**Current Version**: v1

### Versioning Policy

- API version is part of the URL path: `/api/v1/`, `/api/v2/`
- **Non-breaking changes** (new optional fields, new endpoints) are added to the current version
- **Breaking changes** (removed/renamed fields, changed response shape) require a new version
- Deprecated versions receive a `Sunset` HTTP header with the retirement date
- Minimum 6-month sunset period before a version is removed
- For MVP: only `v1` exists

---

## Common Response Envelope

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-30T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Product not found"
  },
  "meta": {
    "timestamp": "2026-03-30T12:00:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## Endpoints

### Products

#### GET /products

List all products with current prices.

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `category` | string | No | — | Filter by category slug |
| `store` | string | No | — | Filter to products available at store slug |
| `sort` | string | No | `name` | Sort: `name`, `price_asc`, `price_desc`, `savings` |
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Items per page (max 100) |
| `lang` | string | No | `de` | Response language: `de`, `en` |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Vollmilch 3.5%",
        "category": {
          "slug": "dairy",
          "name": "Milchprodukte"
        },
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
    ]
  },
  "meta": {
    "timestamp": "2026-03-30T12:00:00Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_items": 50,
      "total_pages": 3
    }
  }
}
```

---

#### GET /products/search

Full-text product search.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query (min 2 chars) |
| `limit` | integer | No | Max results (default 10, max 50) |
| `lang` | string | No | Response language: `de`, `en` |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "query": "milch",
    "results": [
      {
        "id": "550e8400-...",
        "name": "Vollmilch 3.5%",
        "category_slug": "dairy",
        "cheapest_price_cents": 119,
        "cheapest_store_slug": "rewe",
        "relevance_score": 0.95
      }
    ]
  }
}
```

---

#### GET /products/:id

Single product with full price details.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-...",
    "name": "Vollmilch 3.5%",
    "name_de": "Vollmilch 3.5%",
    "name_en": "Whole Milk 3.5%",
    "category": {
      "slug": "dairy",
      "name": "Milchprodukte"
    },
    "image_url": "https://...",
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
        "external_name": "REWE Beste Wahl Frische Vollmilch 3,5%",
        "external_url": "https://shop.rewe.de/...",
        "ean": "4388860123456",
        "fetched_at": "2026-03-30T04:00:00Z",
        "is_cheapest": true
      }
    ],
    "savings": {
      "amount_cents": 10,
      "percentage": 7.75,
      "cheapest_store_slug": "rewe",
      "label": "0,10 € günstiger bei REWE"
    }
  }
}
```

---

### Categories

#### GET /categories

List all product categories with item counts.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "slug": "dairy",
        "name": "Milchprodukte",
        "icon": "🥛",
        "product_count": 8,
        "sort_order": 1
      }
    ]
  }
}
```

---

### Stores

#### GET /stores

List all active stores.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "stores": [
      {
        "slug": "rewe",
        "name": "REWE",
        "logo_url": "https://...",
        "website_url": "https://www.rewe.de",
        "color_hex": "#CC0000",
        "product_count": 48,
        "last_updated": "2026-03-30T04:00:00Z"
      }
    ]
  }
}
```

---

### Basket

#### POST /basket/calculate

Calculate total cost of a shopping list at each store.

**Request Body:**

```json
{
  "items": [
    { "product_id": "550e8400-...", "quantity": 2 },
    { "product_id": "660e9500-...", "quantity": 1 }
  ]
}
```

**Validation:**
- `items`: array, min 1, max 50 items
- `product_id`: valid UUID
- `quantity`: integer, min 1, max 99

**Response 200:**

```json
{
  "success": true,
  "data": {
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
}
```

**Error Responses:**

- **400 VALIDATION_ERROR** — Empty items array, invalid UUID, quantity out of range (1-99)
- **404 NOT_FOUND** — All provided product_ids are invalid (none exist in database)
- **200 with partial data** — Some product_ids are valid but have no current price at one or more stores. These products appear in `missing_products` arrays per store, and `items_missing` count reflects this. The endpoint does NOT return an error for partial availability — it calculates totals with available items only.

---

### Health

#### GET /health

System health and data freshness check.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "stores": {
      "rewe": {
        "last_pipeline_run": "2026-03-30T04:00:00Z",
        "status": "success",
        "products_updated": 48,
        "data_age_hours": 8.5
      },
      "lidl": {
        "last_pipeline_run": "2026-03-30T04:30:00Z",
        "status": "success",
        "products_updated": 45,
        "data_age_hours": 8.0
      }
    },
    "database": "connected",
    "cache": "connected"
  }
}
```

---

## Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request parameters |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMITED` | Too many requests (100/min per IP) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 503 | `SERVICE_UNAVAILABLE` | Database or cache unavailable |

---

## Rate Limiting

| Tier | Limit | Window |
|------|-------|--------|
| Default (no auth) | 100 requests | Per minute per IP |
| Search endpoint | 30 requests | Per minute per IP |
| Basket calculate | 20 requests | Per minute per IP |

Rate limit headers included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1775100000
```

---

## Caching Strategy

| Endpoint | Cache TTL | Strategy |
|----------|----------|----------|
| GET /products | 1 hour | Redis, invalidate on pipeline run |
| GET /products/search | 30 min | Redis, key = normalized query |
| GET /products/:id | 1 hour | Redis, invalidate on price update |
| GET /categories | 24 hours | Redis, rarely changes |
| GET /stores | 24 hours | Redis, rarely changes |
| POST /basket/calculate | No cache | Computed per request |
| GET /health | No cache | Always fresh |

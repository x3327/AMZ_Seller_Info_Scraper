# Amazon Seller Info Scraper — Full App Specification
> **Target Model:** Minimax M2.5  
> **Marketplaces:** Amazon.es (Spain) · Amazon.co.uk (United Kingdom)  
> **Scraping Engine:** Apify API  
> **Output:** Downloadable CSV with seller business details

---

## 1. Project Overview

Build a full-stack web app and agentic workflow that:
1. Accepts one or more Amazon ASINs from the user.
2. Identifies the seller of each ASIN on the chosen marketplace.
3. Navigates to that seller's detail page (`/sp?` URL) and extracts legal/business contact information.
4. Outputs a structured, downloadable CSV file.

### Target Data Fields

| CSV Column | Source on Amazon Seller Page |
|---|---|
| `asin` | User-provided input |
| `marketplace` | User-selected (ES / UK) |
| `seller_id` | Extracted from product page URL |
| `business_name` | "Business Name" field on `/sp?` page |
| `email` | "Email" or contact address field |
| `phone_number` | "Phone" or customer service number |
| `customer_service_address` | "Customer service address" section |
| `business_address` | "Business address" section |
| `vat_number` | VAT / Tax registration number |
| `company_registration` | Company registration number (if present) |
| `seller_rating` | Star rating / feedback percentage |
| `scrape_timestamp` | ISO 8601 datetime of the run |

---

## 2. Architecture

```
┌─────────────────────────────────────────┐
│            Frontend (React/HTML)         │
│  • ASIN input list                       │
│  • Marketplace selector                  │
│  • Run button + progress bar             │
│  • Results table preview                 │
│  • CSV download button                   │
└──────────────────┬──────────────────────┘
                   │ HTTP POST
┌──────────────────▼──────────────────────┐
│         Backend Agent (Node.js)          │
│  Step 1: Build product page URLs         │
│  Step 2: Call Apify Actor #1             │
│          → Extract Seller ID from ASIN   │
│  Step 3: Build /sp? seller URLs          │
│  Step 4: Call Apify Actor #2             │
│          → Scrape detailed seller info   │
│  Step 5: Parse + flatten JSON → CSV      │
│  Step 6: Return CSV to frontend          │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│            Apify Platform                │
│  Actor 1: junglee/amazon-crawler         │
│  Actor 2: pintostudio/amazon-seller-     │
│           info-scraper                   │
└─────────────────────────────────────────┘
```

---

## 3. Apify API Details

### Credentials
```
API Token: YOUR_APIFY_API_TOKEN
Base URL:  https://api.apify.com/v2
```

### Actor IDs

| Purpose | Actor ID |
|---|---|
| Step 1 – Extract Seller ID from ASIN | `junglee/amazon-crawler` |
| Step 2 – Scrape Seller Info Page | `pintostudio/amazon-seller-info-scraper` |
| Fallback / Alternative | `scrapers-hub/amazon-seller-data-scraper` |

### Marketplace Base URLs

| Marketplace Key | Domain | Language Param |
|---|---|---|
| `ES` | `https://www.amazon.es` | `language=en` |
| `UK` | `https://www.amazon.co.uk` | `language=en` |

---

## 4. Step-by-Step Agent Logic

### Step 1 — Build Product Page URLs from ASINs

For each ASIN:
```
Amazon ES: https://www.amazon.es/dp/{ASIN}
Amazon UK: https://www.amazon.co.uk/dp/{ASIN}
```

### Step 2 — Call Apify Actor 1: Get Seller ID from Product Page

**Endpoint:**
```
POST https://api.apify.com/v2/acts/junglee~amazon-crawler/runs?token=YOUR_APIFY_API_TOKEN
```

**Request Body:**
```json
{
  "startUrls": [
    { "url": "https://www.amazon.es/dp/B0CLQ6P3BS" }
  ],
  "country": "ES",
  "maxItems": 1
}
```

**Poll for Completion:**
```
GET https://api.apify.com/v2/actor-runs/{runId}?token=YOUR_APIFY_API_TOKEN
```
Poll every 3 seconds until `status === "SUCCEEDED"`.

**Fetch Results:**
```
GET https://api.apify.com/v2/actor-runs/{runId}/dataset/items?token=YOUR_APIFY_API_TOKEN
```

**Extract from response:**
```javascript
const sellerId = result.seller?.id;
// Build seller page URL:
const sellerUrl = `https://www.amazon.es/sp?language=en&ie=UTF8&seller=${sellerId}&asin=${asin}`;
```

---

### Step 3 — Call Apify Actor 2: Scrape Seller Info Page

**Endpoint:**
```
POST https://api.apify.com/v2/acts/pintostudio~amazon-seller-info-scraper/runs?token=YOUR_APIFY_API_TOKEN
```

**Request Body:**
```json
{
  "sellerUrls": [
    {
      "url": "https://www.amazon.es/sp?language=en&ie=UTF8&seller=AXAQHT7DI1XVN&asin=B0CLQ6P3BS"
    }
  ]
}
```

> **Batch Processing:** Pass all seller URLs in a single `sellerUrls` array to process multiple ASINs in one run.

**Poll and Fetch Results** (same pattern as Step 2).

---

### Step 4 — Fallback: Use Apify Web Scraper Directly

If the dedicated seller info actor does not return the required fields, fall back to Apify's generic `apify/web-scraper` with a custom page function:

**Endpoint:**
```
POST https://api.apify.com/v2/acts/apify~web-scraper/runs?token=YOUR_APIFY_API_TOKEN
```

**Request Body:**
```json
{
  "startUrls": [
    { "url": "https://www.amazon.es/sp?language=en&ie=UTF8&seller=AXAQHT7DI1XVN&asin=B0CLQ6P3BS" }
  ],
  "pageFunction": "async function pageFunction(context) { const $ = context.jQuery; const getText = (label) => { const row = $('tr').filter((i, el) => $(el).find('td').first().text().trim().includes(label)); return row.find('td').last().text().trim(); }; return { businessName: getText('Business Name') || getText('Trading name'), email: getText('Email'), phone: getText('Phone'), customerServiceAddress: getText('Customer service address'), businessAddress: getText('Business address') || getText('Registered business address'), vatNumber: getText('VAT number'), companyRegistration: getText('Company registration') }; }",
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  }
}
```

---

### Step 5 — Transform and Export to CSV

```javascript
const { Parser } = require('json2csv');

const fields = [
  'asin',
  'marketplace',
  'seller_id',
  'business_name',
  'email',
  'phone_number',
  'customer_service_address',
  'business_address',
  'vat_number',
  'company_registration',
  'seller_rating',
  'scrape_timestamp'
];

function buildCsv(results) {
  const rows = results.map(r => ({
    asin: r.asin,
    marketplace: r.marketplace,
    seller_id: r.sellerId || '',
    business_name: r.businessName || r.sellerName || '',
    email: r.email || '',
    phone_number: r.phone || r.phoneNumber || '',
    customer_service_address: r.customerServiceAddress || '',
    business_address: r.businessAddress || r.address || '',
    vat_number: r.vatNumber || '',
    company_registration: r.companyRegistration || '',
    seller_rating: r.rating || r.sellerRating || '',
    scrape_timestamp: new Date().toISOString()
  }));

  const parser = new Parser({ fields });
  return parser.parse(rows);
}
```

---

## 5. Frontend UI Specification

> Use this specification to build the UI with Minimax M2.5.

### 5.1 Layout Overview

```
┌──────────────────────────────────────────────────────────┐
│  🛒  Amazon Seller Info Scraper                    [logo] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Marketplace        [● Amazon.es]  [○ Amazon.co.uk]      │
│                                                          │
│  ASINs (one per line)                                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │  B0CLQ6P3BS                                        │  │
│  │  B09XYZ1234                                        │  │
│  │  ...                                               │  │
│  └────────────────────────────────────────────────────┘  │
│  [+ Add ASIN]                           [Clear All]      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │         🔍  Scrape Seller Info                   │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ─────────────────── Progress ────────────────────────   │
│  [████████████░░░░░░░░] 3 of 5 ASINs processed           │
│  ✅ B0CLQ6P3BS — Found: "ACME Electronics SL"            │
│  ✅ B09XYZ1234 — Found: "TechStore Ltd"                  │
│  ⏳ B08ABC5678 — Fetching seller page...                 │
│                                                          │
│  ─────────────────── Results Preview ─────────────────   │
│  ┌──────┬──────────────┬───────────────┬──────────┐      │
│  │ ASIN │ Business Name│ Email         │ Phone    │ ...  │
│  ├──────┼──────────────┼───────────────┼──────────┤      │
│  │ B0CL │ ACME Elec.   │ info@acme.com │ +34 9... │      │
│  │ B09X │ TechStore Ltd│ hello@tech... │ +44 2... │      │
│  └──────┴──────────────┴───────────────┴──────────┘      │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │   ⬇  Download CSV (5 records)                  │     │
│  └─────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

---

### 5.2 Component Breakdown

#### Header
- App title: **Amazon Seller Info Scraper**
- Subtitle: *"Extract business details from Amazon.es & Amazon.co.uk sellers"*
- Color scheme: `#FF9900` (Amazon orange) + `#232F3E` (Amazon dark navy)

#### Marketplace Selector
- Radio button group or toggle tabs
- Options: `Amazon.es 🇪🇸` | `Amazon.co.uk 🇬🇧`
- Both can be selected simultaneously for dual-marketplace runs

#### ASIN Input Section
- **Textarea** (multi-line) for bulk paste (one ASIN per line)
  - Placeholder: *"Paste ASINs here, one per line\nExample: B0CLQ6P3BS"*
  - Auto-trim whitespace and validate ASIN format (10-char alphanumeric, starts with B0 or digits)
- **Chip list** below textarea — each ASIN shown as a removable chip tag
- **"+ Add ASIN"** button — inline single-input appender
- **"Clear All"** link — resets input

**ASIN Validation:**
```
Regex: /^[A-Z0-9]{10}$/
Show error chip in red if invalid format
```

#### Scrape Button
- Large primary CTA: **"🔍 Scrape Seller Info"**
- Disabled when: no ASINs entered, or a run is in progress
- On click: transitions to **"⏳ Running..."** state with spinner

#### Progress Panel (visible during run)
- Progress bar (percentage filled, animated)
- Live log list — one line per ASIN status:
  - `⏳ {ASIN} — Fetching product page...`
  - `🔍 {ASIN} — Found Seller ID: {id}, loading seller page...`
  - `✅ {ASIN} — Seller: "{businessName}" extracted`
  - `❌ {ASIN} — Failed: {errorMessage}`
- Estimated time remaining

#### Results Table
- Scrollable horizontal table
- Columns: ASIN · Marketplace · Business Name · Email · Phone · Customer Service Address · Business Address · VAT Number · Seller Rating
- Empty cells shown as `-`
- Rows with errors highlighted in light red
- **Column filter / search** input above table

#### Download Button
- **"⬇ Download CSV ({n} records)"**
- Triggers browser download of `amazon_seller_info_{timestamp}.csv`
- Disabled if no results
- Secondary option: **"Copy as JSON"**

#### Settings Panel (collapsible)
```
⚙ Advanced Settings
  ├─ Request delay between ASINs: [500] ms
  ├─ Proxy: [✓] Use Apify Residential Proxy
  ├─ Retry failed ASINs: [✓] (up to 2 retries)
  └─ Language override: [en]
```

---

### 5.3 Color & Style Tokens

```css
--primary:        #FF9900;   /* Amazon orange */
--primary-dark:   #E47911;
--surface-dark:   #232F3E;   /* Amazon navy */
--surface:        #FFFFFF;
--surface-alt:    #F3F3F3;
--text-primary:   #0F1111;
--text-muted:     #565959;
--success:        #067D62;
--error:          #CC0C39;
--border:         #D5D9D9;
--radius:         8px;
--font:           'Inter', 'Amazon Ember', sans-serif;
```

---

### 5.4 Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Desktop (≥1024px) | Two-column — input left, results right |
| Tablet (768–1023px) | Single column, full-width table with horizontal scroll |
| Mobile (<768px) | Single column, table replaced by card list per record |

---

## 6. Backend API Endpoints

### POST `/api/scrape`
Kicks off a scrape run.

**Request:**
```json
{
  "asins": ["B0CLQ6P3BS", "B09XYZ1234"],
  "marketplaces": ["ES", "UK"],
  "options": {
    "delay": 500,
    "retries": 2,
    "language": "en"
  }
}
```

**Response (202 Accepted):**
```json
{
  "runId": "abc123",
  "status": "RUNNING",
  "totalAsins": 2,
  "estimatedSeconds": 60
}
```

### GET `/api/scrape/:runId/status`
Polls run status.

**Response:**
```json
{
  "runId": "abc123",
  "status": "RUNNING",
  "processed": 1,
  "total": 2,
  "logs": [
    { "asin": "B0CLQ6P3BS", "status": "SUCCESS", "businessName": "ACME Electronics SL" },
    { "asin": "B09XYZ1234", "status": "PENDING" }
  ]
}
```

### GET `/api/scrape/:runId/download`
Returns CSV file for download.

**Response Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="amazon_seller_info_2026-04-28.csv"
```

---

## 7. Environment Variables

```env
APIFY_API_TOKEN=YOUR_APIFY_API_TOKEN
APIFY_BASE_URL=https://api.apify.com/v2
ACTOR_PRODUCT_SCRAPER=junglee~amazon-crawler
ACTOR_SELLER_INFO=pintostudio~amazon-seller-info-scraper
ACTOR_FALLBACK=apify~web-scraper
PORT=3000
```

---

## 8. Full Agent Pseudocode

```javascript
async function runSellerScrapeAgent({ asins, marketplaces, options }) {
  const results = [];

  for (const asin of asins) {
    for (const marketplace of marketplaces) {
      const domain = marketplace === 'ES' ? 'amazon.es' : 'amazon.co.uk';
      const productUrl = `https://www.${domain}/dp/${asin}`;

      // --- Step 1: Get Seller ID from Product Page ---
      const productRun = await apifyRunActor(ACTOR_PRODUCT_SCRAPER, {
        startUrls: [{ url: productUrl }],
        country: marketplace,
        maxItems: 1
      });
      const productData = await apifyWaitAndFetch(productRun.id);
      const sellerId = productData[0]?.seller?.id;

      if (!sellerId) {
        results.push({ asin, marketplace, error: 'Seller ID not found' });
        continue;
      }

      // --- Step 2: Scrape Seller Info Page ---
      const sellerUrl = `https://www.${domain}/sp?language=en&ie=UTF8&seller=${sellerId}&asin=${asin}`;
      const sellerRun = await apifyRunActor(ACTOR_SELLER_INFO, {
        sellerUrls: [{ url: sellerUrl }]
      });
      const sellerData = await apifyWaitAndFetch(sellerRun.id);
      const info = sellerData[0] || {};

      results.push({
        asin,
        marketplace,
        seller_id: sellerId,
        business_name: info.businessName || info.sellerName || '',
        email: info.email || '',
        phone_number: info.phone || '',
        customer_service_address: info.customerServiceAddress || '',
        business_address: info.businessAddress || '',
        vat_number: info.vatNumber || '',
        company_registration: info.companyRegistration || '',
        seller_rating: info.rating || '',
        scrape_timestamp: new Date().toISOString()
      });

      await delay(options.delay || 500);
    }
  }

  return buildCsv(results);
}

// --- Helpers ---
async function apifyRunActor(actorId, input) {
  const res = await fetch(
    `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${APIFY_API_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
  );
  return (await res.json()).data;
}

async function apifyWaitAndFetch(runId, pollIntervalMs = 3000) {
  while (true) {
    const status = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
    ).then(r => r.json());
    if (status.data.status === 'SUCCEEDED') break;
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status.data.status)) {
      throw new Error(`Run ${runId} ended with status: ${status.data.status}`);
    }
    await delay(pollIntervalMs);
  }
  const items = await fetch(
    `${APIFY_BASE_URL}/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
  ).then(r => r.json());
  return items;
}

const delay = ms => new Promise(r => setTimeout(r, ms));
```

---

## 9. CSV Output Sample

```csv
asin,marketplace,seller_id,business_name,email,phone_number,customer_service_address,business_address,vat_number,company_registration,seller_rating,scrape_timestamp
B0CLQ6P3BS,ES,AXAQHT7DI1XVN,ACME Electronics SL,info@acme.es,+34 912 345 678,"Calle Gran Vía 28, 28013 Madrid, Spain","Calle Gran Vía 28, 28013 Madrid, Spain",ESB12345678,M-123456,96%,2026-04-28T10:30:00.000Z
B0CLQ6P3BS,UK,AXAQHT7DI1XVN,ACME Electronics Ltd,support@acme.co.uk,+44 20 7946 0958,"1 Oxford Street, London W1D 1AN, UK","1 Oxford Street, London W1D 1AN, UK",GB123456789,12345678,95%,2026-04-28T10:31:05.000Z
```

---

## 10. Prompt for Minimax M2.5

Use the following system prompt to guide Minimax M2.5 to generate the application code:

```
You are an expert full-stack developer. Build a complete web application based on the following spec:

PROJECT: Amazon Seller Info Scraper
STACK: React (frontend), Node.js/Express (backend), json2csv (CSV generation)

TASK:
1. Build the React frontend exactly as described in Section 5 of the spec, including all components, color tokens, layout, and responsive behavior.
2. Build the Node.js/Express backend with the three API endpoints in Section 6.
3. Implement the agent logic from Section 8 using the Apify API details in Sections 3 and 4.
4. The app must support both Amazon.es and Amazon.co.uk simultaneously.
5. Output CSV must include all columns listed in Section 1.
6. Use environment variables for all API keys (never hardcode).
7. Include error handling, retry logic, and progress polling.
8. The frontend should show real-time progress using polling (GET /api/scrape/:runId/status every 2 seconds).

CONSTRAINTS:
- Use functional React components with hooks
- Use fetch() (no axios)
- Keep all CSS inline or in a single CSS module
- No TypeScript — plain JavaScript only
- The CSV download must trigger a file download in the browser

Begin with the backend server.js, then App.jsx, then package.json.
```

---

## 11. Dependencies

### Backend (`package.json`)
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "json2csv": "^6.0.0-alpha.2",
    "uuid": "^9.0.0"
  }
}
```

### Frontend
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

---

## 12. Notes & Caveats

- **Rate Limits:** Amazon actively rate-limits scrapers. The Apify actors use rotating residential proxies to mitigate this, but some runs may fail. The retry logic in the agent handles transient failures.
- **Seller Page Fields:** Not all sellers fill in every field (email, phone). Missing fields will appear as empty strings in the CSV.
- **Legal Note:** This tool scrapes publicly available data from Amazon seller profile pages. Ensure your use case complies with Amazon's Terms of Service and applicable data protection laws (GDPR for EU, UK GDPR for the UK).
- **ASIN Input Limit:** Recommended batch size is 20–50 ASINs per run to avoid long wait times and rate limiting.
- **Proxy Configuration:** The `pintostudio/amazon-seller-info-scraper` actor automatically uses Apify's proxy pool. No additional proxy configuration is required.

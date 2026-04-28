import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { Parser } from 'json2csv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE_URL = process.env.APIFY_BASE_URL || 'https://api.apify.com/v2';
const ACTOR_PRODUCT_SCRAPER = process.env.ACTOR_PRODUCT_SCRAPER || 'junglee~amazon-crawler';
const ACTOR_SELLER_INFO = process.env.ACTOR_SELLER_INFO || 'pintostudio~amazon-seller-info-scraper';
const ACTOR_FALLBACK = process.env.ACTOR_FALLBACK || 'apify~web-scraper';

console.log('[Server] APIFY_API_TOKEN present:', !!APIFY_API_TOKEN);
console.log('[Server] ACTOR_PRODUCT_SCRAPER:', ACTOR_PRODUCT_SCRAPER);
console.log('[Server] ACTOR_SELLER_INFO:', ACTOR_SELLER_INFO);

const runs = new Map();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Apify Helpers ───────────────────────────────────────────────────────────

async function apifyRunActor(actorId, input) {
  if (!APIFY_API_TOKEN) {
    throw new Error('APIFY_API_TOKEN is missing in .env file');
  }

  const url = `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${APIFY_API_TOKEN}`;
  console.log(`[Apify] Starting actor: ${actorId}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Apify returned non-JSON for actor ${actorId}: ${rawText.slice(0, 200)}`);
  }

  if (!res.ok) {
    const errMsg = data?.error?.message || data?.message || res.statusText;
    throw new Error(`Apify API error starting ${actorId} (${res.status}): ${errMsg}`);
  }

  if (!data?.data?.id) {
    throw new Error(`Apify response missing run ID for ${actorId}. Response: ${JSON.stringify(data).slice(0, 300)}`);
  }

  console.log(`[Apify] Started actor ${actorId} with run ID: ${data.data.id}`);
  return data.data;
}

async function apifyWaitAndFetch(runId, pollIntervalMs = 4000, maxWaitMs = 300000) {
  const startTime = Date.now();
  console.log(`[Apify] Polling run: ${runId}`);

  while (true) {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(`Apify run ${runId} timed out after ${maxWaitMs / 1000}s`);
    }

    const res = await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}?token=${APIFY_API_TOKEN}`);
    const rawText = await res.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Apify status returned non-JSON: ${rawText.slice(0, 200)}`);
    }

    if (!res.ok) {
      throw new Error(`Apify status check failed (${res.status}): ${data?.error?.message || res.statusText}`);
    }

    const runStatus = data?.data?.status;
    console.log(`[Apify] Run ${runId} status: ${runStatus}`);

    if (runStatus === 'SUCCEEDED') break;
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(runStatus)) {
      throw new Error(`Apify run ${runId} ended with status: ${runStatus}`);
    }

    await delay(pollIntervalMs);
  }

  const itemsRes = await fetch(
    `${APIFY_BASE_URL}/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
  );
  const itemsRaw = await itemsRes.text();
  let items;
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    throw new Error(`Apify dataset returned non-JSON: ${itemsRaw.slice(0, 200)}`);
  }

  console.log(`[Apify] Run ${runId} returned ${Array.isArray(items) ? items.length : 'unknown'} items`);
  if (Array.isArray(items) && items.length > 0) {
    console.log(`[Apify] First item keys: ${Object.keys(items[0]).join(', ')}`);
  }

  return items;
}

// ─── Fallback Scraper using apify~web-scraper ─────────────────────────────────

async function scrapeSellerPage(sellerUrl) {
  const pageFunction = `
    async function pageFunction(context) {
      const $ = context.jQuery;

      // 1. <tr> table row: first cell is label, last cell is value
      const getFromTable = (...labels) => {
        for (const label of labels) {
          const row = $('tr').filter((i, el) =>
            $(el).find('td, th').first().text().trim().toLowerCase().includes(label.toLowerCase())
          );
          if (row.length) {
            const val = row.find('td').last().text().trim();
            if (val) return val;
          }
        }
        return '';
      };

      // 2. <dt>/<dd> definition list
      const getFromDt = (...labels) => {
        for (const label of labels) {
          const dt = $('dt').filter((i, el) => $(el).text().trim().toLowerCase().includes(label.toLowerCase()));
          if (dt.length) {
            const val = dt.next('dd').text().trim();
            if (val) return val;
          }
        }
        return '';
      };

      // 3. Amazon a-row/a-column divs: bold label span followed by value span
      const getFromARow = (...labels) => {
        for (const label of labels) {
          let found = '';
          $('.a-row, .a-section > div').each((i, row) => {
            const text = $(row).text();
            for (const lbl of labels) {
              if (text.toLowerCase().includes(lbl.toLowerCase())) {
                // Find the span/div after the label
                const children = $(row).find('span, div, td').toArray();
                for (let j = 0; j < children.length; j++) {
                  const childText = $(children[j]).text().trim();
                  if (childText.toLowerCase().includes(lbl.toLowerCase()) && children[j+1]) {
                    const val = $(children[j+1]).text().trim();
                    if (val && !val.toLowerCase().includes(lbl.toLowerCase())) {
                      found = val;
                      return false; // break .each
                    }
                  }
                }
              }
            }
          });
          if (found) return found;
        }
        return '';
      };

      // 4. Scan page text: find label then grab text after it
      const getFromText = (...labels) => {
        const bodyText = $('body').text();
        for (const label of labels) {
          const idx = bodyText.toLowerCase().indexOf(label.toLowerCase());
          if (idx >= 0) {
            const after = bodyText.slice(idx + label.length).replace(/^[:\s]+/, '').trim();
            const val = after.split('\n')[0].split(/\s{4,}/)[0].trim();
            if (val && val.length > 0 && val.length < 200) return val;
          }
        }
        return '';
      };

      const get = (...labels) =>
        getFromTable(...labels) || getFromDt(...labels) || getFromARow(...labels) || getFromText(...labels);

      const sellerName = $('#sellerName, #seller-name, [data-seller-name], h1.a-size-large, h1').first().text().trim();
      const rating = $('[data-feedback-rating-value]').first().attr('data-feedback-rating-value')
        || get('Rating', 'Valoración');

      // Dump page structure for debugging
      const debugRows = [];
      $('tr').each((i, el) => {
        const cells = $(el).find('td, th').map((j, c) => $(c).text().trim()).get().filter(Boolean);
        if (cells.length >= 2) debugRows.push(cells);
      });
      const debugDt = $('dt').map((i, el) => ({ dt: $(el).text().trim(), dd: $(el).next('dd').text().trim() })).get();
      const pageText = $('body').text().replace(/\\s+/g, ' ').slice(0, 8000);

      return {
        businessName: get('Business Name', 'Trading name', 'Legal name', 'Nombre comercial', 'Razón social') || sellerName,
        email: get('Email', 'E-mail', 'Correo electrónico', 'Electronic address'),
        phone: get('Phone', 'Telephone', 'Teléfono', 'Phone number', 'Número de teléfono'),
        customerServiceAddress: get('Customer service address', 'Dirección de atención al cliente', 'Customer service'),
        businessAddress: get('Business address', 'Registered business address', 'Dirección de la empresa', 'Dirección'),
        vatNumber: get('VAT number', 'VAT', 'Número de IVA', 'Número de identificación fiscal', 'Tax ID', 'CIF', 'NIF'),
        companyRegistration: get('Company registration', 'Registration number', 'Número de registro', 'Companies House', 'Registro mercantil'),
        sellerRating: rating,
        sellerName,
        _debug: { rows: debugRows.slice(0, 30), dtdd: debugDt.slice(0, 20), textSnippet: pageText },
      };
    }
  `;

  const run = await apifyRunActor(ACTOR_FALLBACK, {
    startUrls: [{ url: sellerUrl }],
    pageFunction,
    proxyConfiguration: { useApifyProxy: true },
  });

  const data = await apifyWaitAndFetch(run.id);
  const result = data[0] || {};
  if (result._debug) {
    console.log('[Scraper] Table rows found:', JSON.stringify(result._debug.rows));
    console.log('[Scraper] DT/DD pairs found:', JSON.stringify(result._debug.dtdd));
    console.log('[Scraper] Page text snippet:', result._debug.textSnippet?.slice(0, 2000));
    delete result._debug;
  }
  return result;
}

// ─── Extract All Seller Data from Product Scraper Result ─────────────────────
// junglee~amazon-crawler returns item.seller with: id, name, businessName,
// VAT, address[], phone, email, rating30Days, rating90Days, ratingLifetime

function extractSellerData(productData) {
  if (!Array.isArray(productData) || productData.length === 0) return null;

  const item = productData[0];
  const s = item?.seller;
  if (!s?.id) return null;

  const address = Array.isArray(s.address) ? s.address.filter(Boolean).join(', ') : (s.address || '');
  const rating = s.ratingLifetime?.starsOutOf5 || s.rating90Days?.starsOutOf5 || s.rating30Days?.starsOutOf5 || '';

  return {
    seller_id: s.id,
    business_name: s.businessName || s.name || '',
    email: s.email || '',
    phone_number: s.phone || '',
    customer_service_address: '',
    business_address: address,
    vat_number: s.VAT || s.vat || '',
    company_registration: s.companyRegistration || s.registrationNumber || '',
    seller_rating: rating ? String(rating) : '',
  };
}

// ─── Main Scrape Agent ────────────────────────────────────────────────────────

const MARKETPLACES = {
  ES: { domain: 'amazon.es', country: 'ES', countryIso: 'es' },
  UK: { domain: 'amazon.co.uk', country: 'GB', countryIso: 'gb' },
};

async function runSellerScrapeAgent(runId, asins, marketplaces, options = {}) {
  const results = [];
  const logs = [];
  let processed = 0;
  const total = asins.length * marketplaces.length;

  const updateStatus = (newStatus, logEntry) => {
    if (logEntry) logs.push(logEntry);
    runs.set(runId, {
      ...runs.get(runId),
      status: newStatus,
      processed,
      total,
      logs: [...logs],
      results: [...results],
    });
  };

  try {
    for (const asin of asins) {
      for (const marketplace of marketplaces) {
        const config = MARKETPLACES[marketplace];
        if (!config) {
          logs.push({ asin, marketplace, status: 'FAILED', message: `Unknown marketplace: ${marketplace}` });
          processed++;
          continue;
        }

        const productUrl = `https://www.${config.domain}/dp/${asin}`;
        console.log(`\n[Agent] Processing ASIN: ${asin} on ${marketplace} → ${productUrl}`);

        updateStatus('RUNNING', { asin, marketplace, status: 'PENDING', message: 'Fetching product page...' });

        try {
          // ── Scrape product page — junglee~amazon-crawler returns item.seller ─
          let sellerData = null;

          try {
            const productRun = await apifyRunActor(ACTOR_PRODUCT_SCRAPER, {
              categoryOrProductUrls: [{ url: productUrl }],
              proxyCountry: config.country,
              maxItems: 1,
              scrapeSellers: true,
            });

            updateStatus('RUNNING', { asin, marketplace, status: 'PROCESSING', message: `Scraping product page...` });
            const productData = await apifyWaitAndFetch(productRun.id);
            sellerData = extractSellerData(productData);
          } catch (scrapeErr) {
            console.error(`[Agent] Scrape failed for ${asin}/${marketplace}: ${scrapeErr.message}`);
            updateStatus('RUNNING', { asin, marketplace, status: 'PROCESSING', message: `Scrape failed: ${scrapeErr.message}` });
          }

          if (!sellerData) {
            const result = {
              asin, marketplace,
              seller_id: '', business_name: '', email: '', phone_number: '',
              customer_service_address: '', business_address: '', vat_number: '',
              company_registration: '', seller_rating: '',
              scrape_timestamp: new Date().toISOString(),
              error: 'No seller data found on product page',
            };
            results.push(result);
            logs.push({ asin, marketplace, status: 'FAILED', message: 'No seller data found' });
            processed++;
            updateStatus('RUNNING', { asin, marketplace, status: 'FAILED', message: 'No seller data found' });
            continue;
          }

          console.log(`[Agent] Seller data for ${asin}/${marketplace}:`, sellerData);

          const result = {
            asin,
            marketplace,
            ...sellerData,
            scrape_timestamp: new Date().toISOString(),
          };

          console.log(`[Agent] Result for ${asin}/${marketplace}:`, result);
          results.push(result);
          logs.push({
            asin,
            marketplace,
            status: 'SUCCESS',
            message: `Seller: "${result.business_name || 'Unknown'}" extracted`,
          });
          processed++;
          updateStatus('RUNNING', {
            asin,
            marketplace,
            status: 'SUCCESS',
            message: `Seller: "${result.business_name || 'Unknown'}" extracted`,
          });

          await delay(options.delay || 500);
        } catch (err) {
          console.error(`[Agent] Fatal error for ${asin}/${marketplace}: ${err.message}`);
          results.push({ asin, marketplace, error: err.message, scrape_timestamp: new Date().toISOString() });
          logs.push({ asin, marketplace, status: 'FAILED', message: err.message });
          processed++;
          updateStatus('RUNNING', { asin, marketplace, status: 'FAILED', message: err.message });
        }
      }
    }

    runs.set(runId, {
      ...runs.get(runId),
      status: 'COMPLETED',
      processed,
      total,
      logs,
      results,
    });

    console.log(`[Agent] Run ${runId} COMPLETED. ${results.length} results.`);
  } catch (err) {
    console.error(`[Agent] Run ${runId} CRASHED: ${err.message}`);
    runs.set(runId, {
      ...runs.get(runId),
      status: 'ERROR',
      error: err.message,
    });
  }
}

// ─── CSV Builder ──────────────────────────────────────────────────────────────

function buildCsv(results) {
  const fields = [
    'asin', 'marketplace', 'seller_id', 'business_name', 'email',
    'phone_number', 'customer_service_address', 'business_address',
    'vat_number', 'company_registration', 'seller_rating', 'scrape_timestamp',
  ];
  try {
    const parser = new Parser({ fields });
    return parser.parse(results.filter(r => !r.error));
  } catch (e) {
    return 'Error generating CSV: ' + e.message;
  }
}

// ─── API Routes ───────────────────────────────────────────────────────────────

app.post('/api/scrape', async (req, res) => {
  const { asins, marketplaces, options } = req.body;

  if (!asins?.length) return res.status(400).json({ error: 'ASINs array is required' });
  if (!marketplaces?.length) return res.status(400).json({ error: 'Marketplaces array is required' });

  const runId = uuidv4();
  const total = asins.length * marketplaces.length;

  runs.set(runId, { runId, status: 'RUNNING', processed: 0, total, logs: [], results: [] });
  runSellerScrapeAgent(runId, asins, marketplaces, options);

  res.status(202).json({ runId, status: 'RUNNING', totalAsins: total, estimatedSeconds: total * 20 });
});

app.get('/api/scrape/:runId/status', (req, res) => {
  const run = runs.get(req.params.runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json({ runId: run.runId, status: run.status, processed: run.processed, total: run.total, logs: run.logs || [], error: run.error });
});

app.get('/api/scrape/:runId/results', (req, res) => {
  const run = runs.get(req.params.runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run.results || []);
});

app.get('/api/scrape/:runId/download', (req, res) => {
  const run = runs.get(req.params.runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  const csv = buildCsv(run.results || []);
  const timestamp = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="amazon_seller_info_${timestamp}.csv"`);
  res.send(csv);
});

// ─── Debug endpoint: dump raw seller page content ────────────────────────────

app.get('/api/debug/seller-page', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query param required' });

  const pageFunction = `
    async function pageFunction(context) {
      const $ = context.jQuery;
      const rows = [];
      $('tr').each((i, el) => {
        const cells = $(el).find('td, th').map((j, c) => $(c).text().trim()).get();
        if (cells.some(c => c.length > 0)) rows.push(cells);
      });
      const dtdd = [];
      $('dt').each((i, el) => {
        dtdd.push({ dt: $(el).text().trim(), dd: $(el).next('dd').text().trim() });
      });
      const allText = $('body').text().replace(/\\s+/g, ' ').slice(0, 5000);
      const bodyHtml = $('[class*="business"], [class*="seller-info"], [id*="seller"], [class*="about"]').map((i,el) => ({cls: el.className, html: $(el).html()?.slice(0,500)})).get();
      return { rows, dtdd, allText, bodyHtml, title: $('title').text() };
    }
  `;

  try {
    const run = await apifyRunActor(ACTOR_FALLBACK, {
      startUrls: [{ url }],
      pageFunction,
      proxyConfiguration: { useApifyProxy: true },
    });
    const data = await apifyWaitAndFetch(run.id);
    res.json(data[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Debug endpoint: test Apify token ────────────────────────────────────────

app.get('/api/debug/apify', async (req, res) => {
  try {
    const response = await fetch(`${APIFY_BASE_URL}/users/me?token=${APIFY_API_TOKEN}`);
    const data = await response.json();
    res.json({ ok: response.ok, status: response.status, user: data?.data?.username, plan: data?.data?.plan?.monthlyUsageCreditsUsd });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
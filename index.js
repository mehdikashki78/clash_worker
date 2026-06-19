// ============================================================
//  Cloudflare Worker – جایگزین کامل data.php
// ============================================================

const SECRET_TOKEN = 'clash2025secure';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Preflight (CORS)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    let token = url.searchParams.get('token');

    // دریافت توکن از بدنه در POST
    if (!token && request.method === 'POST') {
      try {
        const body = await request.json();
        token = body.token;
      } catch (e) {}
    }

    // بررسی توکن
    if (token !== SECRET_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: 'توکن نامعتبر' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // ========== GET: دریافت داده‌ها ==========
    if (request.method === 'GET') {
      try {
        const data = await env.GAME_DATA.get('clash_data', 'json');
        if (data) {
          return new Response(JSON.stringify({
            ok: true,
            players: data.players || [],
            clans: data.clans || [],
            shop: data.shop || [],
            wars: data.wars || [],
            pendingClans: data.pendingClans || [],
            announcement: data.announcement || null
          }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
          });
        } else {
          // داده‌ای وجود ندارد → مقدار پیش‌فرض
          const initData = {
            players: [],
            clans: [],
            shop: [],
            wars: [],
            pendingClans: [],
            announcement: null
          };
          await env.GAME_DATA.put('clash_data', JSON.stringify(initData));
          return new Response(JSON.stringify({ ok: true, ...initData }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
          });
        }
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }

    // ========== POST: ذخیره داده‌ها ==========
    if (request.method === 'POST') {
      try {
        const input = await request.json();
        
        // اعتبارسنجی
        if (!input.players || !input.clans || !input.shop || !input.wars) {
          return new Response(JSON.stringify({ ok: false, error: 'ساختار داده ناقص است' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
          });
        }

        // بررسی نام‌های تکراری
        const names = [];
        for (const p of input.players) {
          const name = (p.name || '').trim();
          if (name === '') continue;
          if (names.includes(name)) {
            return new Response(JSON.stringify({ ok: false, error: `نام تکراری: ${name}` }), {
              status: 400,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
          }
          names.push(name);
        }

        // ذخیره در KV
        const dataToSave = {
          players: input.players,
          clans: input.clans,
          shop: input.shop,
          wars: input.wars,
          pendingClans: input.pendingClans || [],
          announcement: input.announcement || null,
          lastUpdate: Date.now()
        };

        await env.GAME_DATA.put('clash_data', JSON.stringify(dataToSave));

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }

    // متد غیرمجاز
    return new Response(JSON.stringify({ ok: false, error: 'متد غیرمجاز' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
};
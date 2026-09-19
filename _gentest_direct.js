const fs = require('fs');

(async () => {
  // 1) الخدمة موصولة？
  let r;
  try {
    r = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('VERSION_CHECK -> HTTP', r.status, 'OK=' + r.ok + ' final=' + r.url);
    if (r.ok) {
      const j = await r.json();
      console.log('MODELS_AVAILABLE:', JSON.stringify((j.models || []).map((m: { name?: string }) => m.name).slice(0, 30), null, 1));
    } else {
      console.log('VERSION_RESPONSE:', await r.text());
    }
  } catch (e) {
    console.log('VERSION_CRASH:', e.message);
  }

  // 2) جرب استدعاء جيميناي باستخدام المفتاح بنموذج صحيح ومعروف
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || String(process.env.VITE_GEMINI_API_KEY || '').trim() || '<no-key>';
  console.log('KEY        ->', apiKey ? apiKey.slice(0, 8) + '…' : 'ABSENT');
  console.log('KEY_LEN    ->', apiKey.length);

  const modelsToTry = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
  for (const m of modelsToTry) {
    try {
      const payload = {
        contents: [
          {
            parts: [
              {
                text: 'Write a very short HTML page with green background and a white heading saying Hello. Return only the HTML.'
              }
            ]
          }
        ]
      };
      const u = 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + apiKey;
      const started = Date.now();
      const rr = await fetch(u, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const elapsed = Date.now() - started;
      let bodyText = '';
      try { bodyText = await rr.text(); } catch (_) {}
      console.log(`MODEL ${m} -> HTTP ${rr.status} OK=${rr.ok} TIME=${elapsed}ms`);
      if (!rr.ok) console.log(`   ERROR (${rr.status}): ${bodyText.slice(0, 400)}`);
      else {
        // extract text
        const j = JSON.parse(bodyText);
        const t = j.candidates?.[0]?.content?.parts?.[0]?.text;
        if (t) console.log(`   HAVE_TEXT length=${t.length} preview=${t.slice(0, 200).replace(/\n/g, ' ')}`);
        else console.log(`   NO_TEXT body=${bodyText.slice(0, 300)}`);
      }
    } catch (e) {
      console.log(`MODEL ${m} -> CRASH ${e.message}`);
    }
  }

  console.log('DONE');
})().catch(e => console.log('CRASH: ' + e.message));
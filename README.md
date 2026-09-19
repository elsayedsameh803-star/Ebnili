# إبنلي (ebnili) — منشئ المواقع بالذكاء الاصطناعي

منصة SaaS لبناء المواقع والتطبيقات بالذكاء الاصطناعي، مع معاينة جانبية، لوحة تحكم للمالك،
نظام اشتراكات، تحصيل عبر Orange Cash، وحماية من إساءة الاستخدام (بصمة الجهاز).

- الواجهة: **React 18 + TypeScript + Vite + Tailwind CSS + lucide-react**
- الخلفية: **Supabase** (Postgres + RLS)

## 1) التثبيت

```bash
npm install
```

## 2) متغيرات البيئة

انسخ `.env.example` إلى `.env` واملأ القيم:

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_ORANGE_CASH_NUMBER=01207782741
VITE_APP_URL=http://localhost:5173
VITE_ADMIN_EMAIL=admin@example.com
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

> `VITE_ADMIN_EMAIL` محجوز للتوثيق فقط وغير مستخدم حاليًا في الكود (صلاحية المالك تُحدَّد
> عبر `users.role = 'owner'`)، و`VITE_APP_URL` غير مُستخدَم في الكود أيضًا. المتغيران
> المؤثران فعليًا هما `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` وكذلك
> `VITE_ORANGE_CASH_NUMBER` (يُقرأ في `src/lib/auth.ts`).

## 3) قاعدة البيانات

شغّل ملف الهجرة في **Supabase Dashboard > SQL Editor**:

```
supabase/migrations/20260914213825_create_ebnili_tables.sql
```

ينشئ الجداول: `users`, `projects`, `project_versions`, `subscriptions`, `transactions`,
`promo_codes`, `device_fingerprints`, `activity_log` مع سياسات RLS.

## 4) التشغيل

```bash
npm run dev        # سيرفر التطوير
npm run typecheck  # فحص الأنواع (tsc --noEmit)
npm run build      # بناء الإنتاج إلى dist/
npm run preview    # معاينة بناء الإنتاج
npm run lint       # ESLint
```

## 5) قبل النشر

- [x] `public/og-image.png` بمقاس **1200×630** — موجودة (صورة العلامة، وليست placeholder).
- [x] `public/sitemap.xml` و `public/robots.txt` يشيران إلى النطاق الفعلي `https://ebnili.vercel.app`.
- [x] كل روابط `index.html` (og:url / og:image / twitter:image / canonical) على النطاق الفعلي.
- [ ] املأ مفاتيح Supabase الحقيقية (انظر القسم 2) ثم أعد النشر.
- [ ] إن أضفت نطاقًا مخصّصًا، حدّث الروابط الأربعة أعلاه + `VITE_APP_URL`.

## 6) النشر على Vercel

> **✅ منشور حاليًا:** https://ebnili.vercel.app
> المشروع: `sameh-elkwaga-s-projects/ebnili` — Framework: `Vite` (تلقائي)، Build: `npm run build`، Output: `dist`.

المشروع مُهيّأ للنشر مباشرة عبر `vercel.json` (يكتشف Vite، يبني إلى `dist`، ويحوّل كل
المسارات إلى `index.html` حتى يعمل التوجيه في الواجهة، مع ترويسات أمان وكاش طويل للأصول).

### أ) الطريقة السريعة (Dashboard)

1. ارفع الكود إلى GitHub.
2. من Vercel: **Add New → Project → Import Git Repository** واختر المستودع.
3. Vercel سيضبط تلقائيًا: Framework `Vite`، Build `npm run build`، Output `dist`.
4. أضف متغيرات البيئة (Environment Variables) قبل أول نشر (انظر أدناه).
5. **Deploy**.

### ب) طريقة CLI

```bash
npm i -g vercel          # تثبيت CLI
vercel login             # تسجيل الدخول (يفتح المتصفح)
vercel link --project ebnili --yes    # ربط المجلد بمشروع Vercel
vercel --prod --yes      # نشر الإنتاج
```

أو باستخدام توكن بدون تسجيل دخول تفاعلي:

```bash
vercel link --project ebnili --yes --token <VERCEL_TOKEN>
vercel --prod --yes --token <VERCEL_TOKEN>
```

> **ملاحظتان مهمّتان أثناء الربط:**
> 1. `vercel link` ينشئ ملف `.env.local` (توكن OIDC) ويضيفه إلى `.gitignore` — لا ترفعه.
> 2. إذا فعل Vercel **Deployment Protection → Vercel Authentication** فسيرجع الموقع 302
>    إلى صفحة تسجيل الدخول للزوّار. عطّلها من
>    **Settings → Deployment Protection** أو عبر API:
>    `vercel api /v9/projects/<project> -X PATCH --input` مع `{"ssoProtection": null}`.

### ج) متغيرات البيئة على Vercel

```bash
# متغيّرة عامة (تُدمج في حزمة الواجهة) — لاحظ --no-sensitive و --yes
vercel env add VITE_ORANGE_CASH_NUMBER production,preview,development \
  --value "01207782741" --yes --no-sensitive
vercel env add VITE_APP_URL production,preview,development \
  --value "https://ebnili.vercel.app" --yes --no-sensitive
vercel env add VITE_ADMIN_EMAIL production,preview,development \
  --value "<owner-email>" --yes --no-sensitive

# متغيّرات Supabase (نفس الصيغة)
vercel env add VITE_SUPABASE_URL production,preview,development \
  --value "https://<project-id>.supabase.co" --yes --no-sensitive
vercel env add VITE_SUPABASE_ANON_KEY production,preview,development \
  --value "<anon-key>" --yes --no-sensitive
```

> - `vercel env add` يجعل القيمة **sensitive افتراضيًا**، وVercel لا يدعم القيم الحسّاسة في
>   بيئة Development — لذلك يجب `--no-sensitive` عند إضافة المتغير للثلاث بيئات معًا.
>   (قيم `VITE_*` تظهر في حزمة الواجهة على أي حال، فلا فرق أمني.)
> - أضف المتغيرات قبل النشر، وبعد أي تعديل عليها أعد النشر لأن قيم `VITE_*` تُدمج وقت البناء.
> - بدون مفاتيح Supabase حقيقية يعمل الموقع لكن في الوضع المحلي (تخزين `localStorage`) ولن
>   تُجلب بيانات المستخدمين/الاشتراكات إلى لوحة المالك.

### د) بعد النشر

- ✅ `public/og-image.png` (1200×630، مولّدة) موجودة وتُخدم بنجاح — صورة المشاركة تعمل.
- ✅ `index.html` (og:url / og:image / twitter:image / canonical)، `public/robots.txt`،
  `public/sitemap.xml` كلها تشير الآن إلى `https://ebnili.vercel.app`.
- لاستخدام نطاق مخصّص: **Settings → Domains**، ثم حدّث `VITE_APP_URL` (أو أعِد النشر بعد
  تحديث الروابط الثابتة في `index.html` و`robots.txt` و`sitemap.xml`).
- نطاق `ebnili.com` مسجّل لكنه مربوط بمشروع آخر (تطبيق Next.js)، وليس بهذا المشروع.

## ملاحظات معمارية

- `src/lib/generator.ts` يولّد كود الموقع الناتج (HTML/CSS/JS) بدون قوالب جاهزة.
- `src/lib/auth.ts` يتولى بصمة الجهاز + الربط بالحساب (الحد المجاني يُمنع إذا كانت البصمة مرتبطة بحساب آخر).
- `src/lib/admin.ts` دوال المالك: إحصائيات، سجل النشاط، تحديث حالة المعاملات والاشتراكات.
- `SidePreview` معاينة عائمة جانبية، و`AdminDashboard` لوحة المالك (تُفتح لبريد المالك فقط).

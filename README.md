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

- ضع صورة المشاركة في `public/og-image.png` بمقاس **1200×630** (مشار إليها في `index.html`).
- حدّث `public/sitemap.xml` و `public/robots.txt` بالنطاق النهائي بدل `https://ebnili.com`.
- تأكد أن `VITE_APP_URL` يشير إلى النطاق الحقيقي.

## 6) النشر على Vercel

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

### ج) متغيرات البيئة على Vercel

```bash
vercel env add VITE_SUPABASE_URL production --value "https://<project-id>.supabase.co" --yes
vercel env add VITE_SUPABASE_ANON_KEY production --value "<anon-key>" --yes
vercel env add VITE_ORANGE_CASH_NUMBER production --value "01207782741" --yes
```

> أضف المتغيرات قبل النشر، وبعد أي تعديل عليها أعد النشر لأن قيم `VITE_*` تُدمج وقت البناء.
> بدون مفاتيح Supabase حقيقية يعمل الموقع لكن في الوضع المحلي (تخزين `localStorage`) ولن
> تُجلب بيانات المستخدمين/الاشتراكات إلى لوحة المالك.

### د) بعد النشر

- أضف `public/og-image.png` (1200×630) لصورة المشاركة في وسائل التواصل.
- استبدل `https://ebnili.com` بالنطاق النهائي في: `index.html` (og:url / og:image /
  canonical)، `public/sitemap.xml`، `public/robots.txt`.
- من Vercel: **Settings → Domains** لإضافة النطاق المخصّص.

## ملاحظات معمارية

- `src/lib/generator.ts` يولّد كود الموقع الناتج (HTML/CSS/JS) بدون قوالب جاهزة.
- `src/lib/auth.ts` يتولى بصمة الجهاز + الربط بالحساب (الحد المجاني يُمنع إذا كانت البصمة مرتبطة بحساب آخر).
- `src/lib/admin.ts` دوال المالك: إحصائيات، سجل النشاط، تحديث حالة المعاملات والاشتراكات.
- `SidePreview` معاينة عائمة جانبية، و`AdminDashboard` لوحة المالك (تُفتح لبريد المالك فقط).

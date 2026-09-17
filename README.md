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

> `VITE_ADMIN_EMAIL` هو بريد المالك الذي تصل إليه إشعارات الاشتراكات في لوحة التحكم.

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

## ملاحظات معمارية

- `src/lib/generator.ts` يولّد كود الموقع الناتج (HTML/CSS/JS) بدون قوالب جاهزة.
- `src/lib/auth.ts` يتولى بصمة الجهاز + الربط بالحساب (الحد المجاني يُمنع إذا كانت البصمة مرتبطة بحساب آخر).
- `src/lib/admin.ts` دوال المالك: إحصائيات، سجل النشاط، تحديث حالة المعاملات والاشتراكات.
- `SidePreview` معاينة عائمة جانبية، و`AdminDashboard` لوحة المالك (تُفتح لبريد المالك فقط).

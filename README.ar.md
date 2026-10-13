<div align="center" dir="rtl">

<img src="resources/icon.png" width="96" alt="شعار StreamPull" />

# StreamPull

**نزّل الفيديو والصوت من أي موقع تقريباً — بتطبيق مكتبي حديث بتصميم بنفسجي غامق.**

![License: MIT](https://img.shields.io/badge/license-MIT-8b5cf6)
![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-7c3aed)

العربية · [English](README.md)

<img src="docs/screenshots/home-ar.png" alt="الشاشة الرئيسية" width="820" />

</div>

<div dir="rtl">

StreamPull بديل مكتبي لإضافات المتصفح مثل *Video DownloadHelper*: الصق الرابط، **أو** تصفّح داخل
البرنامج ودعه يلتقط الفيديوهات لك. يعمل بمحرك [yt-dlp](https://github.com/yt-dlp/yt-dlp)
(أكثر من ١٠٠٠ موقع) و[FFmpeg](https://ffmpeg.org).

## المميزات

- **الصق الرابط واختر الجودة** — كل الدقات المتاحة مع الحجم التقريبي، أو الصوت فقط (MP3 / M4A).
- **متصفح مدمج يكتشف الوسائط** — شغّل أي فيديو في الصفحة فيظهر في لوحة *الوسائط المكتشفة*
  (ملفات مباشرة، وبثوث HLS وDASH). تسجيل دخولك يُحفظ ويُستخدم في التنزيل.
- **قوائم التشغيل والقنوات** — حدّد وابحث ونزّل عدة عناصر دفعة واحدة.
- **طابور ذكي** — تنزيلات متوازية، إيقاف مؤقت واستئناف وإلغاء وإعادة محاولة، مع السرعة والوقت المتبقي.
- **مكتبة** — سجل بحث وفلاتر، وفتح الملف، وإظهاره في المجلد، وإعادة التنزيل.
- **عربي أولاً مع الإنجليزية** — واجهة RTL كاملة، وتبديل اللغة في أي وقت.
- **محرك يتحدّث تلقائياً** — يتجدّد yt-dlp يومياً لأن المواقع تتغيّر باستمرار.
- **خصوصية** — بدون حسابات ولا تتبّع، ولا يخرج من جهازك شيء إلا التنزيلات التي تبدأها.

<p align="center">
  <img src="docs/screenshots/library-ar.png" width="400" alt="المكتبة" />
  <img src="docs/screenshots/browser-ar.png" width="400" alt="المتصفح المدمج" />
</p>

## التثبيت

نزّل المثبّت المناسب لنظامك من صفحة [**الإصدارات**](../../releases).

| النظام | الملف |
| --- | --- |
| ويندوز | `StreamPull-Setup-x.y.z.exe` (مثبّت) أو `…-portable.exe` |
| ماك | `StreamPull-x.y.z-mac-arm64.dmg` (Apple Silicon) / `…-x64.dmg` (Intel) |
| لينكس | `StreamPull-x.y.z-linux-x86_64.AppImage` أو `.deb` |

> **الحالة:** ويندوز هو النظام الأكثر اختباراً. إصدارات ماك ولينكس تُبنى عبر CI وتُعد **تجريبية**،
> فإذا وجدت مشكلة [افتح Issue](../../issues).

**الإصدارات غير موقّعة حالياً**، فقد يحذّرك نظامك أول مرة:

- **ويندوز** — SmartScreen: *مزيد من المعلومات ← تشغيل على أي حال*.
- **ماك** — كليك يمين على التطبيق ← *فتح*. وإذا قال إن التطبيق تالف، نفّذ:
  `xattr -cr "/Applications/StreamPull.app"`
- **لينكس** — `chmod +x StreamPull-*.AppImage`. وفي Ubuntu 23.10 وما بعده قد يحتاج الـ AppImage الخيار
  `--no-sandbox`، أما حزمة `.deb` فلا تحتاجه.

عند أول تشغيل ينزّل البرنامج **yt-dlp** و**FFmpeg** (حوالي ٥٠ ميجا، مرة واحدة) داخل مجلد بياناته.

## البناء من المصدر

يحتاج Node.js 22 أو أحدث.

```bash
git clone https://github.com/Mahaadi-dis/streampull.git
cd streampull
npm ci
npm run dev          # تشغيل التطبيق مع التحديث الفوري
npm run typecheck    # فحص TypeScript
npm test             # الاختبارات
npm run dist:win     # أو dist:mac / dist:linux — يبني المثبّتات في ./release
```

يجب بناء كل مثبّت على نظامه نفسه (وهذا ما يفعله workflow الإصدارات في GitHub Actions).

## القيود

- الخدمات المحمية بـ **DRM** (نتفليكس، ديزني+ …) غير مدعومة ولن تُدعم.
- تسجيل الدخول بحساب **Google** داخل المتصفح المدمج تحجبه Google غالباً.
- المتصفح المدمج بتبويب واحد حالياً.
- نسخة أندرويد مخطط لها ولم تبدأ بعد.

## تنبيه قانوني

StreamPull أداة عامة. **نزّل فقط المحتوى الذي تملكه أو المسموح لك بتنزيله**، والتزم بحقوق النشر
وشروط استخدام كل موقع. لا يشجّع المطورون على القرصنة ولا يتحملون مسؤولية طريقة استخدام البرنامج،
والبرنامج لا يتجاوز حماية DRM.

## المساهمة

الـ Issues والـ Pull Requests مرحّب بها — راجع [CONTRIBUTING.md](CONTRIBUTING.md).
الترجمة مجرد ملفَّي JSON في `src/renderer/src/i18n/`.

## الرخصة

[MIT](LICENSE). المكوّنات الخارجية مذكورة في [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

</div>

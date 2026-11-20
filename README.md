# Xonqa O‘rinboy Hotdog

React + Vite + **TypeScript** + Supabase. `src/` ichidagi ilova kodi `.ts` va `.tsx` formatida. Global holat Redux Toolkit slice’lari va React Redux orqali boshqariladi.

## Ishga tushirish

- Node.js 22.13+ yoki 24 LTS
- `.env.example` nusxasini `.env` nomi bilan saqlang va Supabase qiymatlarini kiriting.
- `npm ci`
- `npm run dev` — `http://localhost:8080`
- `npm run typecheck` — TypeScript tekshiruvi
- `npm test` — testlar
- `npm run lint` — ESLint
- `npm run build` — production build

## Sahifalar

- Sayt: `/`
- Stol bron qilish: `/stol-band-qilish`
- Admin: `/admin`
- Admin login: `/admin/login`
- Bron va stollar: `/admin/reservations`

## Yangi, bo‘sh Supabase loyihasini sozlash

1. Supabase’da yangi project yarating.
2. Project Settings → API dan Project URL va Publishable key ni oling.
3. `.env` faylida quyidagilarni kiriting:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
```

4. Supabase → SQL Editor → New query bo‘limida `supabase/setup.sql` faylini to‘liq joylab, Run bosing. Bu bo‘sh jadvallar, RLS, storage bucket va bron cheklovlarini yaratadi. **Demo mahsulotlar, kategoriyalar, aksiyalar, stollar yoki buyurtmalar kiritilmaydi.**
5. Supabase CLI orqali project'ni link qiling va Edge Function'ni deploy qiling:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set ADMIN_INITIAL_LOGIN=admin ADMIN_INITIAL_PASSWORD='OZINGIZ_TANLAGAN_12+_BELGILI_PAROL'
npx supabase functions deploy api
```

`SUPABASE_SERVICE_ROLE_KEY` faqat Edge Function secret bo‘lishi shart. Uni `.env` frontend o‘zgaruvchisiga (`VITE_...`) qo‘ymang. Adminning boshlang‘ich login nomi `admin`; parolni yuqoridagi buyruqda o‘zingiz belgilang. Parol kamida 12 belgidan iborat bo‘lsin. Birinchi muvaffaqiyatli kirishdan keyin admin sozlamalaridan login/parolni yangilang.

## Ishga tushirgandan keyin

- Admin panelga `/admin/login` orqali kiring.
- Admin → Kategoriyalar: kerakli kategoriyalarni o‘zingiz yarating.
- Admin → Mahsulotlar: mahsulotlarni o‘zingiz kiriting.
- Admin → Stol bronlari: avval stollarni qo‘shing, keyin mijozlar bron yubora oladi.
- Admin → Sozlamalar: ish vaqti, aloqa va to‘lov ma’lumotlarini kiriting.

## Eslatma

Yangi Supabase bazasi bo‘sh bo‘ladi. Saytda mahsulot va kategoriya qo‘shmaguningizcha menyu bo‘sh ko‘rinadi. Stol qo‘shmaguningizcha bron formasi bo‘sh stol ko‘rsatmaydi. `.env` fayli ZIP ichiga qo‘shilmaydi.

## v24 ni mavjud saytga o‘rnatish

1. Avvalgi loyihadagi frontend .env faylini yangi loyiha papkasiga nusxalang.
2. Supabase SQL Editor orqali supabase/migrations/20261120000000_store_updates.sql faylini bir marta bajaring. Oldingi versiya jadvallari mavjud bo‘lishi kerak. Xabar faqat yangilanish haqida signal beradi.
3. Hosted Supabase loyihasida ro‘yxatdan o‘tishi bilan sessiya ochilishi uchun Authentication sozlamalarida email orqali kirishni yoqing va Confirm email parametrini o‘chiring. Tasdiqlash yoqilgan bo‘lsa, mijoz avval tasdiqlash havolasini ochadi.
4. npm ci va npm run dev buyruqlarini bajaring. Tayyor sayt uchun npm run build ishlating.
5. Jonli mijozlar hisobini sinash uchun admin panelini bir brauzerda, saytni boshqa brauzerda oching. Mijoz kirgach hisob birga ortadi. Bir hisobning ikki ochiq varag‘i bitta mijoz hisoblanadi. Barcha varaqlar yopilgach yoki hisobdan chiqilgach server ulanish holatini yangilaydi. Realtime xizmatida public kanallar ochiq bo‘lishi kerak.

## V28 · pullik stol bronlari

Mavjud v27 bazasida `supabase/migrations/20261120010000_reservation_payment.sql` faylini SQL Editor orqali bajaring. Keyin o‘sha loyihaga `npx supabase functions deploy api` orqali yangilangan API funksiyasini joylang va frontendni yangilang. Cheklar mavjud yopiq `order-receipts` bucketidan foydalanadi.

Admin panelidagi Stollar va joylar bo‘limida har bir stolga bir bron uchun narx (so‘m), sig‘im va ixtiyoriy HTTPS fotosurat havolasini kiriting. Avvalgi stollar 0 so‘m bo‘lib qoladi. Pullik bronlar uchun Sozlamalar bo‘limida qabul qiluvchi karta raqamini kiriting. Mijoz bank ilovasidan pul o‘tkazib, rasm yoki PDF chekni biriktiradi. Administrator tushumni tekshirib bronni tasdiqlaydi. Agar ikki mijoz bir vaqtni tanlasa, baza birinchi saqlangan bronni qabul qiladi. Pul o‘tkazilganidan so‘ng joy band bo‘lib qolsa, mijoz administrator bilan boshqa vaqt yoki qaytarishni kelishishi kerak.

## V29 ni v28 ustiga joylash

1. Mavjud bazada `supabase/migrations/20261120020000_customer_notifications.sql` faylini bajaring. Yangi bazani `supabase/setup.sql` orqali tayyorlash mumkin.
2. O‘sha Supabase loyihasida `npx supabase functions deploy api` buyrug‘ini bajaring.
3. Frontend uchun mavjud .env sozlamalarini saqlang. `npm ci`, so‘ng `npm run build` buyrug‘ini bajaring va dist papkasini HTTPS hostingga joylang. Ichki yo‘llar index.html ga yo‘naltirilishi kerak.
4. Sinov buyurtmasi va pullik bron yuboring. Admin panelida bildirishnoma va ovozni yoqing, sahifada bir marta bosing. Buyurtma xabarida Ko‘rish tugmasi aynan shu buyurtmani ochadi. Admin holatlarni o‘zgartirganda mijoz saytda xabarlarni oladi. Tizimga kirgan hisob boshqa qurilmadan ham o‘z xabarlarini oladi. Mehmon bronlari o‘sha brauzerda kuzatiladi. Ovoz brauzerning nutq sintezatori va o‘rnatilgan ovozlariga bog‘liq.

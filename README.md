# 🛒 SmartCart – ניהול קניות חכם למשפחה

SmartCart היא אפליקציית ווב מלאה לניהול קניות בסופרמרקט. מצלמים קבלה, ה-AI מחלץ את הנתונים, ואתם מקבלים ניתוחים, השוואות מחירים, ולוח בקרה חודשי מלא.

---

## ✨ תכונות

- **העלאת קבלות** – תמונה או PDF, ה-AI (Gemini) מחלץ את כל הפריטים אוטומטית
- **לוח בקרה** – הוצאות חודשיות, גרפים שבועיים, פירוט לפי רשת
- **קטלוג מוצרים** – חיפוש, סינון קטגוריה, היסטוריית מחירים לפי חנות
- **השוואת רשתות** – בחר 2–3 רשתות וראה מי מוכר זול יותר
- **ממשק עברי RTL** מלא

---

## 🗂️ מבנה הפרויקט

```
smartcart/
├── client/          ← React 18 + Recharts (frontend)
├── server/          ← Node.js + Express (backend)
│   ├── routes/      ← הגדרת נקודות API
│   ├── services/    ← לוגיקה עסקית (עיבוד קבלות)
│   ├── db/          ← שאילתות Supabase
│   ├── ai/          ← אינטגרציה עם Gemini API
│   └── middleware/  ← auth, validation, error handling
├── shared/          ← types.js משותף לשני הצדדים
└── .env.example     ← תבנית משתני סביבה
```

---

## ⚙️ הגדרת סביבה

### דרישות מוקדמות
- Node.js 18+
- חשבון [Supabase](https://supabase.com) (חינמי)
- מפתח API של [Google Gemini](https://aistudio.google.com/app/apikey) (חינמי)

### 1. הכנת מסד הנתונים

1. צור פרויקט חדש ב-Supabase
2. עבור ל-**SQL Editor** בלוח הבקרה של Supabase
3. הדבק והרץ את תוכן הקובץ: `server/db/migration.sql`

### 2. הגדרת משתני סביבה

```bash
# בשורש הפרויקט (smartcart/)
cp .env.example .env
```

ערוך את `.env` והוסף:

```env
# Supabase – מ: Dashboard → Project Settings → API
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Gemini – מ: aistudio.google.com/app/apikey
GEMINI_API_KEY=AIza...

# שרת
PORT=3001
NODE_ENV=development

# לקוח
REACT_APP_API_URL=http://localhost:3001
```

### 3. התקנת תלויות

```bash
cd smartcart
npm run install:all
```

פקודה זו מתקינה תלויות ב-root, server ו-client.

### 4. הפעלה

```bash
# הרצת server + client ביחד (dev mode)
cd smartcart
npm run dev
```

- **Frontend:** http://localhost:3000
- **Backend:**  http://localhost:3001
- **Health:**   http://localhost:3001/health

---

## 🔌 API Endpoints

| Method | Path | תיאור |
|--------|------|--------|
| POST | `/api/receipts/upload` | העלאת קבלה (image/PDF) |
| GET | `/api/receipts?family_id=X` | כל הקבלות של המשפחה |
| GET | `/api/receipts/:id` | קבלה בודדת עם פריטים |
| GET | `/api/products` | קטלוג מוצרים |
| GET | `/api/products/:id/prices` | היסטוריית מחירים לפי חנות |
| GET | `/api/products/meta/categories` | רשימת קטגוריות |
| GET | `/api/analytics/summary?family_id=X` | סיכום חודשי |
| GET | `/api/analytics/by-store?family_id=X` | הוצאות לפי רשת |
| GET | `/api/analytics/top-products?family_id=X` | מוצרים יקרים ביותר |
| GET | `/api/analytics/weekly?family_id=X` | פירוט שבועי |
| GET | `/api/stores` | רשימת חנויות |

---

## 🧪 זרימת עיבוד קבלה

1. **העלאה** – הקובץ נשמר ב-`server/uploads/`
2. **AI Extraction** – Gemini 1.5 Flash מקבל את התמונה/PDF ומחלץ JSON
3. **Store matching** – מציאה/יצירה של הרשת והסניף
4. **Product matching** – חיפוש fuzzy, יצירת מוצר חדש אם לא נמצא
5. **Calculation** – חישוב מחיר ל-100g/ml
6. **Save** – שמירת הכל ב-Supabase, עדכון status → `done`

---

## ⚠️ מה עוד צריך לעשות

- [ ] **Supabase Auth** – כרגע `family_id` מוגדר קשה. יש לחבר אוטנטיקציה אמיתית
- [ ] **RPC Fuzzy Search** – יצירת `find_similar_product` function ב-Supabase (ראה `productsDb.js`)
- [ ] **File Storage** – להחליף את local uploads ב-Supabase Storage לייצור
- [ ] **Polling** – הוספת polling אוטומטי בממשק לעדכון סטטוס קבלה
- [ ] **Tests** – כתיבת בדיקות unit לשירותים

---

## 🛠️ Stack

| רכיב | טכנולוגיה |
|------|-----------|
| Frontend | React 18, Recharts, React Router v6 |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| AI/OCR | Google Gemini 1.5 Flash |
| File Upload | Multer |
| Auth | Supabase Auth (מוכן להחיבור) |

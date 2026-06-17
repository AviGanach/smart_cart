const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs   = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// gemini-2.5-flash – מולטימודל יציב, תומך בתמונות ו-PDF
const MODEL_NAME = 'gemini-2.5-flash';

function buildPrompt() {
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  return `אתה מומחה בקריאת קבלות סופרמרקט ישראלי.
התאריך היום הוא ${todayStr}. קבלות הן תמיד עדכניות (לכל היותר חודשים אחדים אחורה).
פורמט התאריך בקבלות ישראליות הוא לרוב DD/MM/YY או DD/MM/YYYY — פרש לפי השנה הנוכחית (${yyyy}).

═══ חוקים לחילוץ פריטים ═══

【מחיר】
עמודת המחיר (הימנית ביותר) היא תמיד המחיר הכולל לאותה שורה.
שים תמיד את המחיר הכולל לשורה בשדה "price".

【פריטים שנמכרים ביחידות】 (רוב המוצרים)
- qty: מספר היחידות שנרכשו (מספר שלם כגון 1, 2, 3)
- price: המחיר הכולל לשורה
- unit: "units" (או "ml" לנוזלים ביחידות אריזה)

【פריטים שנמכרים במשקל】 (בשר, עוף, דגים, ירקות, פירות, גבינות פתוחות)
  אלו מזוהים כאשר עמודת הכמות מכילה "ק\"ג" או "קג"
  - qty: המשקל בגרמים (המר ק"ג לגרמים: 3.96 ק"ג → 3960)
  - price: המחיר הכולל לשורה (הספרה הגדולה בצד ימין)
  - unit: "g"
  דוגמה: "בשר צוואר בקר  3.96 ק\"ג  118.34" → qty:3960, price:118.34, unit:"g"
  דוגמה: "בצל  2.32 ק\"ג  9.06" → qty:2320, price:9.06, unit:"g"

【מבנה שורת מוצר — חשוב】
בקבלות ממוחשבות ישראליות, כל מוצר מתחיל בברקוד (מספר של 6-13 ספרות).
שם המוצר עשוי להתפרס על שתי שורות — חבר אותן לשם אחד.
הכמות והמחיר מופיעים תמיד בסוף השורה השנייה של הפריט.
אל תבלבל בין שמות של פריטים שונים — כל ברקוד = מוצר אחד חדש.

דוגמאות למבנה (אלו דוגמאות בלבד, לא מהקבלה הנוכחית):
  761742699425  עוגת שמרים          ← ברקוד + חלק א' של שם מוצר א'
                גבינה עונג  1  19.90 ← חלק ב' של שם א' + כמות + מחיר
  → { name: "עוגת שמרים גבינה עונג", qty: 1, price: 19.90 }

  7290102394463 גבינה נעם 28%       ← ברקוד חדש = מוצר חדש (ב' שונה מא'!)
                500 גר      2  50.00 ← חלק ב' של שם ב' + כמות + מחיר
  → { name: "גבינה נעם 28% 500 גר", qty: 2, price: 50.00 }

【שם המוצר】
הסר מהשם כל טקסט של מבצעים המופיע לפניו או אחריו:
  - תבניות להסרה: "X ב Y", "מוגבל X", "ב X-", "X ב Y מוגבל Z", "X ב Y אשכו Z"
  - דוגמה: "3 ב 20 מוגבל 3 פתיבר בטעם קפה אסם" → "פתיבר בטעם קפה אסם"
  - דוגמה: "ב 20- לליק/לבבות 2ב בשר מס 10 צוואר בקר" → "בשר מס 10 צוואר בקר"

החזר אך ורק JSON תקין (ללא markdown, ללא הסברים):
{
  "store_name": "שם הרשת",
  "date": "YYYY-MM-DD",
  "total": <number>,
  "items": [
    {
      "barcode": "מספר הברקוד של הפריט כמחרוזת, או null אם אין",
      "name": "שם המוצר נקי בלי טקסט מבצע",
      "qty": <number>,
      "price": <number>,
      "unit": "g"|"ml"|"units"
    }
  ]
}
חשוב: לכל פריט חייב להיות ברקוד שונה (אלא אם מדובר באותו מוצר שנקנה מספר פעמים).
אם אינך בטוח בשדה – החזר null.`;
}

/**
 * Extract receipt data from one or more image/PDF files using Google Gemini.
 * Pass multiple images when the receipt was photographed in several parts.
 *
 * @param {Array<{filePath: string, mimeType: string}>} files
 *   – e.g. [{ filePath: '/uploads/a.jpg', mimeType: 'image/jpeg' }, ...]
 * @returns {Promise<Object>} – parsed JSON { store_name, date, total, items }
 */
async function extractReceiptData(files) {
  // Normalise: allow legacy single-call signature extractReceiptData(filePath, mimeType)
  if (typeof files === 'string') {
    files = [{ filePath: files, mimeType: arguments[1] }];
  }

  console.log(`🤖 [Gemini] Starting receipt extraction for ${files.length} file(s):`);
  files.forEach((f, i) => console.log(`   [${i + 1}] ${path.basename(f.filePath)} (${f.mimeType})`));

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  // Build parts: one inlineData block per file, then the text prompt at the end
  const parts = [
    ...files.map(({ filePath, mimeType }) => ({
      inlineData: {
        mimeType,
        data: fs.readFileSync(filePath).toString('base64'),
      },
    })),
    {
      text: files.length > 1
        ? `הקבלה צולמה ב-${files.length} חלקים נפרדים. חלץ את כל הפריטים מכלל התמונות וספק JSON אחד מאוחד.\n\n${buildPrompt()}`
        : buildPrompt(),
    },
  ];

  console.log(`🤖 [Gemini] Sending request to Gemini API (model: ${MODEL_NAME})...`);

  let result;
  try {
    result = await model.generateContent({ contents: [{ role: 'user', parts }] });
  } catch (apiErr) {
    console.error('🤖 [Gemini] API call failed:', apiErr.message);
    throw new Error('שגיאה בתקשורת עם Gemini API. אנא בדוק את מפתח ה-API ונסה שוב.');
  }

  const rawText = result.response.text();
  console.log(`🤖 [Gemini] Raw response received (${rawText.length} chars)`);

  // Strip markdown code fences if present
  const jsonStr = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseErr) {
    console.error('🤖 [Gemini] ERROR: JSON parse failed:', parseErr.message);
    console.error('🤖 [Gemini] Raw text was:', rawText);
    throw new Error('לא ניתן לחלץ נתונים מהקבלה. אנא נסה שוב עם תמונה ברורה יותר.');
  }

  console.log(
    `🤖 [Gemini] ✅ Extracted: ${parsed.items?.length || 0} items` +
    ` | Store: "${parsed.store_name}" | Date: ${parsed.date} | Total: ₪${parsed.total}`
  );

  return parsed;
}

module.exports = { extractReceiptData };

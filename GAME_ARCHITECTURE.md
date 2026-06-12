# איך משחק עובד באתר הזה

מסמך זה מתאר את הארכיטקטורה הפנימית של משחק: איך הוא מתחבר ל"API" הפנימי של
המערכת (שכבת הנתונים, מנוע הבחירה, הניקוד, ההתקדמות והאחסון), ומה משחק חדש
*חייב* לממש. אם המטרה היא רק להוסיף תוכן/משחק בלי לכתוב קוד — ראו את
`HOW_TO_ADD_GAMES.md`. המסמך הנוכחי מסביר את מה שקורה מתחת.

---

## 1. סקירה כללית

האתר הוא אפליקציית **Vue 2** מסוג Single Page Application, בלי שרת ובלי build.
כל הקבצים נטענים ישירות ב-`index.html` לפי הסדר הזה:

| קובץ | תפקיד |
|------|-------|
| `data.js` | אובייקט `DATA` — כל התוכן (רשימות מילים, שאלות וכו') |
| `apps.js` | אובייקט `apps` — עץ התפריטים והגדרות המשחקים |
| `themes.js` | ערכות צבעים |
| `storage.js` | שכבת אחסון מקומי (localStorage), ניקוד, התקדמות, היסטוריה |
| `firebase.js` | סנכרון ענן אופציונלי (Google Sign-In + Firestore) |
| `tester.js` | מנוע המשחק: רכיבי ה-Vue, פונקציות העזר וה-router |

**אין API רשת אמיתי.** מה שנקרא כאן "API" הוא החוזה הפנימי בין רכיב המשחק לבין
פונקציות העזר ב-`tester.js` ו-`storage.js`. כל ה"שרת" הוא ה-`localStorage` של
הדפדפן, עם סנכרון אופציונלי ל-Firestore.

זרימה כללית:

```
index.html  → טוען את כל הסקריפטים
   apps      → המשתמש בוחר משחק מהתפריט (MenuComponent)
   router    → /play/<appType>/<appId> טוען את רכיב המשחק המתאים
   רכיב משחק → קורא נתונים מ-DATA, בוחר שאלה לפי משקלים,
               מציג, בודק תשובה, מעדכן ניקוד/משקלים/התקדמות
   storage   → נשמר ל-localStorage (+ סנכרון ל-Firebase אם מחובר)
```

---

## 2. שכבת הנתונים — ה"Data API"

כל התוכן יושב באובייקט הגלובלי `DATA` שב-`data.js`. כל רשימה היא מערך של
**פריטים**, וכל פריט הוא אובייקט של **שדות**. כל שדה הוא אובייקט `{type, value}`:

```javascript
DATA.ANIMALS = [
  {
    "english_name": {"type": "text_to_speech", "value": "Dog"},
    "hebrew":       {"type": "text",           "value": "כלב"},
    "emoji":        {"type": "text",           "value": "🐶"},
    "groups":       [1]            // אופציונלי — ראו למטה
  },
  // ...
];
```

### סוגי שדה (`type`) ואיך הם מרונדרים

הפונקציה `render(field)` ב-`tester.js` הופכת שדה ל-HTML/טקסט להצגה:

| `type` | מה קורה |
|--------|---------|
| `text` | מוצג הערך כטקסט רגיל |
| `text_to_speech` | לינק שלוחיצה עליו מקריאה את הטקסט (Web Speech) |
| `audio` | כפתור נגן שמשמיע קובץ אודיו מה-URL שב-`value` |
| `speech` | כפתור נגן שמקריא את הטקסט (TTS) במקום להציג אותו |

מעבר ל-`render`, הפונקציה `generateQuestion(field)` מחזירה **action** —
פעולה שמופעלת אוטומטית כששאלה מוצגת (למשל הקראה אוטומטית של `text_to_speech`/`audio`).

### שדה `groups` (אופציונלי, חשוב למסיחים)

אם לפריט יש `groups: [...]`, אז המסיחים (התשובות השגויות) ייבחרו רק מפריטים
שחולקים קבוצה משותפת. כך, למשל, בתרגיל חשבון בוחרים מסיחים מאותו טווח קושי.
בלי `groups`, המסיחים נבחרים מכל הרשימה. הלוגיקה ב-`getRandomIndexesExcluding`.

---

## 3. החוזה של משחק — מה משחק חייב לממש

משחק = **רכיב Vue** המרושם ב-router תחת `/play/<appType>/:currentAppId`.
ה-`appType` שבהגדרת המשחק ב-`apps.js` הוא שקובע איזה רכיב נטען.

רוב המשחקים יורשים מ-`BaseGameComponent` (`extends: BaseGameComponent`),
שמספק בחינם את כל ה"תשתית". משחק חייב לספק:

### 3.1 מה שמגיע מ-`BaseGameComponent` (אתה לא צריך לכתוב מחדש)

State (ב-`data`): `theme, result, exercise, message, ended, score,
currentAppId, questionIndex, progress`.

מתודות מחזור-חיים ושירות:

| מתודה | תפקיד |
|-------|-------|
| `created()` | קורא את `currentAppId` מה-route, טוען את `currentApp` מ-`apps`, מאתחל התקדמות+ניקוד וקורא ל-`create()` |
| `reloadProgress()` | מעדכן את `progress`; אם השלב הסתיים → ניווט אוטומטי למסך הסיכום; אם יש פריטים חדשים → ניווט למסך ההצגה. מחזיר `false` אם בוצע ניווט (סימן ל-`create` להפסיק) |
| `updateScore()` / `saveScore()` | טעינה/שמירה של הניקוד לפי `currentAppId` |
| `getSuccessMsg()` | טקסט הצלחה |
| `shuffle(arr)` | ערבוב מערך |
| `saveApp(appId)` | מוסיף את המשחק לרשימת "המשחקים שלי" של המשתמש |

> שים לב: חלק מהרכיבים (כמו `falling_answers`, `draw_letter`, `s2t`) **לא**
> משתמשים ב-`created` של ה-Base אלא מגדירים `mounted()` משלהם — נחוץ כשצריך
> גישה ל-DOM (canvas, אזור משחק) או הגדרה של מאזינים. ראו אופציה ב' בהמשך.

### 3.2 מה שהמשחק חייב לממש בעצמו

1. **`template`** — ה-HTML של המשחק. הקונבנציה: כותרת/שאלה (`exercise`),
   אזור אינטראקציה, שורת `message`, הצגת `score`, ורכיב
   `<progress-bar :title="'שלב נוכחי'" :progress="progress" :theme="theme">`.
2. **`create()`** — מייצר שאלה חדשה: בוחר פריט לפי משקלים, מגדיר
   `exercise`/`result`/`questionIndex`, ומפעיל את ה-action (הקראה). חובה
   לעטוף את ההמשך ב-`if (this.reloadProgress()) { ... }` כדי לכבד סיום שלב/ניווט.
3. **בודק תשובה** (לרוב `check(index)`), שבו:
   - בהצלחה: `successSound.play()`, `updateWeightForKey(id, questionIndex, -1)`,
     `this.score += 1`, `saveScore()`, ואם `reloadProgress()` → `setTimeout(this.create, ...)`.
   - בכישלון: `failureSound.play()`, הורדת ניקוד,
     `updateWeightForKey(id, questionIndex, +1)`, הצגת הודעת שגיאה.
4. **רישום ב-router** — להוסיף שורה ל-`routes` בתחתית `tester.js`:
   ```javascript
   {path: '/play/my_game/:currentAppId', component: MyGameComponent, props: true},
   ```

זהו החוזה המינימלי. כל השאר (משקלים, ניקוד, התקדמות, סנכרון ענן) קורה דרך
פונקציות ה-API שבסעיף הבא.

---

## 4. ה"API" הפנימי — הפונקציות שמשחק קורא להן

### 4.1 בחירת שאלה ומסיחים (`tester.js`)

| פונקציה | מה היא עושה |
|---------|-------------|
| `getDataList(listName)` | מחזירה את המערך מ-`DATA` (זורקת שגיאה אם לא קיים) |
| `getWeightedRandomIndex(list, key, setItems)` | בוחרת אינדקס של פריט לפי **משקלים** — פריטים שטועים בהם יותר מקבלים משקל גבוה ולכן חוזרים יותר. `key` הוא `currentAppId` |
| `getRandomIndexesExcluding(list, resultIndex, answerIndex, count=3)` | מחזירה אינדקסים למסיחים, ללא כפילות ערך ותוך כיבוד `groups` |
| `generateFromList(listName, questionIndex, resultIndex, key, setItems, questionType)` | עוטפת את הכול ומחזירה `{question, result, options, action, questionIndex}` — זה כל מה ש-MCQ צריך |
| `generateQuestion(field)` | מחזירה את ה-action (הקראה/השמעה) לשדה השאלה |
| `render(field)` | הופכת שדה ל-HTML להצגה |

### 4.2 משקלים, ניקוד והתקדמות (ליבת ה"למידה")

| פונקציה | מה היא עושה |
|---------|-------------|
| `getWeightsForKey(key, setItems, elements)` | טוענת/מאתחלת את מערך המשקלים של המשחק. במצב למידה רק `setItems` הפריטים הראשונים "פתוחים" (משקל ≥0), השאר `-1` (נעולים) ונפתחים בהדרגה |
| `updateWeightForKey(key, index, change)` | מעדכנת משקל של פריט (`-1` בהצלחה, `+1` בכישלון), שומרת היסטוריית ניסיון, ושולחת אירוע אנליטיקס. זו הקריאה המרכזית אחרי כל תשובה |
| `getScore(appId)` / `saveScore()` | ניקוד מצטבר למשחק |
| `setProgress` / `getProgress` / `getCurrentLevelProgress` | התקדמות בשלב הנוכחי (מוצג ב-progress bar) |
| `recordAttemptResult(key, index, isSuccess)` | שומר עד 5 ניסיונות אחרונים לכל פריט (הנקודות הירוקות/אדומות במסך המשחק) |

המודל המנטלי: כל פריט מקבל **משקל**. תשובה נכונה מורידה משקל עד שהפריט "נלמד"
(0), תשובה שגויה מעלה. השאלה הבאה נדגמת באקראי משוקלל, כך שחוזרים יותר על מה
שקשה. כשכל הפריטים בשלב מגיעים ל-0, נפתח שלב חדש (פריטים נוספים מהרשימה).
זה ההבדל בין **מצב למידה** (`learning` — פתיחה הדרגתית) ל**מצב תרגול**
(`practicing` — כל הפריטים פתוחים במשקל קבוע). נקבע במסך המשתמש דרך `setActivityMode`.

### 4.3 אחסון וסנכרון ענן (`storage.js` + `firebase.js`)

כל הקריאות עוברות דרך `setLocalStorage(key, value)` / `getLocalStorage(key, default)`.
המפתחות מקודדים לפי המשתמש (`getKey` מוסיף את שם המשתמש), כך שלכל משתמש נתונים
נפרדים. כל כתיבה מפעילה אוטומטית hook לסנכרון ל-Firestore (`firebaseSyncLocalStorageKey`)
אם המשתמש מחובר עם Google — **אתה לא צריך לעשות כלום בשביל זה**, מספיק להשתמש
בפונקציות האחסון של המערכת.

---

## 5. אפשרויות מימוש משחק

יש שלוש דרכים, מהקלה לעמוקה:

### אופציה א' — בלי קוד: שימוש חוזר ב-`appType` קיים

הדרך המומלצת לרוב המקרים. רק מוסיפים רשימה ל-`DATA` ושורת הגדרה ל-`apps.js`.
סוגי המשחק הקיימים:

| `appType` | רכיב | מה צריך בהגדרה | מתאים ל |
|-----------|------|----------------|---------|
| `mcq` | `MCQComponent` | `listName, questionIndex, resultIndex, setItems` | שאלה אמריקאית (4 תשובות) — הסוג הנפוץ ביותר |
| `spell` | `SpellComponent` | `listName, questionIndex, setItems` | הכתבה — הקלדת המילה הנכונה |
| `common` | `CommonComponent` | `listName, a, b, setItems` | התאמת זוגות בין שתי עמודות |
| `draw_letter` | `DrawLetterComponent` | `listName, questionIndex, resultIndex, title` | ציור אות על קנבס (זיהוי OCR ב-Tesseract) |
| `falling_answers` | `FallingAnswersComponent` | `listName, questionIndex, resultIndex` | לחיצה על התשובה הנכונה בזמן שהיא נופלת |
| `s2t` | `SpeechToTextComponent` | `listName, questionIndex, resultIndex, title` | אמירת התשובה בקול (זיהוי דיבור) |

לאותו `listName` אפשר להגדיר כמה משחקים בכיוונים שונים — למשל `questionIndex:
'english_name', resultIndex: 'hebrew'` מול ההפך — בלי לשכפל נתונים. ראו דוגמאות
ב-`apps.js` (אנגלית↔עברית).

### אופציה ב' — רכיב חדש שיורש מ-`BaseGameComponent` (משחק "סבב")

מתאים כשרוצים מנגנון אינטראקציה חדש אבל אותה לוגיקת למידה (שאלה → תשובה → ניקוד).
תבנית מינימלית:

```javascript
var MyGameComponent = Vue.component('my_game', Vue.extend({
    template: `<div class="container">
        <h3 v-html="exercise" :style="{color: theme.colors.text}"></h3>
        <!-- אזור האינטראקציה שלך כאן -->
        <div class="row" dir="rtl">
          <h2 v-bind:class="{ 'error': message.error, 'success': message.success }">{{ message.value }}</h2>
        </div>
        <div class="row"><h3 :style="{color: theme.colors.text}">{{ score }}</h3></div>
        <progress-bar :title="'שלב נוכחי'" :progress="progress" :theme="theme"></progress-bar>
    </div>`,

    extends: BaseGameComponent,

    methods: {
        create: function () {
            const q = generateFromList(
                this.currentApp.listName,
                this.currentApp.questionIndex,
                this.currentApp.resultIndex,
                this.currentAppId,
                getSetItems(this.currentApp),
                this.currentApp.questionType
            );
            this.exercise     = q.question;
            this.result       = q.result;
            this.questionIndex = q.questionIndex;
            // ... הכן את ה-UI שלך מתוך q.options ...
            if (this.reloadProgress()) {
                q.action();           // הקראה אוטומטית
                this.$forceUpdate();
                setTimeout(() => { this.ended = false; }, 500);
            }
        },
        check: function (chosen) {
            if (this.ended) return;
            if (chosen === this.result) {
                this.ended = true;
                this.message = {value: this.getSuccessMsg(), success: true};
                successSound.play();
                updateWeightForKey(this.currentAppId, this.questionIndex, -1);
                this.score += 1;
                if (this.reloadProgress()) { this.saveScore(); setTimeout(this.create, 1000); }
            } else {
                failureSound.play();
                this.score = Math.max(0, this.score - 1);
                this.saveScore();
                updateWeightForKey(this.currentAppId, this.questionIndex, 1);
                this.message = {value: 'נסה שוב :(', error: true};
                this.reloadProgress();
            }
        },
    },
}));
```

ואז לרשום ב-`routes`:
```javascript
{path: '/play/my_game/:currentAppId', component: MyGameComponent, props: true},
```
ולהגדיר ב-`apps.js`:
```javascript
{icon: 'extension', name:'המשחק שלי', type:'app', appType:'my_game',
 listName:'MY_LIST', questionIndex:'english_name', resultIndex:'hebrew', setItems: 5},
```

`MCQComponent` ו-`SpellComponent` הם הדוגמאות הטובות ביותר לחיקוי.

### אופציה ג' — רכיב עצמאי עם `mounted` משלו (אנימציה / DOM / חיישנים)

כשצריך גישה ל-DOM, אנימציה מתמשכת, קנבס או חיישני דפדפן (מצלמה/מיקרופון),
מגדירים `mounted()` משלכם במקום להסתמך על ה-`created` של ה-Base. עדיין משתמשים
באותו API ללמידה (`getWeightedRandomIndex`, `updateWeightForKey`, `reloadProgress`,
`saveScore`). דוגמאות קיימות:

- **`FallingAnswersComponent`** — לולאת אנימציה עם `setInterval`, ניקוי ב-`beforeDestroy()`.
- **`DrawLetterComponent`** — קנבס לציור + זיהוי OCR (Tesseract.js).
- **`SpeechToTextComponent`** — Web Speech API לזיהוי דיבור, עם feature-detection.

חשוב בגישה הזו: לזכור לנקות משאבים ב-`beforeDestroy()` (intervals, מאזינים,
זיהוי דיבור פעיל), אחרת הם ימשיכו לרוץ אחרי יציאה מהמשחק.

---

## 6. צ'קליסט להוספת משחק חדש (עם קוד)

1. הוסף את התוכן ל-`DATA` ב-`data.js` (מערך פריטים, שדות `{type, value}`).
2. בחר אופציה: שימוש חוזר ב-`appType` קיים (א'), ירושה מ-Base (ב'), או עצמאי (ג').
3. אם כותבים רכיב חדש: ממש `template` + `create()` + בדיקת תשובה, ירש מ-`BaseGameComponent`.
4. בכל תשובה קרא ל-`updateWeightForKey(appId, questionIndex, ±1)` ועדכן ניקוד.
5. עטוף המשך-זרימה ב-`if (this.reloadProgress())` כדי לכבד סיום שלב/ניווט.
6. רשום נתיב ב-`routes` בתבנית `/play/<appType>/:currentAppId`.
7. הוסף את ההגדרה לעץ ב-`apps.js` עם `appType` תואם.
8. אם הרכיב משתמש ב-DOM/אנימציה — נקה משאבים ב-`beforeDestroy()`.
9. בדוק בדפדפן: בחירת שאלה, תשובה נכונה/שגויה, התקדמות שלב, וסנכרון ניקוד.

---

## 7. סיכום החוזה במשפט אחד

משחק הוא רכיב Vue שנטען לפי `appType` מה-router, שואב פריט מ-`DATA` דרך מנוע
הבחירה המשוקלל, מציג שאלה, ובכל תשובה מדווח למערכת הלמידה דרך
`updateWeightForKey` + עדכון ניקוד + `reloadProgress`. כל השמירה והסנכרון
מתרחשים אוטומטית דרך `storage.js`/`firebase.js`. הירושה מ-`BaseGameComponent`
נותנת את כל זה כמעט בחינם.

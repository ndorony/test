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

## 2. עץ התפריטים וסכמת ה-`currentAppId`

כל המשחקים יושבים בעץ אחד — האובייקט `apps` ב-`apps.js`. לכל צומת יש `type`
שהוא `'menu'` (תיקייה עם `items`) או `'app'` (משחק).

ה-**`currentAppId`** של משחק הוא **נתיב האינדקסים שלו בעץ**, מחובר בקו תחתון.
למשל `0_2_1` = הפריט במיקום 1, בתוך תיקייה במיקום 2, בתוך תיקייה במיקום 0.
ה-router בונה את זה ב-`MenuComponent.getLink` (`route + '_' + index`),
והפונקציה `getItemById(apps, id)` עושה את הפענוך ההפוך — מפצלת לפי `_`
ויורדת בעץ.

זה קריטי כי **ה-`currentAppId` הוא ה-namespace של כל האחסון** של אותו משחק
(משקלים, ניקוד, התקדמות, היסטוריה). כל רכיב משחק קורא אותו מ-`this.$route.params.currentAppId`
ואת ההגדרה המלאה דרך `getItemById(apps, this.currentAppId)`.

> השלכה חשובה: שינוי סדר הפריטים ב-`apps.js` משנה את ה-id, ולכן "מנתק" משחק
> מנתוני ההתקדמות הקיימים שלו. עדיף להוסיף משחקים בסוף רשימה מאשר לשבץ באמצע.

---

## 3. מחזור החיים המלא — שלושת המסכים של משחק

משחק אינו רק מסך `/play`. הוא חי בתוך זרימה של שלושה רכיבי מסך, וה-router
מנתב ביניהם אוטומטית (בעיקר דרך `reloadProgress`):

```
/menu/...              ← תפריט (MenuComponent)
   │  לחיצה על משחק
   ▼
/app/:id               ← מסך כניסה (AppComponent)
   │  "שחק"
   ▼
/display/news/:id      ← הצגת פריטים *חדשים* שנפתחו, לפני שמשחקים בהם (DisplayComponent)
   │  סיום ההצגה
   ▼
/play/<appType>/:id    ← המשחק עצמו (רכיב המשחק)
   │  כשכל פריטי השלב "נלמדו" (משקל 0)
   ▼
/app/:id               ← חזרה למסך הכניסה, שלב חדש ייפתח
```

### `AppComponent` — מסך הכניסה (`/app/:id`)

מציג שני כפתורים — **"שחק"** (`/play/...`) ו**"הצג הכל"** (`/display/all/...`) —
ורשת של כל פריטי הרשימה. כל פריט מראה:
- האם הוא **פתוח** (`weights[index] >= 0`) או **נעול** (אייקון מנעול) — כך
  מודל ה"שלבים" נראה למשתמש.
- **נקודות היסטוריה** — עד 5 הניסיונות האחרונים (ירוק=הצלחה, אדום=כישלון),
  מתוך `getAttemptHistory`.

הרכיב גם מחשב את `displayKey` — איזה שדה להציג ככותרת — לפי רשימת עדיפויות
(`id, name, english_name, ... , answer`, ואם אין — השדה הראשון).

### `DisplayComponent` — מסכי הצגה (`/display/...`)

מציג פריטים ברצף עם הקראה אוטומטית, בלי בדיקה. ארבעה מצבים לפי הנתיב:

| נתיב | מה מוצג |
|------|---------|
| `/display/news/:id` | רק הפריטים החדשים שנפתחו (`<id>_new_items`) — מוצג אוטומטית לפני משחק חדש |
| `/display/all/:id` | כל הפריטים הפתוחים |
| `/display/key/:id/:key/:value` | פריטים שמסוננים לפי ערך שדה |
| `/display/item/:id/:itemId` | פריט בודד |

מסך ה-news הוא חלק אינטגרלי מ"איך משחק עובד": כשנפתח שלב חדש, המשתמש קודם
*רואה* את הפריטים החדשים, ורק אז משחק בהם.

---

## 4. שכבת הנתונים — ה"Data API"

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

חלק מהרשימות נוצרות בקוד ולא נכתבות ביד — למשל תרגילי החשבון
(`createAsymmetricExercises`) ורשימת `NAME` הדינמית (`getUniqueElements`,
שבונה רשימת אותיות מהשם של המשתמש המחובר). גם רשימות אלה הן בסוף מערך פריטים
באותו פורמט.

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

### `questionType` — דריסת סוג השדה בזמן הצגה

בהגדרת משחק אפשר להוסיף `questionType` (למשל `'speech'`). הוא **דורס** את ה-`type`
של שדה השאלה רק לצורך ההצגה, בלי לשנות את הנתונים. דוגמה מ-`apps.js`:
`HEBREW_LETTERS_WITH_NIKUD` עם `questionType: 'speech'` — האות נשמעת (כפתור נגן)
במקום להופיע ככיתוב. מאחורי הקלעים `generateFromList`/`DisplayComponent`
משכפלים את שדה השאלה ומציבים בו `type = questionType` לפני `render`.

### שדה `groups` (אופציונלי, חשוב למסיחים)

אם לפריט יש `groups: [...]`, אז המסיחים (התשובות השגויות) ייבחרו רק מפריטים
שחולקים קבוצה משותפת. כך, למשל, בתרגיל חשבון בוחרים מסיחים מאותו טווח קושי.
בלי `groups`, המסיחים נבחרים מכל הרשימה. הלוגיקה ב-`getRandomIndexesExcluding`.

---

## 5. תת-מערכת הדיבור והשמע

משחקים נשענים על תת-המערכת הזו עבור ה-action (ההקראה האוטומטית) ולמשחקי קול:

| פונקציה | מה היא עושה |
|---------|-------------|
| `text_to_speech(text)` | הקראה ב-Web Speech API. **מזהה אוטומטית** עברית מול אנגלית (regex על טווח התווים) וקובע `he-IL`/`en_US`, קצב 0.7 |
| `audio(url)` | יצירת `Audio` והשמעה מיידית של קובץ |
| `getVoice(lang)` / `setVoice(lang, uri)` | בחירת קול לפי שפה. המשתמש בוחר קול עברי/אנגלי במסך המשתמש, והבחירה נשמרת (ומסונכרנת לענן) |
| `successSound` / `failureSound` | שני אובייקטי `Audio` גלובליים מתיקיית `sounds/`, מנוגנים אחרי כל תשובה |

לזיהוי דיבור (משחק `s2t`) משתמשים ב-`window.SpeechRecognition || webkitSpeechRecognition`
ישירות ברכיב, עם feature-detection (לא נתמך בכל דפדפן).

---

## 6. החוזה של משחק — מה משחק חייב לממש

משחק = **רכיב Vue** המרושם ב-router תחת `/play/<appType>/:currentAppId`.
ה-`appType` שבהגדרת המשחק ב-`apps.js` הוא שקובע איזה רכיב נטען.

רוב המשחקים יורשים מ-`BaseGameComponent` (`extends: BaseGameComponent`),
שמספק בחינם את כל ה"תשתית". משחק חייב לספק:

### 6.1 מה שמגיע מ-`BaseGameComponent` (אתה לא צריך לכתוב מחדש)

State (ב-`data`): `theme, result, exercise, message, ended, score,
currentAppId, questionIndex, progress`.

מתודות מחזור-חיים ושירות:

| מתודה | תפקיד |
|-------|-------|
| `created()` | קורא את `currentAppId` מה-route, טוען את `currentApp` מ-`apps`, מאתחל התקדמות+ניקוד וקורא ל-`create()` |
| `reloadProgress()` | מעדכן את `progress`; אם השלב הסתיים → ניווט אוטומטי ל-`/app/:id`; אם יש פריטים חדשים → ניווט ל-`/display/news/:id`. מחזיר `false` אם בוצע ניווט (סימן ל-`create` להפסיק) |
| `updateScore()` / `saveScore()` | טעינה/שמירה של הניקוד לפי `currentAppId` |
| `getSuccessMsg()` | טקסט הצלחה |
| `shuffle(arr)` | ערבוב מערך |
| `saveApp(appId)` | מוסיף את המשחק לרשימת "המשחקים שלי" של המשתמש |

> שים לב: חלק מהרכיבים (כמו `falling_answers`, `draw_letter`, `s2t`) **לא**
> משתמשים ב-`created` של ה-Base אלא מגדירים `mounted()` משלהם — נחוץ כשצריך
> גישה ל-DOM (canvas, אזור משחק) או הגדרה של מאזינים. ראו אופציה ג' בהמשך.

### 6.2 מה שהמשחק חייב לממש בעצמו

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

> **חריג — `CommonComponent` (התאמת זוגות) שונה מהותית:** אין בו `result`
> יחיד ו-`check(index)`. הוא מציג שתי עמודות (שדות `a` ו-`b`), והבדיקה
> (`runLogicIfBothSelected`) משווה האם **האינדקס** שנבחר משני הצדדים זהה.
> אם אתה כותב משחק שאינו "שאלה → תשובה אחת", אל תניח את תבנית ה-MCQ —
> תסתכל על `CommonComponent` כמודל חלופי.

---

## 7. ה"API" הפנימי — הפונקציות שמשחק קורא להן

### 7.1 בחירת שאלה ומסיחים (`tester.js`)

| פונקציה | מה היא עושה |
|---------|-------------|
| `getDataList(listName)` | מחזירה את המערך מ-`DATA` (זורקת שגיאה אם לא קיים) |
| `getWeightedRandomIndex(list, key, setItems)` | בוחרת אינדקס של פריט לפי **משקלים** — פריטים שטועים בהם יותר מקבלים משקל גבוה ולכן חוזרים יותר. `key` הוא `currentAppId` |
| `getRandomIndexesExcluding(list, resultIndex, answerIndex, count=3)` | מחזירה אינדקסים למסיחים, ללא כפילות ערך ותוך כיבוד `groups` |
| `generateFromList(listName, questionIndex, resultIndex, key, setItems, questionType)` | עוטפת את הכול ומחזירה `{question, result, options, action, questionIndex}` — זה כל מה ש-MCQ צריך |
| `generateQuestion(field)` | מחזירה את ה-action (הקראה/השמעה) לשדה השאלה |
| `render(field)` | הופכת שדה ל-HTML להצגה |

### 7.2 משקלים, ניקוד והתקדמות (ליבת ה"למידה")

| פונקציה | מה היא עושה |
|---------|-------------|
| `getWeightsForKey(key, setItems, elements)` | טוענת/מאתחלת את מערך המשקלים של המשחק |
| `updateWeightForKey(key, index, change)` | מעדכנת משקל של פריט (`-1` בהצלחה, `+1` בכישלון), שומרת היסטוריית ניסיון, ושולחת אירוע אנליטיקס. זו הקריאה המרכזית אחרי כל תשובה |
| `getScore(appId)` / `saveScore()` | ניקוד מצטבר למשחק |
| `setProgress` / `getProgress` / `getCurrentLevelProgress` | התקדמות בשלב הנוכחי (מוצג ב-progress bar) |
| `recordAttemptResult(key, index, isSuccess)` | שומר עד 5 ניסיונות אחרונים לכל פריט (הנקודות הירוקות/אדומות) |

### 7.3 מנגנון השלבים והמשקלים — לעומק

המודל המנטלי: כל פריט מקבל **משקל**. תשובה נכונה מורידה משקל עד שהפריט "נלמד"
(0), תשובה שגויה מעלה (עד תקרה 15). השאלה הבאה נדגמת באקראי משוקלל, כך שחוזרים
יותר על מה שקשה. אבל מאחורי זה יש מכונת-מצבים של שלבים:

- **משקל `-1` = פריט נעול** (עדיין לא בשלב הנוכחי). פריטים נעולים לא נדגמים
  ולא מוצגים כפתוחים ב-`AppComponent`.
- בתחילת משחק חדש (`getWeightsForKey`), במצב **למידה** רק `setItems` הפריטים
  הראשונים מקבלים משקל `5` והשאר `-1`. במצב **תרגול** *כל* הפריטים מקבלים `5`.
- כשכל הפריטים הפתוחים מגיעים ל-0 (`updateWeights` מזהה `allZero`), המערכת:
  1. מאפסת אותם בחזרה ל-`2`,
  2. פותחת את `setItems` הפריטים הנעולים הבאים (מ-`-1` ל-`5`),
  3. שומרת את האינדקסים החדשים תחת `<id>_new_items`,
  4. מעדכנת `Progress` ו-`CurrentLevelProgress`.
- בפעם הבאה ש-`reloadProgress` רץ ורואה ש-`_new_items` לא ריק → הוא מנווט ל-
  `/display/news/:id` כדי להציג את החדשים לפני שמשחקים בהם.

המפתחות באחסון: `<mode>_<id>_Weights` (מערך המשקלים, תלוי-מצב!), `<id>_Progress`,
`<id>_CurrentLevelProgress`, `<id>_new_items`, `<id>_attemptHistory`,
`score<id>`. שים לב ש-`getWeightsKey` כולל את מצב הפעילות, ולכן למצב למידה
ולמצב תרגול יש מערכי משקלים נפרדים.

---

## 8. אחסון וסנכרון ענן (`storage.js` + `firebase.js`)

כל הקריאות עוברות דרך `setLocalStorage(key, value)` / `getLocalStorage(key, default)`.
`getKey` מוסיף את שם המשתמש לכל מפתח (`<key>_<user>_LocalData` וכד'), כך שלכל
משתמש מקומי נתונים נפרדים. אובייקטים עוברים `JSON.stringify` אוטומטית.

**סנכרון ענן אוטומטי:** כל כתיבה דרך `storage.js` מפעילה hook
`firebaseSyncLocalStorageKey(fullKey, value)`. אם המשתמש מחובר עם Google,
הערך נדחף ל-Firestore (תחת `users/<uid>/data/...`). **אתה לא צריך לעשות כלום**
בשביל זה — מספיק להשתמש בפונקציות האחסון של המערכת ולא ב-`localStorage` ישירות.

נקודות מהמודול (`firebase.js`):
- חשבון Google הוא **מיכל סנכרון** — יכול להחזיק כמה פרופילי משתמש מקומיים.
- בהתחברות (`onAuthStateChanged`) מתבצע `syncFromCloud` — **בקונפליקט, הענן מנצח**
  (דורס את ה-localStorage), ואז דוחף בחזרה כדי לכלול מפתחות מקומיים חדשים.
- הנתונים נשמרים ב-chunks (200 מפתחות לכל doc) בגלל מגבלת 1MB של Firestore.
- Firebase אופציונלי לגמרי — אם האתחול נכשל, האפליקציה עובדת מקומית כרגיל
  (כל ה-hooks בודקים `isFirebaseConnected`).

---

## 9. אפשרויות מימוש משחק

יש שלוש דרכים, מהקלה לעמוקה:

### אופציה א' — בלי קוד: שימוש חוזר ב-`appType` קיים

הדרך המומלצת לרוב המקרים. רק מוסיפים רשימה ל-`DATA` ושורת הגדרה ל-`apps.js`.
סוגי המשחק הקיימים:

| `appType` | רכיב | מה צריך בהגדרה | מתאים ל |
|-----------|------|----------------|---------|
| `mcq` | `MCQComponent` | `listName, questionIndex, resultIndex, setItems` | שאלה אמריקאית (4 תשובות) — הנפוץ ביותר |
| `spell` | `SpellComponent` | `listName, questionIndex, setItems` | הכתבה — הקלדת המילה הנכונה |
| `common` | `CommonComponent` | `listName, a, b, setItems` | התאמת זוגות בין שתי עמודות (מנגנון שונה — ראו §6) |
| `draw_letter` | `DrawLetterComponent` | `listName, questionIndex, resultIndex, title` | ציור אות על קנבס (זיהוי OCR ב-Tesseract) |
| `falling_answers` | `FallingAnswersComponent` | `listName, questionIndex, resultIndex` | לחיצה על התשובה הנכונה בזמן שהיא נופלת |
| `s2t` | `SpeechToTextComponent` | `listName, questionIndex, resultIndex, title` | אמירת התשובה בקול (זיהוי דיבור) |
| `balloon_shooter` | `BalloonShooterComponent` | `listName, questionIndex, resultIndex, title` | מטווח בלונים תלת-ממדי בגוף ראשון (Three.js) — יורים בבלון עם התשובה הנכונה |
| `treasure_maze` | `TreasureMazeComponent` | `listName, questionIndex, resultIndex, title` | מבוך אוצר תלת-ממדי (Three.js) — 3 שערים, בוחרים את הדלת עם התשובה הנכונה כדי להתקדם |

לאותו `listName` אפשר להגדיר כמה משחקים בכיוונים שונים — למשל `questionIndex:
'english_name', resultIndex: 'hebrew'` מול ההפך — בלי לשכפל נתונים.

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

## 10. שדות ההגדרה של משחק ב-`apps.js`

| שדה | חובה? | תפקיד |
|-----|-------|-------|
| `type` | כן | `'app'` למשחק, `'menu'` לתיקייה |
| `appType` | כן (למשחק) | קובע איזה רכיב נטען (`mcq`, `spell`, ...) |
| `name` | כן | שם להצגה בתפריט (עברית) |
| `icon` | לא | שם אייקון Material (מוצג בחלק מהמסכים) |
| `listName` | כן | שם המערך ב-`DATA` |
| `questionIndex` | תלוי-סוג | שם השדה שמשמש כשאלה |
| `resultIndex` | תלוי-סוג | שם השדה שהוא התשובה הנכונה |
| `a` / `b` | ל-`common` | שמות שתי העמודות להתאמה |
| `setItems` | לא | כמה פריטים נפתחים בכל שלב (ברירת מחדל `1` דרך `getSetItems`; `0` = כל הפריטים פתוחים) |
| `questionType` | לא | דריסת `type` של שדה השאלה בהצגה (למשל `'speech'`) |
| `title` | לא | כותרת עליונה (בשימוש ב-`draw_letter`, `s2t`, `falling_answers`) |

---

## 11. פריפריה (טוב לדעת, לא חלק מחוזה המשחק)

- **PWA / אופליין:** `service-worker.js` + `manifest.json` נותנים התקנה כאפליקציה
  וטעינה אופליין. אחרי שינוי קבצים ייתכן שצריך לעדכן את גרסת ה-cache / להסיר
  רישום ל-service worker כדי לראות שינויים. שים לב ש-`data.js` נטען עם
  `?v=2` ב-`index.html` (cache-busting ידני).
- **אנליטיקס:** `gtag` (Google Analytics) שולח `page_view` בכל ניווט
  (`router.beforeEach`) ו-`question_answered` בכל תשובה (מתוך `updateWeightForKey`).
- **ערכות נושא:** `themes.js` מגדיר `themeOptions`; `getTheme()` מחזיר את הנבחרת.
  כל רכיב חושף `theme` ומשתמש ב-`theme.colors.*` ב-template.
- **משתמשים ומצבים:** `getUser()` (מ-`sessionStorage`), בחירת **מצב פעילות**
  (למידה/תרגול) דרך `setActivityMode` — שמשפיע על מפתח המשקלים (§7.3).

---

## 12. צ'קליסט להוספת משחק חדש (עם קוד)

1. הוסף את התוכן ל-`DATA` ב-`data.js` (מערך פריטים, שדות `{type, value}`).
2. בחר אופציה: שימוש חוזר ב-`appType` קיים (א'), ירושה מ-Base (ב'), או עצמאי (ג').
3. אם כותבים רכיב חדש: ממש `template` + `create()` + בדיקת תשובה, ירש מ-`BaseGameComponent`.
4. בכל תשובה קרא ל-`updateWeightForKey(appId, questionIndex, ±1)` ועדכן ניקוד.
5. עטוף המשך-זרימה ב-`if (this.reloadProgress())` כדי לכבד סיום שלב/ניווט.
6. רשום נתיב ב-`routes` בתבנית `/play/<appType>/:currentAppId`.
7. הוסף את ההגדרה לעץ ב-`apps.js` עם `appType` תואם (עדיף בסוף רשימה — §2).
8. אם הרכיב משתמש ב-DOM/אנימציה — נקה משאבים ב-`beforeDestroy()`.
9. השתמש רק בפונקציות האחסון של המערכת (לא ב-`localStorage` ישיר) כדי שהסנכרון יעבוד.
10. בדוק בדפדפן: מסך `/app`, הצגת news, תשובה נכונה/שגויה, פתיחת שלב, וניקוד.

---

## 13. סיכום החוזה במשפט אחד

משחק הוא רכיב Vue שנטען לפי `appType` מה-router, שואב פריט מ-`DATA` דרך מנוע
הבחירה המשוקלל, מציג שאלה, ובכל תשובה מדווח למערכת הלמידה דרך
`updateWeightForKey` + עדכון ניקוד + `reloadProgress` (שגם מנהל את מעבר השלבים
ומסכי ה-news). כל השמירה והסנכרון מתרחשים אוטומטית דרך `storage.js`/`firebase.js`.
הירושה מ-`BaseGameComponent` נותנת את כל זה כמעט בחינם.

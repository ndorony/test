// https://freesound.org/people/MattLeschuck/sounds/511484/
const successSound = new Audio("./sounds/success.mp3");
// https://freesound.org/people/Leszek_Szary/sounds/171672/
const failureSound = new Audio("./sounds/failure.mp3");
function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getNItmes(number) {
    return he.decode(Array(number + 1).join("&#128540; "))
}


function getUser() {
    return sessionStorage.getItem('username')
}

function getKey(key) {
    return `${key}_${getUser()}_LocalData`;
}


function setLocalStorage(key, value) {
    if (typeof value === "object") { // Check if value is an object/array
        value = JSON.stringify(value); // Convert object/array to JSON string
    }
    localStorage.setItem(getKey(key), value);
}

function getLocalStorage(key, defaultValue) {
    let value = localStorage.getItem(getKey(key));
    if (value === null) { // Key does not exist in localStorage
        return defaultValue; // Return the default value
    }
    try {
        return JSON.parse(value); // Try to parse the JSON string back to an object/array
    } catch (e) {
        return value; // Return the value as is if parsing fails
    }
}

function createAsymmetricExercises(upTo, inverseMathFunction) {
    const exercises = [];
    for (let i = 1; i <= upTo; i++) {
        for (let j = 1; j <= upTo; j++) {
            const { a, b, result, symbol } = inverseMathFunction(i, j);
            exercises.push({
                question: {"type": "text", "value": `${a} ${symbol} ${b} =`},
                answer: {"type": "text", "value": `${result}`}
            });
        }
    }
    return exercises;
}

function inverseAddition(a, b) {
    return { a, b, result: a + b, symbol: '+' };
}

function inverseSubtraction(a, b) {
    return {a:a + b, b, result: a, symbol: '-' };
}

function inverseMultiplication(a, b) {
    return {a, b, result: b * a, symbol: '*' };
}

function inverseDivision(a, b) {

//    if (b === 0) return { a: 0, b: 1, result: 0, symbol: '*' }; // Prevent invalid multiplication
    return {a:a * b, b, result: a, symbol: '/' };
}


function createCount(maxEmojis) {
    const emoji = '😊';
    const exercises = [];

    for (let i = 1; i <= maxEmojis; i++) {
        const questionEmojis = emoji.repeat(i);
        const exercise = {
            question: {"type": "text", "value": questionEmojis},
            answer: {"type": "text", "value": `${i}`}
        };
        exercises.push(exercise);
    }

    return exercises;
}


const DATA = {FEELING : [{'name': {'type': 'text', 'value': 'שמח'},
  'english_name': {'type': 'text_to_speech', 'value': 'Happy'},
  'hebrew_english_name': {'type': 'text', 'value': 'הַפִּי'},
  'emoji': {'type': 'text', 'value': '😊'}},
 {'name': {'type': 'text', 'value': 'עצוב'},
  'english_name': {'type': 'text_to_speech', 'value': 'Sad'},
  'hebrew_english_name': {'type': 'text', 'value': 'סֵד'},
  'emoji': {'type': 'text', 'value': '😢'}},
 {'name': {'type': 'text', 'value': 'כועס'},
  'english_name': {'type': 'text_to_speech', 'value': 'Angry'},
  'hebrew_english_name': {'type': 'text', 'value': 'אֵנְגְרִי'},
  'emoji': {'type': 'text', 'value': '😠'}},
 {'name': {'type': 'text', 'value': 'מפחד'},
  'english_name': {'type': 'text_to_speech', 'value': 'Scared'},
  'hebrew_english_name': {'type': 'text', 'value': 'סְקֵירְד'},
  'emoji': {'type': 'text', 'value': '😨'}},
 {'name': {'type': 'text', 'value': 'מאוהב'},
  'english_name': {'type': 'text_to_speech', 'value': 'In love'},
  'hebrew_english_name': {'type': 'text', 'value': 'אִין לָאב'},
  'emoji': {'type': 'text', 'value': '😍'}},
 {'name': {'type': 'text', 'value': 'מופתע'},
  'english_name': {'type': 'text_to_speech', 'value': 'Surprised'},
  'hebrew_english_name': {'type': 'text', 'value': 'סַרְפְּרִייזְד'},
  'emoji': {'type': 'text', 'value': '😮'}}],

VERBS : [{'verb_hebrew': {'type': 'text', 'value': 'ללכת'},
  'verb_english': {'type':  'text_to_speech', 'value': 'Walk'},
  'verb_hebrew_english': {'type': 'text', 'value': 'ווֹק'},
  'emoji': {'type': 'text', 'value': '🚶'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לרוץ'},
  'verb_english': {'type':  'text_to_speech', 'value': 'Run'},
  'verb_hebrew_english': {'type': 'text', 'value': 'רַן'},
  'emoji': {'type': 'text', 'value': '🏃'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לקפוץ'},
  'verb_english': {'type':  'text_to_speech', 'value': 'Jump'},
  'verb_hebrew_english': {'type': 'text', 'value': "גַ'ַמפּ"},
  'emoji': {'type': 'text', 'value': '🤾'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לשחות'},
  'verb_english': {'type':  'text_to_speech', 'value': 'Swim'},
  'verb_hebrew_english': {'type': 'text', 'value': 'סְווִים'},
  'emoji': {'type': 'text', 'value': '🏊'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לאכול'},
  'verb_english': {'type':  'text_to_speech', 'value': 'Eat'},
  'verb_hebrew_english': {'type': 'text', 'value': 'אִיט'},
  'emoji': {'type': 'text', 'value': '🍽️'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לשתות'},
  'verb_english': {'type':  'text_to_speech', 'value': 'Drink'},
  'verb_hebrew_english': {'type': 'text', 'value': 'דְרִינק'},
  'emoji': {'type': 'text', 'value': '🥤'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לשבת'},
  'verb_english': {'type':  'text_to_speech', 'value': 'Sit'},
  'verb_hebrew_english': {'type': 'text', 'value': 'סִיט'},
  'emoji': {'type': 'text', 'value': '🪑'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לעמוד'},
  'verb_english': {'type':  'text_to_speech', 'value': 'Stand'},
  'verb_hebrew_english': {'type': 'text', 'value': 'סְטֶנד'},
  'emoji': {'type': 'text', 'value': '🧍'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לשיר'},
  'verb_english': {'type':  'text_to_speech', 'value': 'Sing'},
  'verb_hebrew_english': {'type': 'text', 'value': 'סִינג'},
  'emoji': {'type': 'text', 'value': '🎤'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לצייר'},
  'verb_english': {'type':  'text_to_speech', 'value': 'Draw'},
  'verb_hebrew_english': {'type': 'text', 'value': 'דְרָו'},
  'emoji': {'type': 'text', 'value': '🎨'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לקרוא'},
  'verb_english': {'type':  'text_to_speech', 'value': 'Read'},
  'verb_hebrew_english': {'type': 'text', 'value': 'רִיד'},
  'emoji': {'type': 'text', 'value': '📖'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לכתוב'},
  'verb_english': {'type':  'text_to_speech', 'value': 'Write'},
  'verb_hebrew_english': {'type': 'text', 'value': 'רַייט'},
  'emoji': {'type': 'text', 'value': '✍️'}}],

COLORS : [{'color_hebrew': {'type': 'text', 'value': 'אדום'},
  'color_english': {'type': 'text_to_speech', 'value': 'Red'},
  'color_hebrew_english': {'type': 'text', 'value': 'רֵד'},
  'emoji': {'type': 'text', 'value': '🟥'}},
 {'color_hebrew': {'type': 'text', 'value': 'כחול'},
  'color_english': {'type': 'text_to_speech', 'value': 'Blue'},
  'color_hebrew_english': {'type': 'text', 'value': 'בְּלוּ'},
  'emoji': {'type': 'text', 'value': '🟦'}},
 {'color_hebrew': {'type': 'text', 'value': 'ירוק'},
  'color_english': {'type': 'text_to_speech', 'value': 'Green'},
  'color_hebrew_english': {'type': 'text', 'value': 'גְרִין'},
  'emoji': {'type': 'text', 'value': '🟩'}},
 {'color_hebrew': {'type': 'text', 'value': 'צהוב'},
  'color_english': {'type': 'text_to_speech', 'value': 'Yellow'},
  'color_hebrew_english': {'type': 'text', 'value': 'יֵלְלוֹ'},
  'emoji': {'type': 'text', 'value': '💛'}},
 {'color_hebrew': {'type': 'text', 'value': 'שחור'},
  'color_english': {'type': 'text_to_speech', 'value': 'Black'},
  'color_hebrew_english': {'type': 'text', 'value': 'בְּלֶק'},
  'emoji': {'type': 'text', 'value': '⬛'}},
 {'color_hebrew': {'type': 'text', 'value': 'לבן'},
  'color_english': {'type': 'text_to_speech', 'value': 'White'},
  'color_hebrew_english': {'type': 'text', 'value': 'וַוייט'},
  'emoji': {'type': 'text', 'value': '⬜'}},
 {'color_hebrew': {'type': 'text', 'value': 'ורוד'},
  'color_english': {'type': 'text_to_speech', 'value': 'Pink'},
  'color_hebrew_english': {'type': 'text', 'value': 'פִּינק'},
  'emoji': {'type': 'text', 'value': '🩷'}},
 {'color_hebrew': {'type': 'text', 'value': 'כתום'},
  'color_english': {'type': 'text_to_speech', 'value': 'Orange'},
  'color_hebrew_english': {'type': 'text', 'value': "אוֹרֵנְג'"},
  'emoji': {'type': 'text', 'value': '🟧'}},
 {'color_hebrew': {'type': 'text', 'value': 'סגול'},
  'color_english': {'type': 'text_to_speech', 'value': 'Purple'},
  'color_hebrew_english': {'type': 'text', 'value': 'פַּרְפֵּל'},
  'emoji': {'type': 'text', 'value': '🟪'}},
 {'color_hebrew': {'type': 'text', 'value': 'חום'},
  'color_english': {'type': 'text_to_speech', 'value': 'Brown'},
  'color_hebrew_english': {'type': 'text', 'value': 'בְּרָאון'},
  'emoji': {'type': 'text', 'value': '🟫'}}],

QUESTION : [{'question_word_hebrew': {'type': 'text', 'value': 'מה'},
  'question_word_english': {'type': 'text_to_speech',  'value': 'What'},
  'question_word_hebrew_english': {'type': 'text', 'value': 'וואַט'},
  'emoji': {'type': 'text', 'value': '❓'}},
 {'question_word_hebrew': {'type': 'text', 'value': 'מי'},
  'question_word_english': {'type': 'text_to_speech',  'value': 'Who'},
  'question_word_hebrew_english': {'type': 'text', 'value': 'הוּ'},
  'emoji': {'type': 'text', 'value': '👤'}},
 {'question_word_hebrew': {'type': 'text', 'value': 'מתי'},
  'question_word_english': {'type': 'text_to_speech',  'value': 'When'},
  'question_word_hebrew_english': {'type': 'text', 'value': 'ווען'},
  'emoji': {'type': 'text', 'value': '⏰'}},
 {'question_word_hebrew': {'type': 'text', 'value': 'איפה'},
  'question_word_english': {'type': 'text_to_speech',  'value': 'Where'},
  'question_word_hebrew_english': {'type': 'text', 'value': 'ווער'},
  'emoji': {'type': 'text', 'value': '📍'}},
 {'question_word_hebrew': {'type': 'text', 'value': 'למה'},
  'question_word_english': {'type': 'text_to_speech',  'value': 'Why'},
  'question_word_hebrew_english': {'type': 'text', 'value': 'וואַי'},
  'emoji': {'type': 'text', 'value': '🤔'}},
 {'question_word_hebrew': {'type': 'text', 'value': 'איך'},
  'question_word_english': {'type': 'text_to_speech','value': 'How'},
  'question_word_hebrew_english': {'type': 'text', 'value': 'האוּ'},
  'emoji': {'type': 'text', 'value': '🛠️'}}],


// The Alphabet records by tim.kahn - https://freesound.org/people/tim.kahn/packs/4371/
ABC:  [
    {
        englishUpperCase: {type: "text", value: "A"},
        englishLowerCase: {type: "text", value: "a"},
        hebrewTransliteration: {type: "text", value: "אֵי"},
        audio: {type: "audio", value: "./sounds/letters/a.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "B"},
        englishLowerCase: {type: "text", value: "b"},
        hebrewTransliteration: {type: "text", value: "בִי"},
        audio: {type: "audio", value: "./sounds/letters/b.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "C"},
        englishLowerCase: {type: "text", value: "c"},
        hebrewTransliteration: {type: "text", value: "סִי"},
        audio: {type: "audio", value: "./sounds/letters/c.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "D"},
        englishLowerCase: {type: "text", value: "d"},
        hebrewTransliteration: {type: "text", value: "דִי"},
        audio: {type: "audio", value: "./sounds/letters/d.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "E"},
        englishLowerCase: {type: "text", value: "e"},
        hebrewTransliteration: {type: "text", value: "אִי"},
        audio: {type: "audio", value: "./sounds/letters/e.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "F"},
        englishLowerCase: {type: "text", value: "f"},
        hebrewTransliteration: {type: "text", value: "אֵף"},
        audio: {type: "audio", value: "./sounds/letters/f.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "G"},
        englishLowerCase: {type: "text", value: "g"},
        hebrewTransliteration: {type: "text", value: "גִ׳י"},
        audio: {type: "audio", value: "./sounds/letters/g.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "H"},
        englishLowerCase: {type: "text", value: "h"},
        hebrewTransliteration: {type: "text", value: "אֵיְיץ'"},
        audio: {type: "audio", value: "./sounds/letters/h.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "I"},
        englishLowerCase: {type: "text", value: "i"},
        hebrewTransliteration: {type: "text", value: "אַי"},
        audio: {type: "audio", value: "./sounds/letters/i.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "J"},
        englishLowerCase: {type: "text", value: "j"},
        hebrewTransliteration: {type: "text", value: "גֵ'י"},
        audio: {type: "audio", value: "./sounds/letters/g.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "K"},
        englishLowerCase: {type: "text", value: "k"},
        hebrewTransliteration: {type: "text", value: "קֵי"},
        audio: {type: "audio", value: "./sounds/letters/q.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "L"},
        englishLowerCase: {type: "text", value: "l"},
        hebrewTransliteration: {type: "text", value: "אֶל"},
        audio: {type: "audio", value: "./sounds/letters/l.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "M"},
        englishLowerCase: {type: "text", value: "m"},
        hebrewTransliteration: {type: "text", value: "אֶם"},
        audio: {type: "audio", value: "./sounds/letters/m.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "N"},
        englishLowerCase: {type: "text", value: "n"},
        hebrewTransliteration: {type: "text", value: "אֶן"},
        audio: {type: "audio", value: "./sounds/letters/n.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "O"},
        englishLowerCase: {type: "text", value: "o"},
        hebrewTransliteration: {type: "text", value: "אוֹ"},
        audio: {type: "audio", value: "./sounds/letters/o.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "P"},
        englishLowerCase: {type: "text", value: "p"},
        hebrewTransliteration: {type: "text", value: "פִּי"},
        audio: {type: "audio", value: "./sounds/letters/p.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "Q"},
        englishLowerCase: {type: "text", value: "q"},
        hebrewTransliteration: {type: "text", value: "קְיוּ"},
        audio: {type: "audio", value: "./sounds/letters/q.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "R"},
        englishLowerCase: {type: "text", value: "r"},
        hebrewTransliteration: {type: "text", value: "אַר"},
        audio: {type: "audio", value: "./sounds/letters/r.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "S"},
        englishLowerCase: {type: "text", value: "s"},
        hebrewTransliteration: {type: "text", value: "אֶס"},
        audio: {type: "audio", value: "./sounds/letters/s.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "T"},
        englishLowerCase: {type: "text", value: "t"},
        hebrewTransliteration: {type: "text", value: "טִי"},
        audio: {type: "audio", value: "./sounds/letters/t.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "U"},
        englishLowerCase: {type: "text", value: "u"},
        hebrewTransliteration: {type: "text", value: "יוּ"},
        audio: {type: "audio", value: "./sounds/letters/u.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "V"},
        englishLowerCase: {type: "text", value: "v"},
        hebrewTransliteration: {type: "text", value: "וִי"},
        audio: {type: "audio", value: "./sounds/letters/v.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "W"},
        englishLowerCase: {type: "text", value: "w"},
        hebrewTransliteration: {type: "text", value: "דַאבְּלְיוּ"},
        audio: {type: "audio", value: "./sounds/letters/w.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "X"},
        englishLowerCase: {type: "text", value: "x"},
        hebrewTransliteration: {type: "text", value: "אֶקְס"},
        audio: {type: "audio", value: "./sounds/letters/x.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "Y"},
        englishLowerCase: {type: "text", value: "y"},
        hebrewTransliteration: {type: "text", value: "וַוי"},
        audio: {type: "audio", value: "./sounds/letters/y.mp3"}
    },
    {
        englishUpperCase: {type: "text", value: "Z"},
        englishLowerCase: {type: "text", value: "z"},
        hebrewTransliteration: {type: "text", value: "זד"},
        audio: {type: "audio", value: "./sounds/letters/z.mp3"}
    },
],
MONTHS: [
  {"name": {"type": "text", "value": "ינואר"}, "english_name": {"type": "text", "value": "January"}, "month_number": {"type": "text", "value": "1"}},
  {"name": {"type": "text", "value": "פברואר"}, "english_name": {"type": "text", "value": "February"}, "month_number": {"type": "text", "value": "2"}},
  {"name": {"type": "text", "value": "מרץ"}, "english_name": {"type": "text", "value": "March"}, "month_number": {"type": "text", "value": "3"}},
  {"name": {"type": "text", "value": "אפריל"}, "english_name": {"type": "text", "value": "April"}, "month_number": {"type": "text", "value": "4"}},
  {"name": {"type": "text", "value": "מאי"}, "english_name": {"type": "text", "value": "May"}, "month_number": {"type": "text", "value": "5"}},
  {"name": {"type": "text", "value": "יוני"}, "english_name": {"type": "text", "value": "June"}, "month_number": {"type": "text", "value": "6"}},
  {"name": {"type": "text", "value": "יולי"}, "english_name": {"type": "text", "value": "July"}, "month_number": {"type": "text", "value": "7"}},
  {"name": {"type": "text", "value": "אוגוסט"}, "english_name": {"type": "text", "value": "August"}, "month_number": {"type": "text", "value": "8"}},
  {"name": {"type": "text", "value": "ספטמבר"}, "english_name": {"type": "text", "value": "September"}, "month_number": {"type": "text", "value": "9"}},
  {"name": {"type": "text", "value": "אוקטובר"}, "english_name": {"type": "text", "value": "October"}, "month_number": {"type": "text", "value": "10"}},
  {"name": {"type": "text", "value": "נובמבר"}, "english_name": {"type": "text", "value": "November"}, "month_number": {"type": "text", "value": "11"}},
  {"name": {"type": "text", "value": "דצמבר"}, "english_name": {"type": "text", "value": "December"}, "month_number": {"type": "text", "value": "12"}}
],
ADDITION: createAsymmetricExercises(10, inverseAddition, "ADDITION"),
SUBTRACTION: createAsymmetricExercises(10, inverseSubtraction, "SUBTRACTION"),
MULTIPLICATION: createAsymmetricExercises(10, inverseMultiplication, "MULTIPLICATION"),
DIVISION: createAsymmetricExercises(10, inverseDivision, "DIVISION"),
COUNT: createCount(5),
}



function render(object) {
    switch (object.type) {
        case "text":
            return object.value;
        case "audio":
        return `<a class="brand-logo" onclick="audio('${object.value}')"><span class="material-icons">play_circle_filled</span></a>`;
        case "text_to_speech":
            return `<a class="brand-logo" onclick="text_to_speech('${object.value}')">${object.value}</a>`;
        default:
            return null;
    }
}

function audio(url){
    const sound = new Audio(url);
    sound.play();
}

function text_to_speech(text){
    var msg = new SpeechSynthesisUtterance();
    msg.text = text;
    msg.lang = "en_US";
    msg.rate = 0.7;
    window.speechSynthesis.speak(msg);
}

function text_to(text){
    var msg = new SpeechSynthesisUtterance();
    msg.text = text;
    window.speechSynthesis.speak(msg);
}
text_to("a")


const getDataList = (listName) => {
    if (!DATA[listName]) {
        throw new Error('List does not exist');
    }
    return DATA[listName];
}

function getWeightsKey(key){
    return getKey(`${key}_Weights`)
}

function getProgress(key, total){
    return getLocalStorage(`${key}_Progress`, {progress:0,
                                               total:total});
}

function setProgress(key, total, progress){
    return setLocalStorage(`${key}_Progress`, {progress: progress,
                                               total: total});
}

function setCurrentLevelProgress(key, weights){
    weights = weights.filter(number => number >= 0);
    currentState = weights.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    levelProgress = getCurrentLevelProgress(key, currentState);
    levelProgress.total = Math.max(levelProgress.total, currentState);
    levelProgress.progress = levelProgress.total - currentState;
    return setLocalStorage(`${key}_CurrentLevelProgress`, levelProgress);
}

function getCurrentLevelProgress(key, currentState=1){
    return getLocalStorage(`${key}_CurrentLevelProgress`, {progress: 0,
                                                           total: currentState});
}

const updateWeights = (key, weights, setItems) => {
    // Check if the list contains 0 and all numbers are less than 2
    const containsSign = weights.includes(-1);
    const allZero = weights.every(weight => weight < 1);

    if (allZero){

    if (containsSign) {
        // Convert all zero weights to 2
        weights = weights.map(weight => weight === 0 ? 2 : weight);

        // Set the first setItems elements that are 0 to 5
        let count = 0;
        for (let i = 0; i < weights.length && count < setItems; i++) {
            if (weights[i] === -1) {
                weights[i] = 5;
                count++;
            }
        }
    } else {
        weights = weights.map(() => 5);
    }

    setProgress(key, weights.length,
                weights.filter(function(number) { return number > -1;}).length);
    setCurrentLevelProgress(key, weights);
    }
    return weights;
}

const getWeightsForKey = (key, setItems, elements, skipNotRelevant=false) => {
    // Check if weights already exist in localStorage
    const storedWeights = localStorage.getItem(getWeightsKey(key));
    if (storedWeights) {
        let weights = JSON.parse(storedWeights);
        if (setItems){
            newWeights = updateWeights(key, weights, setItems);
            if (newWeights) {
                weights = newWeights;
                localStorage.setItem(getWeightsKey(key), JSON.stringify(weights));

            }
        }
        if (skipNotRelevant){
            weights =  weights.filter(number => number >= 0);
        }
        return weights;
    }

    // Initialize weights based on the mode
    let weights;
    if (setItems === 0) {
        // All elements get a fixed weight of 5
        weights = elements.map(() => 5);
    } else {
        // All elements get -1 except the first which gets 5
        weights = elements.map((_, index) => index < setItems ? 5 : -1);
        setProgress(key, weights.length,
                    weights.filter(function(number) { return number > -1;}).length);
    }

    // Store the generated weights in localStorage
    localStorage.setItem(getWeightsKey(key), JSON.stringify(weights));
    setCurrentLevelProgress(key, weights);
    return weights;
}

function getScore(currentAppId){
    return getLocalStorage(`score${currentAppId}`, 0);
}

const updateWeightForKey = (key, index, change) => {
    // Retrieve the current weights from localStorage
    const storedWeights = localStorage.getItem(getWeightsKey(key));
    if (!storedWeights) {
        return
    }

    // Parse the stored weights
    const weights = JSON.parse(storedWeights);

    // Update the weight with the given change and ensure it stays within bounds
    weights[index] = Math.max(0, Math.min(weights[index] + change, 15));

    // Store the updated weights back in localStorage
    localStorage.setItem(getWeightsKey(key), JSON.stringify(weights));

    setCurrentLevelProgress(key, weights);

    return weights;
}

// Function to select a weighted random index
const getWeightedRandomIndex = (list, key, setItems) => {
    const weights = getWeightsForKey(key, setItems, list, skipNotRelevant=true);

    const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
    const randomWeight = Math.random() * totalWeight;

    let weightSum = 0;
    for (let i = 0; i < weights.length; i++) {
        weightSum += weights[i];
        if (randomWeight < weightSum) {
            return i;
        }
    }
}

// Function to select additional random indexes excluding a specific index
const getRandomIndexesExcluding = (list, resultIndex, excludeIndex, count = 3) => {
    const length = list.length;
    const resultsIndexes = [];
    const results = [];

    while (resultsIndexes.length < count) {
        const randomIndex = Math.floor(Math.random() * length);
        if (randomIndex !== excludeIndex && !results.includes(list[randomIndex][resultIndex]['value'])) {
            resultsIndexes.push(randomIndex);
            results.push(list[randomIndex][resultIndex]['value']);
        }
    }

    return resultsIndexes;
}

const generateOptions = (list, resultIndexes, resultFieldIndex) => {
    return resultIndexes.map(index => render(list[index][resultFieldIndex]));
}

function generateQuestion(list, index, questionIndex, action) {
    const question = list[index][questionIndex];
    if (question.type === "audio") {
        action = () => audio(question.value);
    } else if (question.type === "text_to_speech") {
        action = () => text_to_speech(question.value);
    }
    return action;
}

function generateFromList(listName, questionIndex, resultIndex, key, setItems=1) {
    const list = getDataList(listName);

    // Select a question using weighted random selection
    const weightedRandomIndex = getWeightedRandomIndex(list, key, setItems);

    // Select three additional answers excluding weights
    const additionalIndexes = getRandomIndexesExcluding(list, resultIndex, weightedRandomIndex);

    // Combine the question index with the additional answer indexes
    const resultsIndexes = [weightedRandomIndex, ...additionalIndexes];
    const options = generateOptions(list, resultsIndexes, resultIndex);

    const result = render(list[weightedRandomIndex][resultIndex]);
    const question = render(list[weightedRandomIndex][questionIndex]);
    let action = () => {};

    action = generateQuestion(list, weightedRandomIndex, questionIndex, action);

    return {
        result: result,
        options: options,
        question: question,
        action: action,
        questionIndex: weightedRandomIndex,
    };
}

apps =  {
    name: 'main',
    type: 'menu',
    items: [
    {
      name: 'אנגלית',
      type: 'menu',
      items: [
        {icon: 'format_shapes', name:'צבעים', type: 'app', listName: 'COLORS', questionIndex: 'color_english', resultIndex: 'emoji' },
        {icon: 'format_shapes', name:'פעולות', type: 'app', listName: 'VERBS', questionIndex: 'verb_english', resultIndex: 'verb_hebrew'},
        {icon: 'format_shapes', name:'רגשות', type: 'app', listName: 'FEELING', questionIndex: 'english_name', resultIndex: 'emoji'},
        {icon: 'format_shapes', name:'רגשות', type: 'app', listName: 'FEELING', questionIndex: 'name', resultIndex: 'hebrew_english_name'},
        {icon: 'format_shapes', name:'מילות שאלה', type: 'app', listName: 'QUESTION', questionIndex: 'question_word_english', resultIndex: 'question_word_hebrew' },
        {icon: 'format_shapes', name:'שם לאות', type: 'app', listName: 'ABC', questionIndex: 'hebrewTransliteration', resultIndex: 'englishLowerCase' },
        {icon: 'format_shapes', name:'אות לשם', type: 'app', listName: 'ABC', questionIndex: 'englishLowerCase', resultIndex: 'hebrewTransliteration' },
        {icon: 'volume_up', name:'שמע לאות', type: 'app', listName: 'ABC', questionIndex: 'audio', resultIndex: 'englishLowerCase' },
        {icon: 'format_size', name:'אות קטנה לגדולה', type: 'app', listName: 'ABC', questionIndex: 'englishLowerCase', resultIndex: 'englishUpperCase' },
        {icon: 'format_size', name:'אות גדולה לקטנה', type: 'app', listName: 'ABC', questionIndex: 'englishUpperCase', resultIndex: 'englishUpperCase' },
      ]
    },
    {
      name: 'חשבון',
      type: 'menu',
      items: [
        {icon: 'add_circle_outline', name:'חיבור', type: 'app', listName: 'ADDITION', questionIndex: 'question', resultIndex: 'answer', setItems: 10},
        {icon: 'remove_circle_outline', name:'חיסור', type: 'app', listName: 'SUBTRACTION', questionIndex: 'question', resultIndex: 'answer', setItems: 10 },
        {icon: 'add_circle_outline', name:'כפל', type: 'app', listName: 'MULTIPLICATION', questionIndex: 'question', resultIndex: 'answer', setItems: 10},
        {icon: 'remove_circle_outline', name:'חילוק', type: 'app', listName: 'DIVISION', questionIndex: 'question', resultIndex: 'answer', setItems: 10},
        {icon: 'format_list_numbered', name:'ספירה', type: 'app', listName: 'COUNT', questionIndex: 'question', resultIndex: 'answer'},
      ]
    },
    {
      name: 'ידע כללי',
      type: 'menu',
      items: [
        {icon: 'format_size', name:'חודשי השנה', type: 'app', listName: 'MONTHS', questionIndex: 'name', resultIndex: 'month_number'},
      ]
    }
  ]
};


function getItemById(currentItem, id) {
  // Split the ID into an array of indices
  const indices = id.split('_').map(Number);

  // Recursively traverse the items structure
  for (const index of indices) {
    if (!currentItem || !currentItem.hasOwnProperty('items')) {
      return null; // Item not found
    }

    currentItem = currentItem.items[index];
  }

  // Return the found item
  return currentItem;
}

var AppComponent = Vue.component('app',{
    template: `<div>

    <div class="container">
        <div class="row">
            <h3 v-html="exercise"></h3>
        </div>
        <div class="row">
            <a class="waves-effect waves-light btn-large result"
               v-for="(result, index) in results"
               v-on:click="check(index)">{{ result }}</a>

        </div>
        <div class="row" dir="rtl">
            <h2 v-bind:class="{ 'error': message.error, 'success': message.success }">{{ message.value }}</h2>
        </div>
        <div class="row"><h3>{{ score }}</h3></div>
        <p>Current Level: {{ progress.progress }}/{{ progress.total }}</p>
                <div class="progress">
                  <div class="determinate" :style="{ width: ((progress.progress / progress.total) * 100) + '%' }"></div>
        </div>
    </div></div>`,

    data: function() { return {
        saved: [],
        result: 0,
        exercise: '',
        message: {},
        ended: false,
        score: 0,
        currentAppId: null,
        questionIndex: null,
        progress: null,
    }},

    methods: {
        saveApp: function(appId){
          if (this.saved.includes(appId)) {
              return
          }
          appList = getLocalStorage('appList', []);
          appList.push(appId);
          setApp = new Set(appList);
          setLocalStorage('appList', [...setApp]);
          this.saved.push(appId);
        },
        create: function (code) {
            this.saved = []

            let question = generateFromList(this.currentApp.listName, this.currentApp.questionIndex, this.currentApp.resultIndex, this.currentAppId,
                                            this.currentApp.hasOwnProperty('setItems') ? this.currentApp['setItems'] : 1);
            this.results = this.shuffle(question.options);
            this.exercise = question.question;
            this.result = question.result;
            this.questionIndex = question.questionIndex;
            question.action();
            this.reloadProgress();
            this.$forceUpdate();
            setTimeout(() => {
            this.ended = false;
            }, 500);
        }, reloadProgress: function(){
            this.progress = getCurrentLevelProgress(this.currentAppId);
        }, shuffle: function (a) {
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }, check: function (index) {
            if (this.ended){

            }
            else if (this.results[index] === this.result) {
                this.ended = true;
                this.message = {value: this.getSuccessMsg(), success: true};
                successSound.play();
                updateWeightForKey(this.currentAppId, this.questionIndex, -1)
                setTimeout(this.create, 1000)
                this.score += 1;
                this.reloadProgress();
                this.saveScore();
            } else {
                failureSound.play();
                this.score = Math.max(0, this.score - 1);
                this.saveScore();
                updateWeightForKey(this.currentAppId, this.questionIndex, 1)
                this.message = {value: 'נסה שוב :(', error: true}
                this.reloadProgress();
            }
        }, next: function () {
            if (this.ended) {
                this.create();
            }
        }, getSuccessMsg: function () {
            return he.decode("הצלחת &#128525;");
        }, updateScore: function(){
            this.score = getScore(this.currentAppId);
        }, saveScore: function(){
            setLocalStorage(`score${this.currentAppId}`, this.score);
        }
    },

    created: function () {
        this.currentAppId = this.$route.params.currentAppId
        this.currentApp = getItemById(apps, this.currentAppId);
        this.updateScore();
        this.create();
        this.saveApp(this.currentAppId);
    },
})

var MenuComponent = Vue.component('menu',{
    template: `
   <div>
   <div container>
    <div class="row">
      <div v-for="(app, index) in menu.items" :key="index" class="col s8 offset-s2">
        <!-- Each app as a button -->
        <router-link :to="getLink(app, index)" class="waves-effect waves-light btn-large result blue-grey lighten-1" style="width: 100%; margin-bottom: 20px;">
          {{ app.name }}
        </router-link>
      </div>
    </div>
   </div>

    </div>`,
    data: function(){
        return {
         menu: null,
        }
    },
    created: function(){
        this.init();
    },
    watch: {
        '$route.params.currentMenu': {
          handler(newVal, oldVal) {
            this.menu = null;
            this.init();
          },
        },
      },
    methods: {
      init: function(){
        currentMenu = this.$route.params.currentMenu;
        if (!currentMenu){
            this.menu = apps;
            return
        }
        this.menu = getItemById(apps, currentMenu);
      }, getLink: function(app, id){
        menu = this.menu;
        route = this.$route.params.currentMenu;
        link = `/${app.type}/${route}_${id}`;
        if (!route) {
          link = `/${app.type}/${id}`;
        }
        if (menu === this.menu && route === this.$route.params.currentMenu){
            return link;
        }
        return $route.path;
      },
    }
})

var UserComponent = Vue.component('user', {
  template: `
    <div>
      <div container>
        <div class="row">
          <div class="col s8 offset-s2">
            <h4>{{ name }}</h4>
            <div v-for="(app, index) in apps" :key="index" class="card">
              <div class="card-content">
                <span class="card-title"><router-link :to="'/app/' + app.id" style="width: 100%; margin-bottom: 20px;">{{ app.name }}</router-link></span>
                <p>Score: {{ app.score }}</p>
                <p>Progress: {{ app.progress.progress }}/{{ app.progress.total }}</p>
                <div class="progress">
                  <div class="determinate" :style="{ width: ((app.progress.progress / app.progress.total) * 100) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data: function() {
    return {
        name: '',
        apps: []
    }
  },
  created: function() {
    this.name = getUser();
    userApps = [];
    appList = getLocalStorage('appList', []);
    appList.forEach(function(appId, index) {
      name = getItemById(apps, appId).name
      score = getScore(appId);
      progress = getProgress(appId, 1);
      userApps.push({id: appId,
                     name: name,
                     score: score,
                     progress: progress})
    });
    this.apps = userApps;
  },
  methods: {

  }
});


const SignUp = {
  template: `
    <div>
      <div class="row">
        <div class="col s4 offset-s4">
        הרשמה
        <div>
          <label for="username">שם משתמש:</label>
          <input type="text" id="username" v-model="username">
        </div>
        </div>
      </div>
      <div class="row">
        <div class="col s4 offset-s4">
          <a class="waves-effect waves-light btn-large result blue-grey lighten-1" @click="SignUp">הרשם</a>
        </div>
        </div>
    </div>
  `,
  data() {
    return {
      username: ''
    };
  },
  methods: {
    SignUp() {
      if (this.username) {
        sessionStorage.setItem('username', this.username);
        users = JSON.parse(localStorage.getItem('users')) || [];
        users.push(this.username);
        localStorage.setItem('users', JSON.stringify(users));
        this.$router.push('/');
      } else {
        alert('הכנס שם משתמש');
      }
    }
  }
};

const Login = {
  template: `
    <div>
    <div class="row">
      <div class="col s4 offset-s4">
        <select id="selectUser" v-model="selectedUser" class="browser-default">
          <option v-for="user in users" :key="user">{{ user }}</option>
        </select>
        <label for="selectUser">בחר משתמש</label>
      </div>
    </div>
    <div class="row">
      <div class="col s4 offset-s4">
        <a class="waves-effect waves-light btn-large result blue-grey lighten-1" @click="login" style="width: 100%; margin-bottom: 20px;">התחבר</a>
        <router-link to="/signUp" class="waves-effect waves-light btn-large result blue-grey lighten-1" style="width: 100%; margin-bottom: 20px;">הרשם</router-link>
      </div>
    </div>
  </div>
  `,
  data() {
    return {
      selectedUser: '',
      users: null
    };
  },
    created: function() {
    this.users = JSON.parse(localStorage.getItem('users')) || [];
    if (this.users.length === 0) {
      this.$router.push('/signUp');
    }
  },
  methods: {
    login() {
      if (this.selectedUser) {
        sessionStorage.setItem('username', this.selectedUser);
        this.$forceUpdate();
        this.$router.push('/');
      } else {
        alert('בחר שם משתמש');
      }
    }
  }
};


const routes = [
    {path: '/', component: MenuComponent,},
    {path: '/user', component: UserComponent},
    {path: '/menu/:currentMenu', component: MenuComponent,},
    {path: '/app/:currentAppId', component: AppComponent, props: true },
    {path: '/signUp', component: SignUp},
    {path: '/login', component: Login },
]

const router = new VueRouter({
    routes
})

router.afterEach((to, from) => {
  gtag('config', 'YOUR_TRACKING_ID', {
    page_path: to.fullPath,
  });
});

router.beforeEach((to, from, next) => {
  const username = getUser();
  if (this.app){
    this.app.$root.username = username
  }
  if (to.path === '/signUp'){
      next();
  } else if (!username && to.path !== '/login') {
    next('/login');
  } else if (username && to.path === '/login') {
    next('/');
  } else {
    next();
  }
});


var app = new Vue({
    router,
    data() {
        return {
          username: getUser()
        };
      },

    methods: {
        UserLogout() {
           sessionStorage.removeItem('username');
           this.username = null;
           this.$router.push('/login');
        }
    },
    created: {
        username: function(){
            return getUser();
        }
    },
    mounted() {
        version = localStorage.getItem('version');
        if (!version){
            localStorage.clear();
        }
        localStorage.setItem('version', 0.1)
       document.getElementById('loading-screen').classList.add('hidden');
    }
}).$mount('#app')

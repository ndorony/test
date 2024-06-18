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
        return `<a href="#!" class="brand-logo" onclick="audio('${object.value}')"><span class="material-icons">play_circle_filled</span></a>`;
        case "text_to_speech":
            return `<a href="#!" class="brand-logo" onclick="text_to_speech('${object.value}')">${object.value}</a>`;
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
    msg.lang = "en_US"
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

const getRandomIndexes = (length, count = 4) => {
    const results = [];
    while (results.length < count) {
        const randomIndex = Math.floor(Math.random() * length);
        if (!results.includes(randomIndex)) {
            results.push(randomIndex);
        }
    }
    return results;
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

function generateFromList(listName, questionIndex, resultIndex) {
    const list = getDataList(listName);
    const resultsIndexes = getRandomIndexes(list.length);
    const options = generateOptions(list, resultsIndexes, resultIndex);

    const randomResultIndex = resultsIndexes[Math.floor(Math.random() * resultsIndexes.length)];
    const result = render(list[randomResultIndex][resultIndex]);
    const question = render(list[randomResultIndex][questionIndex]);
    let action = () => {};

    action = generateQuestion(list, randomResultIndex, questionIndex, action);

    return {
        result: result,
        options: options,
        question: question,
        action: action
    };
}

function feelingName(){
   return generateFromList('FEELING', "name", "hebrew_english_name");
}

function feelingEmoji(){
   return generateFromList('FEELING', "english_name", "emoji");
}


function lowerToCapital() {
    return generateFromList('ABC', "englishLowerCase", "englishUpperCase");
}

function capitalToLower() {
    return generateFromList('ABC', "englishUpperCase", "englishUpperCase");
}

function letterToName() {
    return generateFromList('ABC', "englishLowerCase", "hebrewTransliteration");
}

function nameToLetter() {
    return generateFromList('ABC', "hebrewTransliteration", "englishLowerCase");
}

function audioToLetter() {
    return generateFromList('ABC', "audio", "englishLowerCase");
}


function verbsNameToHe() {
    return generateFromList('VERBS', "verb_english", "verb_hebrew");
}

function colorNameToColor(){
    return generateFromList('COLORS', "color_english", "emoji");
}

function questionNameToHe(){
    return generateFromList('QUESTION', "question_word_english", "question_word_hebrew");
}

function monthName(){
    return generateFromList('MONTHS', 'name', 'month_number')
}

function addition() {
    return generateFromList('ADDITION', 'question', 'answer');
}

function subtraction() {
    return generateFromList('SUBTRACTION', 'question', 'answer');
}

function multiplication() {
    return generateFromList('MULTIPLICATION', 'question', 'answer');
}

function division() {
    return generateFromList('DIVISION', 'question', 'answer');
}

function count() {
    return generateFromList('COUNT', 'question', 'answer');
}

apps =  {
    name: 'main',
    type: 'menu',
    items: [
    {
      name: 'אנגלית',
      type: 'menu',
      items: [
        {icon: 'format_shapes', func: colorNameToColor, name:'צבעים', type: 'app'},
        {icon: 'format_shapes', func: verbsNameToHe, name:'פעולות', type: 'app'},
        {icon: 'format_shapes', func: feelingEmoji, name:'רגשות', type: 'app'},
        {icon: 'format_shapes', func: feelingName, name:'רגשות', type: 'app'},
        {icon: 'format_shapes', func: questionNameToHe, name:'שאלות', type: 'app'},
        {icon: 'format_shapes', func: nameToLetter, name:'זהה את האות', type: 'app'},
        {icon: 'format_shapes', func: letterToName, name:'זהה את האות', type: 'app'},
        {icon: 'volume_up', func: audioToLetter, name:'זהה את האות', type: 'app'},
        {icon: 'format_size', func: lowerToCapital, name:'אות קטנה לגדולה', type: 'app'},
        {icon: 'format_size', func: capitalToLower, name:'אות גדולה לקטנה', type: 'app'},
      ]
    },
    {
      name: 'חשבון',
      type: 'menu',
      items: [
        {icon: 'add_circle_outline', func: addition, name:'חיבור', type: 'app'},
        {icon: 'remove_circle_outline', func: subtraction, name:'חיסור', type: 'app'},
        {icon: 'add_circle_outline', func: multiplication, name:'כפל', type: 'app'},
        {icon: 'remove_circle_outline', func: division, name:'חילוק', type: 'app'},
        {icon: 'format_list_numbered', func: count, name:'ספירה', type: 'app'},
      ]
    },
    {
      name: 'ידע כללי',
      type: 'menu',
      items: [
        {icon: 'format_size', func: monthName, name:'חודשי השנה', type: 'app'},
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
    </div></div>`,

    data: function() { return {
        result: 0,
        exercise: '',
        message: {},
        ended: false,
        score: 0,
        currentAppId: null
    }},

    methods: {
        create: function (code) {
            this.ended = false;
            let question = this.currentApp.func();
            this.results = this.shuffle(question.options);
            this.exercise = question.question;
            this.result = question.result;
            question.action();
            this.ended = false;
            this.$forceUpdate();
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
                setTimeout(this.create, 1000)
                this.score += 1;
                this.saveScore();
            } else {
                failureSound.play();
                this.score = Math.max(0, this.score - 1);
                this.saveScore();
                this.message = {value: 'נסה שוב :(', error: true}
            }
        }, next: function () {
            if (this.ended) {
                this.create()
            }
        }, getSuccessMsg: function () {
            return he.decode("הצלחת &#128525;");
        }, getScore: function(){
            this.score = getLocalStorage(`score${this.currentAppId}`, 0);
        }, saveScore: function(){
            setLocalStorage(`score${this.currentAppId}`, this.score);
        }
    },

    created: function () {
        this.currentAppId = this.$route.params.currentAppId
        this.currentApp = getItemById(apps, this.currentAppId);
        this.getScore();
        this.create();
    },
})

var MenuComponent = Vue.component('menu',{
    template: `
   <div>
   <div container>
    <div class="row">
      <div v-for="(app, index) in menu.items" :key="index" class="col s8 offset-s2">
        <!-- Each app as a button -->
        <router-link :to="'/' + app.type + '/' + prefix + index" class="waves-effect waves-light btn-large result blue-grey lighten-1" style="width: 100%; margin-bottom: 20px;">
          {{ app.name }}
        </router-link>
      </div>
    </div>
   </div>

    </div>`,
    data: function(){
        return {
         menu: null,
         prefix: ''
        }
    },
    created: function(){
        this.init();
    },
    watch: {
        '$route.params.currentMenu': {
          handler(newVal, oldVal) {
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
        this.prefix = `${currentMenu}_`;
        this.menu = getItemById(apps, currentMenu);
      }
    }
})

const SignUp = {
  template: `
    <div>
      <div class="row">
        <div class="col s4 offset-s4">
        Sign Up
        <div>
          <label for="username">Username:</label>
          <input type="text" id="username" v-model="username">
        </div>
        </div>
      </div>
      <div class="row">
        <div class="col s4 offset-s4">
          <a class="waves-effect waves-light btn-large result blue-grey lighten-1" @click="SignUp">Sign up</a>
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
        alert('Please enter a username');
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
        <label for="selectUser">Select User</label>
      </div>
    </div>
    <div class="row">
      <div class="col s4 offset-s4">
        <a class="waves-effect waves-light btn-large result blue-grey lighten-1" @click="login" style="width: 100%; margin-bottom: 20px;">Login</a>
        <router-link to="/signUp" class="waves-effect waves-light btn-large result blue-grey lighten-1" style="width: 100%; margin-bottom: 20px;">Sign Up</router-link>
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
        alert('Please select a user or enter a username');
      }
    }
  }
};


const routes = [
    {path: '/', component: MenuComponent,},
    {path: '/menu/:currentMenu', component: MenuComponent,},
    {path: '/app/:currentAppId', component: AppComponent, props: true },
    {path: '/signUp', component: SignUp},
    {path: '/login', component: Login },
]

const router = new VueRouter({
    routes
})

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
    }
}).$mount('#app')

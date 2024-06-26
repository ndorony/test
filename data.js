
function createAsymmetricExercises(upTo, inverseMathFunction) {
    const exercises = [];
    for (let i = 1; i <= upTo; i++) {
        for (let j = 1; j <= upTo; j++) {
            const { a, b, result, symbol } = inverseMathFunction(i, j);
            exercises.push({
                question: {"type": "text", "value": `${a} ${symbol} ${b} =`},
                answer: {"type": "text", "value": `${result}`},
                id: {"type": "text", "value": `${i}`},
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
            answer: {"type": "text", "value": `${i}`},
            name: {"type": "text", "value": `${i}`}
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

ANIMALS : [
  {
    "hebrew": {
      "type": "text",
      "value": "כלב"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Dog"
    },
    "hebrew_english": {
      "type": "text",
      "value": "דוֹג"
    },
    "emoji": {
      "type": "text",
      "value": "🐕"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "חתול"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Cat"
    },
    "hebrew_english": {
      "type": "text",
      "value": "קָט"
    },
    "emoji": {
      "type": "text",
      "value": "🐈"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "פרה"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Cow"
    },
    "hebrew_english": {
      "type": "text",
      "value": "קָאוּ"
    },
    "emoji": {
      "type": "text",
      "value": "🐄"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "סוס"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Horse"
    },
    "hebrew_english": {
      "type": "text",
      "value": "הוֹרס"
    },
    "emoji": {
      "type": "text",
      "value": "🐎"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "כבשה"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Sheep"
    },
    "hebrew_english": {
      "type": "text",
      "value": "שִׁיפּ"
    },
    "emoji": {
      "type": "text",
      "value": "🐑"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "תרנגול"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Rooster"
    },
    "hebrew_english": {
      "type": "text",
      "value": "רוּסטֵר"
    },
    "emoji": {
      "type": "text",
      "value": "🐓"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "ברווז"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Duck"
    },
    "hebrew_english": {
      "type": "text",
      "value": "דָק"
    },
    "emoji": {
      "type": "text",
      "value": "🦆"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "דג"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Fish"
    },
    "hebrew_english": {
      "type": "text",
      "value": "פִישׁ"
    },
    "emoji": {
      "type": "text",
      "value": "🐠"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "ארנב"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Rabbit"
    },
    "hebrew_english": {
      "type": "text",
      "value": "רָבִּיט"
    },
    "emoji": {
      "type": "text",
      "value": "🐰"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "צפרדע"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Frog"
    },
    "hebrew_english": {
      "type": "text",
      "value": "פרוֹג"
    },
    "emoji": {
      "type": "text",
      "value": "🐸"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "פרפר"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Butterfly"
    },
    "hebrew_english": {
      "type": "text",
      "value": "בָּטֵרפלָי"
    },
    "emoji": {
      "type": "text",
      "value": "🦋"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "דבורה"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Bee"
    },
    "hebrew_english": {
      "type": "text",
      "value": "בִּי"
    },
    "emoji": {
      "type": "text",
      "value": "🐝"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "אריה"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Lion"
    },
    "hebrew_english": {
      "type": "text",
      "value": "לָיוֹן"
    },
    "emoji": {
      "type": "text",
      "value": "🦁"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "פיל"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Elephant"
    },
    "hebrew_english": {
      "type": "text",
      "value": "אֵלֵפַנְט"
    },
    "emoji": {
      "type": "text",
      "value": "🐘"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "ג'ירפה"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Giraffe"
    },
    "hebrew_english": {
      "type": "text",
      "value": "ג'ִירָף"
    },
    "emoji": {
      "type": "text",
      "value": "🦒"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "זברה"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Zebra"
    },
    "hebrew_english": {
      "type": "text",
      "value": "זֵבּרָה"
    },
    "emoji": {
      "type": "text",
      "value": "🦓"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "קוף"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Monkey"
    },
    "hebrew_english": {
      "type": "text",
      "value": "מָנקִי"
    },
    "emoji": {
      "type": "text",
      "value": "🐒"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "דב"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Bear"
    },
    "hebrew_english": {
      "type": "text",
      "value": "בֵּר"
    },
    "emoji": {
      "type": "text",
      "value": "🐻"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "זאב"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Wolf"
    },
    "hebrew_english": {
      "type": "text",
      "value": "וּוּלף"
    },
    "emoji": {
      "type": "text",
      "value": "🐺"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "שועל"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Fox"
    },
    "hebrew_english": {
      "type": "text",
      "value": "פוֹקְס"
    },
    "emoji": {
      "type": "text",
      "value": "🦊"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "פינגווין"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Penguin"
    },
    "hebrew_english": {
      "type": "text",
      "value": "פֵּנגוּוִין"
    },
    "emoji": {
      "type": "text",
      "value": "🐧"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "ינשוף"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Owl"
    },
    "hebrew_english": {
      "type": "text",
      "value": "אָאוּל"
    },
    "emoji": {
      "type": "text",
      "value": "🦉"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "דולפין"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Dolphin"
    },
    "hebrew_english": {
      "type": "text",
      "value": "דוֹלפִין"
    },
    "emoji": {
      "type": "text",
      "value": "🐬"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "כריש"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Shark"
    },
    "hebrew_english": {
      "type": "text",
      "value": "שָׁארק"
    },
    "emoji": {
      "type": "text",
      "value": "🦈"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "לווייתן"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Whale"
    },
    "hebrew_english": {
      "type": "text",
      "value": "וֵיל"
    },
    "emoji": {
      "type": "text",
      "value": "🐋"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "צב"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Turtle"
    },
    "hebrew_english": {
      "type": "text",
      "value": "טֵרטֵל"
    },
    "emoji": {
      "type": "text",
      "value": "🐢"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "תנין"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Crocodile"
    },
    "hebrew_english": {
      "type": "text",
      "value": "קרוֹקוֹדָיל"
    },
    "emoji": {
      "type": "text",
      "value": "🐊"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "נחש"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Snake"
    },
    "hebrew_english": {
      "type": "text",
      "value": "סנֵיק"
    },
    "emoji": {
      "type": "text",
      "value": "🐍"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "לטאה"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Lizard"
    },
    "hebrew_english": {
      "type": "text",
      "value": "לִיזָרד"
    },
    "emoji": {
      "type": "text",
      "value": "🦎"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "עכביש"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Spider"
    },
    "hebrew_english": {
      "type": "text",
      "value": "ספָּיידֵר"
    },
    "emoji": {
      "type": "text",
      "value": "🕷️"
    }
  }
],


VERBS : [{'verb_hebrew': {'type': 'text', 'value': 'ללכת'},
  'english_name': {'type':  'text_to_speech', 'value': 'Walk'},
  'verb_hebrew_english': {'type': 'text', 'value': 'ווֹק'},
  'emoji': {'type': 'text', 'value': '🚶'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לרוץ'},
  'english_name': {'type':  'text_to_speech', 'value': 'Run'},
  'verb_hebrew_english': {'type': 'text', 'value': 'רַן'},
  'emoji': {'type': 'text', 'value': '🏃'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לקפוץ'},
  'english_name': {'type':  'text_to_speech', 'value': 'Jump'},
  'verb_hebrew_english': {'type': 'text', 'value': "גַ'ַמפּ"},
  'emoji': {'type': 'text', 'value': '🤾'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לשחות'},
  'english_name': {'type':  'text_to_speech', 'value': 'Swim'},
  'verb_hebrew_english': {'type': 'text', 'value': 'סְווִים'},
  'emoji': {'type': 'text', 'value': '🏊'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לאכול'},
  'english_name': {'type':  'text_to_speech', 'value': 'Eat'},
  'verb_hebrew_english': {'type': 'text', 'value': 'אִיט'},
  'emoji': {'type': 'text', 'value': '🍽️'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לשתות'},
  'english_name': {'type':  'text_to_speech', 'value': 'Drink'},
  'verb_hebrew_english': {'type': 'text', 'value': 'דְרִינק'},
  'emoji': {'type': 'text', 'value': '🥤'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לשבת'},
  'english_name': {'type':  'text_to_speech', 'value': 'Sit'},
  'verb_hebrew_english': {'type': 'text', 'value': 'סִיט'},
  'emoji': {'type': 'text', 'value': '🪑'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לעמוד'},
  'english_name': {'type':  'text_to_speech', 'value': 'Stand'},
  'verb_hebrew_english': {'type': 'text', 'value': 'סְטֶנד'},
  'emoji': {'type': 'text', 'value': '🧍'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לשיר'},
  'english_name': {'type':  'text_to_speech', 'value': 'Sing'},
  'verb_hebrew_english': {'type': 'text', 'value': 'סִינג'},
  'emoji': {'type': 'text', 'value': '🎤'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לצייר'},
  'english_name': {'type':  'text_to_speech', 'value': 'Draw'},
  'verb_hebrew_english': {'type': 'text', 'value': 'דְרָו'},
  'emoji': {'type': 'text', 'value': '🎨'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לקרוא'},
  'english_name': {'type':  'text_to_speech', 'value': 'Read'},
  'verb_hebrew_english': {'type': 'text', 'value': 'רִיד'},
  'emoji': {'type': 'text', 'value': '📖'}},
 {'verb_hebrew': {'type': 'text', 'value': 'לכתוב'},
  'english_name': {'type':  'text_to_speech', 'value': 'Write'},
  'verb_hebrew_english': {'type': 'text', 'value': 'רַייט'},
  'emoji': {'type': 'text', 'value': '✍️'}}],

COLORS : [{'color_hebrew': {'type': 'text', 'value': 'אדום'},
  'english_name': {'type': 'text_to_speech', 'value': 'Red'},
  'color_hebrew_english': {'type': 'text', 'value': 'רֵד'},
  'emoji': {'type': 'text', 'value': '🟥'}},
 {'color_hebrew': {'type': 'text', 'value': 'כחול'},
  'english_name': {'type': 'text_to_speech', 'value': 'Blue'},
  'color_hebrew_english': {'type': 'text', 'value': 'בְּלוּ'},
  'emoji': {'type': 'text', 'value': '🟦'}},
 {'color_hebrew': {'type': 'text', 'value': 'ירוק'},
  'english_name': {'type': 'text_to_speech', 'value': 'Green'},
  'color_hebrew_english': {'type': 'text', 'value': 'גְרִין'},
  'emoji': {'type': 'text', 'value': '🟩'}},
 {'color_hebrew': {'type': 'text', 'value': 'צהוב'},
  'english_name': {'type': 'text_to_speech', 'value': 'Yellow'},
  'color_hebrew_english': {'type': 'text', 'value': 'יֵלְלוֹ'},
  'emoji': {'type': 'text', 'value': '💛'}},
 {'color_hebrew': {'type': 'text', 'value': 'שחור'},
  'english_name': {'type': 'text_to_speech', 'value': 'Black'},
  'color_hebrew_english': {'type': 'text', 'value': 'בְּלֶק'},
  'emoji': {'type': 'text', 'value': '⬛'}},
 {'color_hebrew': {'type': 'text', 'value': 'לבן'},
  'english_name': {'type': 'text_to_speech', 'value': 'White'},
  'color_hebrew_english': {'type': 'text', 'value': 'וַוייט'},
  'emoji': {'type': 'text', 'value': '⬜'}},
 {'color_hebrew': {'type': 'text', 'value': 'ורוד'},
  'english_name': {'type': 'text_to_speech', 'value': 'Pink'},
  'color_hebrew_english': {'type': 'text', 'value': 'פִּינק'},
  'emoji': {'type': 'text', 'value': '🩷'}},
 {'color_hebrew': {'type': 'text', 'value': 'כתום'},
  'english_name': {'type': 'text_to_speech', 'value': 'Orange'},
  'color_hebrew_english': {'type': 'text', 'value': "אוֹרֵנְג'"},
  'emoji': {'type': 'text', 'value': '🟧'}},
 {'color_hebrew': {'type': 'text', 'value': 'סגול'},
  'english_name': {'type': 'text_to_speech', 'value': 'Purple'},
  'color_hebrew_english': {'type': 'text', 'value': 'פַּרְפֵּל'},
  'emoji': {'type': 'text', 'value': '🟪'}},
 {'color_hebrew': {'type': 'text', 'value': 'חום'},
  'english_name': {'type': 'text_to_speech', 'value': 'Brown'},
  'color_hebrew_english': {'type': 'text', 'value': 'בְּרָאון'},
  'emoji': {'type': 'text', 'value': '🟫'}}],

QUESTION : [{'question_word_hebrew': {'type': 'text', 'value': 'מה'},
  'english_name': {'type': 'text_to_speech',  'value': 'What'},
  'question_word_hebrew_english': {'type': 'text', 'value': 'וואַט'},
  'emoji': {'type': 'text', 'value': '❓'}},
 {'question_word_hebrew': {'type': 'text', 'value': 'מי'},
  'english_name': {'type': 'text_to_speech',  'value': 'Who'},
  'question_word_hebrew_english': {'type': 'text', 'value': 'הוּ'},
  'emoji': {'type': 'text', 'value': '👤'}},
 {'question_word_hebrew': {'type': 'text', 'value': 'מתי'},
  'english_name': {'type': 'text_to_speech',  'value': 'When'},
  'question_word_hebrew_english': {'type': 'text', 'value': 'ווען'},
  'emoji': {'type': 'text', 'value': '⏰'}},
 {'question_word_hebrew': {'type': 'text', 'value': 'איפה'},
  'english_name': {'type': 'text_to_speech',  'value': 'Where'},
  'question_word_hebrew_english': {'type': 'text', 'value': 'ווער'},
  'emoji': {'type': 'text', 'value': '📍'}},
 {'question_word_hebrew': {'type': 'text', 'value': 'למה'},
  'english_name': {'type': 'text_to_speech',  'value': 'Why'},
  'question_word_hebrew_english': {'type': 'text', 'value': 'וואַי'},
  'emoji': {'type': 'text', 'value': '🤔'}},
 {'question_word_hebrew': {'type': 'text', 'value': 'איך'},
  'english_name': {'type': 'text_to_speech','value': 'How'},
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

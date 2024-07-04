
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

BODY_PARTS: [
  {
    "hebrew": {
      "type": "text",
      "value": "ראש"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Head"
    },
    "hebrew_english": {
      "type": "text",
      "value": "הֵד"
    },
    "emoji": {
      "type": "text",
      "value": "👤"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "עין"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Eye"
    },
    "hebrew_english": {
      "type": "text",
      "value": "אָי"
    },
    "emoji": {
      "type": "text",
      "value": "👁️"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "אוזן"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Ear"
    },
    "hebrew_english": {
      "type": "text",
      "value": "אִיר"
    },
    "emoji": {
      "type": "text",
      "value": "👂"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "אף"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Nose"
    },
    "hebrew_english": {
      "type": "text",
      "value": "נוֹז"
    },
    "emoji": {
      "type": "text",
      "value": "👃"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "פה"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Mouth"
    },
    "hebrew_english": {
      "type": "text",
      "value": "מָאוּת'"
    },
    "emoji": {
      "type": "text",
      "value": "👄"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "יד"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Hand"
    },
    "hebrew_english": {
      "type": "text",
      "value": "הֵנד"
    },
    "emoji": {
      "type": "text",
      "value": "🖐️"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "רגל"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Leg"
    },
    "hebrew_english": {
      "type": "text",
      "value": "לֵג"
    },
    "emoji": {
      "type": "text",
      "value": "🦵"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "בטן"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Belly"
    },
    "hebrew_english": {
      "type": "text",
      "value": "בֵּלִי"
    },
    "emoji": {
      "type": "text",
      "value": "🤰"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "גב"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Back"
    },
    "hebrew_english": {
      "type": "text",
      "value": "בֵּק"
    },
    "emoji": {
      "type": "text",
      "value": "🔙"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "כתף"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Shoulder"
    },
    "hebrew_english": {
      "type": "text",
      "value": "שׁוֹלדֵר"
    },
    "emoji": {
      "type": "text",
      "value": "💪"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "מרפק"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Elbow"
    },
    "hebrew_english": {
      "type": "text",
      "value": "אֵלבּוֹ"
    },
    "emoji": {
      "type": "text",
      "value": "💪"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "ברך"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Knee"
    },
    "hebrew_english": {
      "type": "text",
      "value": "נִי"
    },
    "emoji": {
      "type": "text",
      "value": "🦵"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "כף רגל"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Foot"
    },
    "hebrew_english": {
      "type": "text",
      "value": "פוּט"
    },
    "emoji": {
      "type": "text",
      "value": "🦶"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "אצבע"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Finger"
    },
    "hebrew_english": {
      "type": "text",
      "value": "פִינגֵר"
    },
    "emoji": {
      "type": "text",
      "value": "👆"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "בוהן"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Thumb"
    },
    "hebrew_english": {
      "type": "text",
      "value": "ת'אָם"
    },
    "emoji": {
      "type": "text",
      "value": "👍"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "צוואר"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Neck"
    },
    "hebrew_english": {
      "type": "text",
      "value": "נֵק"
    },
    "emoji": {
      "type": "text",
      "value": "🦒"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "שיער"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Hair"
    },
    "hebrew_english": {
      "type": "text",
      "value": "הֵר"
    },
    "emoji": {
      "type": "text",
      "value": "💇"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "לשון"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Tongue"
    },
    "hebrew_english": {
      "type": "text",
      "value": "טאָנג"
    },
    "emoji": {
      "type": "text",
      "value": "👅"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "שן"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Tooth"
    },
    "hebrew_english": {
      "type": "text",
      "value": "טוּת'"
    },
    "emoji": {
      "type": "text",
      "value": "🦷"
    }
  },
],


VERBS : [
 {'verb_hebrew': {'type': 'text', 'value': 'ללכת'},
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

COLORS : [
 {'color_hebrew': {'type': 'text', 'value': 'אדום'},
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

QUESTION : [
 {'question_word_hebrew': {'type': 'text', 'value': 'מה'},
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

 hebrewAlphabet : [
    {
        letter: {type: "text", value: "א"},
        letterName: {type: "speech", value: "אָלֶף"},
    },
    {
        letter: {type: "text", value: "ב"},
        letterName: {type: "speech", value: "בֵּת"},
    },
    {
        letter: {type: "text", value: "ג"},
        letterName: {type: "speech", value: "גִימֶל"},
    },
    {
        letter: {type: "text", value: "ד"},
        letterName: {type: "speech", value: "דָלֶת"},
    },
    {
        letter: {type: "text", value: "ה"},
        letterName: {type: "speech", value: "הֵיי"},
    },
    {
        letter: {type: "text", value: "ו"},
        letterName: {type: "speech", value: "וָו"},
    },
    {
        letter: {type: "text", value: "ז"},
        letterName: {type: "speech", value: "זַיִן"},
    },
    {
        letter: {type: "text", value: "ח"},
        letterName: {type: "speech", value: "חֵת"},
    },
    {
        letter: {type: "text", value: "ט"},
        letterName: {type: "speech", value: "טֵת"},
    },
    {
        letter: {type: "text", value: "י"},
        letterName: {type: "speech", value: "יוּד"},
    },
    {
        letter: {type: "text", value: "כ"},
        letterName: {type: "speech", value: "כַּף"},
    },
    {
        letter: {type: "text", value: "ך"},
        letterName: {type: "speech", value: "כַּף סוֹפִית"},
    },
    {
        letter: {type: "text", value: "ל"},
        letterName: {type: "speech", value: "לָמֶד"},
    },
    {
        letter: {type: "text", value: "מ"},
        letterName: {type: "speech", value: "מֵם"},
    },
    {
        letter: {type: "text", value: "ם"},
        letterName: {type: "speech", value: "מֵם סוֹפִית"},
    },
    {
        letter: {type: "text", value: "נ"},
        letterName: {type: "speech", value: "נוּן"},
    },
    {
        letter: {type: "text", value: "ן"},
        letterName: {type: "speech", value: "נוּן סוֹפִית"},
    },
    {
        letter: {type: "text", value: "ס"},
        letterName: {type: "speech", value: "סָמֶך"},
    },
    {
        letter: {type: "text", value: "ע"},
        letterName: {type: "speech", value: "עַיִן"},
    },
    {
        letter: {type: "text", value: "פ"},
        letterName: {type: "speech", value: "פֵּא"},
    },
    {
        letter: {type: "text", value: "ף"},
        letterName: {type: "speech", value: "פֵּא סוֹפִית"},
    },
    {
        letter: {type: "text", value: "צ"},
        letterName: {type: "speech", value: "צָדִיק"},
    },
    {
        letter: {type: "text", value: "ץ"},
        letterName: {type: "speech", value: "צָדִיק סוֹפִית"},
    },
    {
        letter: {type: "text", value: "ק"},
        letterName: {type: "speech", value: "קוּף"},
    },
    {
        letter: {type: "text", value: "ר"},
        letterName: {type: "speech", value: "רֵשׁ"},
    },
    {
        letter: {type: "text", value: "ש"},
        letterName: {type: "speech", value: "שִׁן"},
    },
    {
        letter: {type: "text", value: "ת"},
        letterName: {type: "speech", value: "תָּו"},
    }
],

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

NUMBERS: [
    {
      "hebrew": {
        "type": "text",
        "value": "אחד"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "One"
      },
      "hebrew_english": {
        "type": "text",
        "value": "וָאן"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "שתיים"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Two"
      },
      "hebrew_english": {
        "type": "text",
        "value": "טוּ"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "שלוש"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Three"
      },
      "hebrew_english": {
        "type": "text",
        "value": "ת'רִי"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "ארבע"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Four"
      },
      "hebrew_english": {
        "type": "text",
        "value": "פוֹר"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "חמש"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Five"
      },
      "hebrew_english": {
        "type": "text",
        "value": "פָיב"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "שש"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Six"
      },
      "hebrew_english": {
        "type": "text",
        "value": "סִיקְס"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "שבע"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Seven"
      },
      "hebrew_english": {
        "type": "text",
        "value": "סֵבֵן"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "שמונה"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Eight"
      },
      "hebrew_english": {
        "type": "text",
        "value": "אֵייט"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "תשע"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Nine"
      },
      "hebrew_english": {
        "type": "text",
        "value": "נָיין"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "עשר"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Ten"
      },
      "hebrew_english": {
        "type": "text",
        "value": "טֵן"
      }
    }
  ],

SHAPES: [
    {
      "hebrew": {
        "type": "text",
        "value": "עיגול"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Circle"
      },
      "hebrew_english": {
        "type": "text",
        "value": "סֵרקֵל"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "ריבוע"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Square"
      },
      "hebrew_english": {
        "type": "text",
        "value": "סקוֵר"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "משולש"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Triangle"
      },
      "hebrew_english": {
        "type": "text",
        "value": "טרָיאֵנגֵל"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "מלבן"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Rectangle"
      },
      "hebrew_english": {
        "type": "text",
        "value": "רֵקטָנגֵל"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "אליפסה"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Oval"
      },
      "hebrew_english": {
        "type": "text",
        "value": "אוֹבָל"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "משושה"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Hexagon"
      },
      "hebrew_english": {
        "type": "text",
        "value": "הֵקסָגוֹן"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "כוכב"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Star"
      },
      "hebrew_english": {
        "type": "text",
        "value": "סטָאר"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "טרפז"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Trapezoid"
      },
      "hebrew_english": {
        "type": "text",
        "value": "טרָפֵזוֹיד"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "מעוין"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Diamond"
      },
      "hebrew_english": {
        "type": "text",
        "value": "דָיאמוֹנד"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "חצי עיגול"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Semicircle"
      },
      "hebrew_english": {
        "type": "text",
        "value": "סֵמיסֵרקֵל"
      }
    }
  ],

DAYS_OF_WEEK: [
    {
      "hebrew": {
        "type": "text",
        "value": "ראשון"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Sunday"
      },
      "hebrew_english": {
        "type": "text",
        "value": "סָנדֵי"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "שני"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Monday"
      },
      "hebrew_english": {
        "type": "text",
        "value": "מָנדֵי"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "שלישי"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Tuesday"
      },
      "hebrew_english": {
        "type": "text",
        "value": "טיוּזדֵי"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "רביעי"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Wednesday"
      },
      "hebrew_english": {
        "type": "text",
        "value": "וֵנזדֵי"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "חמישי"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Thursday"
      },
      "hebrew_english": {
        "type": "text",
        "value": "ת'ֵרזדֵי"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "שישי"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Friday"
      },
      "hebrew_english": {
        "type": "text",
        "value": "פרָיידֵי"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "שבת"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Saturday"
      },
      "hebrew_english": {
        "type": "text",
        "value": "סָטֵרדֵי"
      }
    }
  ],

FRUITS_AND_VEGETABLES: [
    {
      "hebrew": {
        "type": "text",
        "value": "תפוח"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Apple"
      },
      "hebrew_english": {
        "type": "text",
        "value": "אֵפֵּל"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "בננה"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Banana"
      },
      "hebrew_english": {
        "type": "text",
        "value": "בָּנָנָה"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "תפוז"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Orange"
      },
      "hebrew_english": {
        "type": "text",
        "value": "אוֹרֵנג'"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "תות"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Strawberry"
      },
      "hebrew_english": {
        "type": "text",
        "value": "סטרוֹבֵּרי"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "ענבים"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Grapes"
      },
      "hebrew_english": {
        "type": "text",
        "value": "גרֵייפּס"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "גזר"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Carrot"
      },
      "hebrew_english": {
        "type": "text",
        "value": "קֵרֵט"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "עגבנייה"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Tomato"
      },
      "hebrew_english": {
        "type": "text",
        "value": "טוֹמֵיטוֹ"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "מלפפון"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Cucumber"
      },
      "hebrew_english": {
        "type": "text",
        "value": "קיוּקָמבֵּר"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "פלפל"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Pepper"
      },
      "hebrew_english": {
        "type": "text",
        "value": "פֵּפֵּר"
      }
    },
    {
      "hebrew": {
        "type": "text",
        "value": "חסה"
      },
      "english_name": {
        "type": "text_to_speech",
        "value": "Lettuce"
      },
      "hebrew_english": {
        "type": "text",
        "value": "לֵטוּס"
      }
    }
  ],

AUTHORS: [
    {"name": {"type": "text", "value": "וויליאם שייקספיר"},
     "book": {"type": "text", "value": "המלט"}},
    {"name": {"type": "text", "value": "לב טולסטוי"},
     "book": {"type": "text", "value": "מלחמה ושלום"}},
    {"name": {"type": "text", "value": "ג'יי קיי רולינג"},
     "book": {"type": "text", "value": "הארי פוטר"}},
    {"name": {"type": "text", "value": "ג'ורג' אורוול"},
     "book": {"type": "text", "value": "1984"}},
    {"name": {"type": "text", "value": "ג'יין אוסטן"},
     "book": {"type": "text", "value": "גאווה ודעה קדומה"}},
    {"name": {"type": "text", "value": "מרק טוויין"},
     "book": {"type": "text", "value": "הרפתקאותיו של האקלברי פין"}},
    {"name": {"type": "text", "value": "הרפר לי"},
     "book": {"type": "text", "value": "אל תיגע בזמיר"}},
    {"name": {"type": "text", "value": "פ. סקוט פיצג'רלד"},
     "book": {"type": "text", "value": "גטסבי הגדול"}},
    {"name": {"type": "text", "value": "הומרוס"},
     "book": {"type": "text", "value": "האיליאדה"}},
    {"name": {"type": "text", "value": "מארי שלי"},
     "book": {"type": "text", "value": "פרנקנשטיין"}},
    {"name": {"type": "text", "value": "צ'ארלס דיקנס"},
     "book": {"type": "text", "value": "ציפיות גדולות"}},
    {"name": {"type": "text", "value": "לואיס קרול"},
     "book": {"type": "text", "value": "עליסה בארץ הפלאות"}},
    {"name": {"type": "text", "value": "ה.ג. וולס"},
     "book": {"type": "text", "value": "מלחמת העולמות"}},
    {"name": {"type": "text", "value": "יוהן וולפגנג פון גתה"},
     "book": {"type": "text", "value": "פאוסט"}},
    {"name": {"type": "text", "value": "רוברט לואיס סטיבנסון"},
     "book": {"type": "text", "value": "אי המטמון"}}
  ],

SCIENTISTS: [
    {"name": {"type": "text", "value": "אלברט איינשטיין"},
     "theory": {"type": "text", "value": "תורת היחסות"}},
    {"name": {"type": "text", "value": "אייזק ניוטון"},
     "theory": {"type": "text", "value": "חוקי התנועה והכבידה"}},
    {"name": {"type": "text", "value": "צ'ארלס דרווין"},
     "theory": {"type": "text", "value": "תורת האבולוציה"}},
    {"name": {"type": "text", "value": "נילס בוהר"},
     "theory": {"type": "text", "value": "מבנה האטום"}},
    {"name": {"type": "text", "value": "ג'יימס קלרק מקסוול"},
     "theory": {"type": "text", "value": "תורת האלקטרומגנטיות"}},
    {"name": {"type": "text", "value": "ג'ון דלטון"},
     "theory": {"type": "text", "value": "תורת האטום"}},
    {"name": {"type": "text", "value": "מארי קירי"},
     "theory": {"type": "text", "value": "רדיואקטיביות"}},
    {"name": {"type": "text", "value": "ריצ'רד פיינמן"},
     "theory": {"type": "text", "value": "אלקטרודינמיקה קוונטית"}},
    {"name": {"type": "text", "value": "מקס פלאנק"},
     "theory": {"type": "text", "value": "תורת הקוונטים"}},
    {"name": {"type": "text", "value": "אדווין האבל"},
     "theory": {"type": "text", "value": "התרחבות היקום"}},
    {"name": {"type": "text", "value": "ארווין שרדינגר"},
     "theory": {"type": "text", "value": "משוואת שרדינגר"}},
    {"name": {"type": "text", "value": "ורנר הייזנברג"},
     "theory": {"type": "text", "value": "עקרון האי-ודאות"}},
    {"name": {"type": "text", "value": "לואי פסטר"},
     "theory": {"type": "text", "value": "חיידקים כמקור מחלות"}},
    {"name": {"type": "text", "value": "סטיבן הוקינג"},
     "theory": {"type": "text", "value": "קרינת הוקינג"}},
    {"name": {"type": "text", "value": "גרגור מנדל"},
     "theory": {"type": "text", "value": "חוקי התורשה"}}
  ],

COUNTRIES: [
    {"name": {"type": "text", "value": "ארצות הברית"},
     "emoji": {"type": "text", "value": "🇺🇸"},
     "capital": {"type": "text", "value": "וושינגטון די.סי."},
     "monument": {"type": "text", "value": "פסל החירות"}},
    {"name": {"type": "text", "value": "צרפת"},
     "emoji": {"type": "text", "value": "🇫🇷"},
     "capital": {"type": "text", "value": "פריז"},
     "monument": {"type": "text", "value": "מגדל אייפל"}},
    {"name": {"type": "text", "value": "ברזיל"},
     "emoji": {"type": "text", "value": "🇧🇷"},
     "capital": {"type": "text", "value": "ברזיליה"},
     "monument": {"type": "text", "value": "מפלי איגואסו"}},
    {"name": {"type": "text", "value": "איטליה"},
     "emoji": {"type": "text", "value": "🇮🇹"},
     "capital": {"type": "text", "value": "רומא"},
     "monument": {"type": "text", "value": "הקולוסיאום"}},
    {"name": {"type": "text", "value": "מצרים"},
     "emoji": {"type": "text", "value": "🇪🇬"},
     "capital": {"type": "text", "value": "קהיר"},
     "monument": {"type": "text", "value": "הפירמידות של גיזה"}},
    {"name": {"type": "text", "value": "סין"},
     "emoji": {"type": "text", "value": "🇨🇳"},
     "capital": {"type": "text", "value": "בייג'ינג"},
     "monument": {"type": "text", "value": "החומה הגדולה של סין"}},
    {"name": {"type": "text", "value": "גרמניה"},
     "emoji": {"type": "text", "value": "🇩🇪"},
     "capital": {"type": "text", "value": "ברלין"},
     "monument": {"type": "text", "value": "שער ברנדנבורג"}},
    {"name": {"type": "text", "value": "בריטניה"},
     "emoji": {"type": "text", "value": "🇬🇧"},
     "capital": {"type": "text", "value": "לונדון"},
     "monument": {"type": "text", "value": "מגדל השעון ביג בן"}},
    {"name": {"type": "text", "value": "הודו"},
     "emoji": {"type": "text", "value": "🇮🇳"},
     "capital": {"type": "text", "value": "ניו דלהי"},
     "monument": {"type": "text", "value": "טאג' מהאל"}},
    {"name": {"type": "text", "value": "אוסטרליה"},
     "emoji": {"type": "text", "value": "🇦🇺"},
     "capital": {"type": "text", "value": "קנברה"},
     "monument": {"type": "text", "value": "בית האופרה של סידני"}},
    {"name": {"type": "text", "value": "רוסיה"},
     "emoji": {"type": "text", "value": "🇷🇺"},
     "capital": {"type": "text", "value": "מוסקבה"},
     "monument": {"type": "text", "value": "הקרמלין"}},
    {"name": {"type": "text", "value": "ספרד"},
     "emoji": {"type": "text", "value": "🇪🇸"},
     "capital": {"type": "text", "value": "מדריד"},
     "monument": {"type": "text", "value": "האלקזר של סביליה"}},
    {"name": {"type": "text", "value": "דרום אפריקה"},
     "emoji": {"type": "text", "value": "🇿🇦"},
     "capital": {"type": "text", "value": "פרטוריה"},
     "monument": {"type": "text", "value": "הר השולחן"}},
    {"name": {"type": "text", "value": "מקסיקו"},
     "emoji": {"type": "text", "value": "🇲🇽"},
     "capital": {"type": "text", "value": "מקסיקו סיטי"},
     "monument": {"type": "text", "value": "פירמידת השמש בטאוטיהואקן"}}
  ],

PAINTERS: [
    {"name": {"type": "text", "value": "ליאונרדו דה וינצ'י"},
     "artwork": {"type": "text", "value": "המונה ליזה"}},
    {"name": {"type": "text", "value": "פבלו פיקאסו"},
     "artwork": {"type": "text", "value": "גרניקה"}},
    {"name": {"type": "text", "value": "וינסנט ואן גוך"},
     "artwork": {"type": "text", "value": "ליל הכוכבים"}},
    {"name": {"type": "text", "value": "קלוד מונה"},
     "artwork": {"type": "text", "value": "חבצלות המים"}},
    {"name": {"type": "text", "value": "סלבדור דאלי"},
     "artwork": {"type": "text", "value": "זכרון ההסכמה"}},
    {"name": {"type": "text", "value": "רמברנדט"},
     "artwork": {"type": "text", "value": "משמר הלילה"}},
    {"name": {"type": "text", "value": "מיכלאנג'לו"},
     "artwork": {"type": "text", "value": "הקפלה הסיסטינית"}},
    {"name": {"type": "text", "value": "רפאל"},
     "artwork": {"type": "text", "value": "האסכולה של אתונה"}},
    {"name": {"type": "text", "value": "אנדי וורהול"},
     "artwork": {"type": "text", "value": "מרילין מונרו"}},
    {"name": {"type": "text", "value": "פיט מונדريان"},
     "artwork": {"type": "text", "value": "קומפוזיציה עם אדום, כחול וצהוב"}},
    {"name": {"type": "text", "value": "פרידה קאלו"},
     "artwork": {"type": "text", "value": "שתי הפרידות"}},
    {"name": {"type": "text", "value": "אדוארד מונק"},
     "artwork": {"type": "text", "value": "הצעקה"}},
    {"name": {"type": "text", "value": "פול סזאן"},
     "artwork": {"type": "text", "value": "ההר הסן-ויקטואר"}},
    {"name": {"type": "text", "value": "ג'קסון פולוק"},
     "artwork": {"type": "text", "value": "מספר 5, 1948"}},
    {"name": {"type": "text", "value": "קנז'י מיזוגוצ'י"},
     "artwork": {"type": "text", "value": "החדר הכחול"}}
  ],
HEBREW_LETTERS_WITH_NIKUD : [
    {
        "letter": {
            "type": "text",
            "value": "אָ"
        },
        "groups": ["א", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "בָּ"
        },
        "groups": ["ב", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "גָּ"
        },
        "groups": ["ג", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "דָּ"
        },
        "groups": ["ד", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "הָ"
        },
        "groups": ["ה", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "וָ"
        },
        "groups": ["ו", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "זָ"
        },
        "groups": ["ז", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "חָ"
        },
        "groups": ["ח", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "טָ"
        },
        "groups": ["ט", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "יָ"
        },
        "groups": ["י", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "כָּ"
        },
        "groups": ["כ", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "לָ"
        },
        "groups": ["ל", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "מָ"
        },
        "groups": ["מ", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "נָ"
        },
        "groups": ["נ", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "סָ"
        },
        "groups": ["ס", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "עָ"
        },
        "groups": ["ע", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "פָּ"
        },
        "groups": ["פ", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "צָ"
        },
        "groups": ["צ", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "קָ"
        },
        "groups": ["ק", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "רָ"
        },
        "groups": ["ר", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "שָׁ"
        },
        "groups": ["ש", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "תָּ"
        },
        "groups": ["ת", "קמץ"]
    },
    {
        "letter": {
            "type": "text",
            "value": "אִ"
        },
        "groups": ["א", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "בִּ"
        },
        "groups": ["ב", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "גִּ"
        },
        "groups": ["ג", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "דִּ"
        },
        "groups": ["ד", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "הִ"
        },
        "groups": ["ה", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "וִ"
        },
        "groups": ["ו", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "זִ"
        },
        "groups": ["ז", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "חִ"
        },
        "groups": ["ח", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "טִ"
        },
        "groups": ["ט", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "יִ"
        },
        "groups": ["י", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "כִּ"
        },
        "groups": ["כ", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "לִ"
        },
        "groups": ["ל", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "מִ"
        },
        "groups": ["מ", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "נִ"
        },
        "groups": ["נ", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "סִ"
        },
        "groups": ["ס", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "עִ"
        },
        "groups": ["ע", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "פִּ"
        },
        "groups": ["פ", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "צִ"
        },
        "groups": ["צ", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "קִ"
        },
        "groups": ["ק", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "רִ"
        },
        "groups": ["ר", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "שִׁ"
        },
        "groups": ["ש", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "תִּ"
        },
        "groups": ["ת", "חיריק"]
    },
    {
        "letter": {
            "type": "text",
            "value": "אֶ"
        },
        "groups": ["א", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "בֶּ"
        },
        "groups": ["ב", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "גֶּ"
        },
        "groups": ["ג", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "דֶּ"
        },
        "groups": ["ד", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "הֶ"
        },
        "groups": ["ה", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "וֶ"
        },
        "groups": ["ו", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "זֶ"
        },
        "groups": ["ז", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "חֶ"
        },
        "groups": ["ח", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "טֶ"
        },
        "groups": ["ט", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "יֶ"
        },
        "groups": ["י", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "כֶּ"
        },
        "groups": ["כ", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "לֶ"
        },
        "groups": ["ל", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "מֶ"
        },
        "groups": ["מ", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "נֶ"
        },
        "groups": ["נ", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "סֶ"
        },
        "groups": ["ס", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "עֶ"
        },
        "groups": ["ע", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "פֶּ"
        },
        "groups": ["פ", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "צֶ"
        },
        "groups": ["צ", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "קֶ"
        },
        "groups": ["ק", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "רֶ"
        },
        "groups": ["ר", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "שֶׁ"
        },
        "groups": ["ש", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "תֶּ"
        },
        "groups": ["ת", "סגול"]
    },
    {
        "letter": {
            "type": "text",
            "value": "אֹ"
        },
        "groups": ["א", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "בֹּ"
        },
        "groups": ["ב", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "גֹּ"
        },
        "groups": ["ג", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "דֹּ"
        },
        "groups": ["ד", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "הֹ"
        },
        "groups": ["ה", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "וֹ"
        },
        "groups": ["ו", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "זֹ"
        },
        "groups": ["ז", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "חֹ"
        },
        "groups": ["ח", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "טֹ"
        },
        "groups": ["ט", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "יֹ"
        },
        "groups": ["י", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "כֹּ"
        },
        "groups": ["כ", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "לֹ"
        },
        "groups": ["ל", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "מֹ"
        },
        "groups": ["מ", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "נֹ"
        },
        "groups": ["נ", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "סֹ"
        },
        "groups": ["ס", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "עֹ"
        },
        "groups": ["ע", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "פֹּ"
        },
        "groups": ["פ", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "צֹ"
        },
        "groups": ["צ", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "קֹ"
        },
        "groups": ["ק", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "רֹ"
        },
        "groups": ["ר", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "שֹׁ"
        },
        "groups": ["ש", "חולם"]
    },
    {
        "letter": {
            "type": "text",
            "value": "תֹּ"
        },
        "groups": ["ת", "חולם"]
    }
],

ADDITION: createAsymmetricExercises(10, inverseAddition, "ADDITION"),
SUBTRACTION: createAsymmetricExercises(10, inverseSubtraction, "SUBTRACTION"),
MULTIPLICATION: createAsymmetricExercises(10, inverseMultiplication, "MULTIPLICATION"),
DIVISION: createAsymmetricExercises(10, inverseDivision, "DIVISION"),
COUNT: createCount(5),
}


function createAsymmetricExercises(upTo, inverseMathFunction) {
    const exercises = [];
    for (let i = 1; i <= upTo; i++) {
        for (let j = 1; j <= upTo; j++) {
            const { a, b, result, symbol } = inverseMathFunction(i, j);
            exercises.push({
                question: {"type": "text", "value": `${a} ${symbol} ${b} =`},
                answer: {"type": "text", "value": `${result}`},
                id: {"type": "text", "value": `${i}`},
                groups: [i],
            });
        }
    }
    return exercises;
}

function inverseAddition(a, b) {
    return { a, b, result: a + b, symbol: '+' };
}

function inverseSubtraction(a, b) {
    return {a:a + b, b:a, result: b, symbol: '-' };
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
ABC: [
    {
        englishUpperCase: {type: "text", value: "A"},
        englishLowerCase: {type: "text", value: "a"},
        hebrewTransliteration: {type: "text", value: "אֵי"},
        audio: {type: "audio", value: "./sounds/letters/a.mp3"},
        spoken: {type: "text", value: ["a", "ay", "ei"]}
    },
    {
        englishUpperCase: {type: "text", value: "B"},
        englishLowerCase: {type: "text", value: "b"},
        hebrewTransliteration: {type: "text", value: "בִי"},
        audio: {type: "audio", value: "./sounds/letters/b.mp3"},
        spoken: {type: "text", value: ["b", "bee", "be"]}
    },
    {
        englishUpperCase: {type: "text", value: "C"},
        englishLowerCase: {type: "text", value: "c"},
        hebrewTransliteration: {type: "text", value: "סִי"},
        audio: {type: "audio", value: "./sounds/letters/c.mp3"},
        spoken: {type: "text", value: ["c", "see", "sea"]}
    },
    {
        englishUpperCase: {type: "text", value: "D"},
        englishLowerCase: {type: "text", value: "d"},
        hebrewTransliteration: {type: "text", value: "דִי"},
        audio: {type: "audio", value: "./sounds/letters/d.mp3"},
        spoken: {type: "text", value: ["d", "dee", "de"]}
    },
    {
        englishUpperCase: {type: "text", value: "E"},
        englishLowerCase: {type: "text", value: "e"},
        hebrewTransliteration: {type: "text", value: "אִי"},
        audio: {type: "audio", value: "./sounds/letters/e.mp3"},
        spoken: {type: "text", value: ["e", "ee"]}
    },
    {
        englishUpperCase: {type: "text", value: "F"},
        englishLowerCase: {type: "text", value: "f"},
        hebrewTransliteration: {type: "text", value: "אֵף"},
        audio: {type: "audio", value: "./sounds/letters/f.mp3"},
        spoken: {type: "text", value: ["f", "ef"]}
    },
    {
        englishUpperCase: {type: "text", value: "G"},
        englishLowerCase: {type: "text", value: "g"},
        hebrewTransliteration: {type: "text", value: "גִ׳י"},
        audio: {type: "audio", value: "./sounds/letters/g.mp3"},
        spoken: {type: "text", value: ["g", "gee", "ji"]}
    },
    {
        englishUpperCase: {type: "text", value: "H"},
        englishLowerCase: {type: "text", value: "h"},
        hebrewTransliteration: {type: "text", value: "אֵיְיץ'"},
        audio: {type: "audio", value: "./sounds/letters/h.mp3"},
        spoken: {type: "text", value: ["h", "aitch", "hey-ch"]}
    },
    {
        englishUpperCase: {type: "text", value: "I"},
        englishLowerCase: {type: "text", value: "i"},
        hebrewTransliteration: {type: "text", value: "אַי"},
        audio: {type: "audio", value: "./sounds/letters/i.mp3"},
        spoken: {type: "text", value: ["i", "eye", "ai"]}
    },
    {
        englishUpperCase: {type: "text", value: "J"},
        englishLowerCase: {type: "text", value: "j"},
        hebrewTransliteration: {type: "text", value: "גֵ'י"},
        audio: {type: "audio", value: "./sounds/letters/j.mp3"},
        spoken: {type: "text", value: ["j", "jay"]}
    },
    {
        englishUpperCase: {type: "text", value: "K"},
        englishLowerCase: {type: "text", value: "k"},
        hebrewTransliteration: {type: "text", value: "קֵי"},
        audio: {type: "audio", value: "./sounds/letters/k.mp3"},
        spoken: {type: "text", value: ["k", "kay"]}
    },
    {
        englishUpperCase: {type: "text", value: "L"},
        englishLowerCase: {type: "text", value: "l"},
        hebrewTransliteration: {type: "text", value: "אֶל"},
        audio: {type: "audio", value: "./sounds/letters/l.mp3"},
        spoken: {type: "text", value: ["l", "el", "al"]}
    },
    {
        englishUpperCase: {type: "text", value: "M"},
        englishLowerCase: {type: "text", value: "m"},
        hebrewTransliteration: {type: "text", value: "אֶם"},
        audio: {type: "audio", value: "./sounds/letters/m.mp3"},
        spoken: {type: "text", value: ["m", "em"]}
    },
    {
        englishUpperCase: {type: "text", value: "N"},
        englishLowerCase: {type: "text", value: "n"},
        hebrewTransliteration: {type: "text", value: "אֶן"},
        audio: {type: "audio", value: "./sounds/letters/n.mp3"},
        spoken: {type: "text", value: ["n", "en"]}
    },
    {
        englishUpperCase: {type: "text", value: "O"},
        englishLowerCase: {type: "text", value: "o"},
        hebrewTransliteration: {type: "text", value: "אוֹ"},
        audio: {type: "audio", value: "./sounds/letters/o.mp3"},
        spoken: {type: "text", value: ["o", "oh"]}
    },
    {
        englishUpperCase: {type: "text", value: "P"},
        englishLowerCase: {type: "text", value: "p"},
        hebrewTransliteration: {type: "text", value: "פִּי"},
        audio: {type: "audio", value: "./sounds/letters/p.mp3"},
        spoken: {type: "text", value: ["p", "pee", "pi"]}
    },
    {
        englishUpperCase: {type: "text", value: "Q"},
        englishLowerCase: {type: "text", value: "q"},
        hebrewTransliteration: {type: "text", value: "קְיוּ"},
        audio: {type: "audio", value: "./sounds/letters/q.mp3"},
        spoken: {type: "text", value: ["q", "cue", "queue"]}
    },
    {
        englishUpperCase: {type: "text", value: "R"},
        englishLowerCase: {type: "text", value: "r"},
        hebrewTransliteration: {type: "text", value: "אַר"},
        audio: {type: "audio", value: "./sounds/letters/r.mp3"},
        spoken: {type: "text", value: ["r", "are", "ar"]}
    },
    {
        englishUpperCase: {type: "text", value: "S"},
        englishLowerCase: {type: "text", value: "s"},
        hebrewTransliteration: {type: "text", value: "אֶס"},
        audio: {type: "audio", value: "./sounds/letters/s.mp3"},
        spoken: {type: "text", value: ["s", "ess"]}
    },
    {
        englishUpperCase: {type: "text", value: "T"},
        englishLowerCase: {type: "text", value: "t"},
        hebrewTransliteration: {type: "text", value: "טִי"},
        audio: {type: "audio", value: "./sounds/letters/t.mp3"},
        spoken: {type: "text", value: ["t", "tee", "ti"]}
    },
    {
        englishUpperCase: {type: "text", value: "U"},
        englishLowerCase: {type: "text", value: "u"},
        hebrewTransliteration: {type: "text", value: "יוּ"},
        audio: {type: "audio", value: "./sounds/letters/u.mp3"},
        spoken: {type: "text", value: ["u", "you", "yu"]}
    },
    {
        englishUpperCase: {type: "text", value: "V"},
        englishLowerCase: {type: "text", value: "v"},
        hebrewTransliteration: {type: "text", value: "וִי"},
        audio: {type: "audio", value: "./sounds/letters/v.mp3"},
        spoken: {type: "text", value: ["v", "vee", "vi"]}
    },
    {
        englishUpperCase: {type: "text", value: "W"},
        englishLowerCase: {type: "text", value: "w"},
        hebrewTransliteration: {type: "text", value: "דַאבְּלְיוּ"},
        audio: {type: "audio", value: "./sounds/letters/w.mp3"},
        spoken: {type: "text", value: ["w", "double u", "double-you", "doubleu"]}
    },
    {
        englishUpperCase: {type: "text", value: "X"},
        englishLowerCase: {type: "text", value: "x"},
        hebrewTransliteration: {type: "text", value: "אֶקְס"},
        audio: {type: "audio", value: "./sounds/letters/x.mp3"},
        spoken: {type: "text", value: ["x", "ex", "eks"]}
    },
    {
        englishUpperCase: {type: "text", value: "Y"},
        englishLowerCase: {type: "text", value: "y"},
        hebrewTransliteration: {type: "text", value: "וַוי"},
        audio: {type: "audio", value: "./sounds/letters/y.mp3"},
        spoken: {type: "text", value: ["y", "why"]}
    },
    {
        englishUpperCase: {type: "text", value: "Z"},
        englishLowerCase: {type: "text", value: "z"},
        hebrewTransliteration: {type: "text", value: "זד"},
        audio: {type: "audio", value: "./sounds/letters/z.mp3"},
        spoken: {type: "text", value: ["z", "zee", "zed"]}
    }
],

FAVORITE_COLOR_LESSON: [
  {
    "hebrew": {"type": "text", "value": "מה"},
    "english_name": {"type": "text_to_speech", "value": "What"}
  },
  {
    "hebrew": {"type": "text", "value": "צבע"},
    "english_name": {"type": "text_to_speech", "value": "Color"}
  },
  {
    "hebrew": {"type": "text", "value": "ה"},
    "english_name": {"type": "text_to_speech", "value": "The"}
  },
  {
    "hebrew": {"type": "text", "value": "מועדף"},
    "english_name": {"type": "text_to_speech", "value": "Favorite"}
  },
  {
    "hebrew": {"type": "text", "value": "שלי"},
    "english_name": {"type": "text_to_speech", "value": "My"}
  },
  {
    "hebrew": {"type": "text", "value": "המועדף"},
    "english_name": {"type": "text_to_speech", "value": "Favorite"}
  },
  {
    "hebrew": {"type": "text", "value": "הוא"},
    "english_name": {"type": "text_to_speech", "value": "Is"}
  },
  {
    "hebrew": {"type": "text", "value": "אדום"},
    "english_name": {"type": "text_to_speech", "value": "Red"}
  },
  {
    "hebrew": {"type": "text", "value": "כחול"},
    "english_name": {"type": "text_to_speech", "value": "Blue"}
  },
  {
    "hebrew": {"type": "text", "value": "צהוב"},
    "english_name": {"type": "text_to_speech", "value": "Yellow"}
  },
  {
    "hebrew": {"type": "text", "value": "ירוק"},
    "english_name": {"type": "text_to_speech", "value": "Green"}
  },
  {
    "hebrew": {"type": "text", "value": "כתום"},
    "english_name": {"type": "text_to_speech", "value": "Orange"}
  },
  {
    "hebrew": {"type": "text", "value": "סגול"},
    "english_name": {"type": "text_to_speech", "value": "Purple"}
  },
  {
    "hebrew": {"type": "text", "value": "ורוד"},
    "english_name": {"type": "text_to_speech", "value": "Pink"}
  },
  {
    "hebrew": {"type": "text", "value": "חום"},
    "english_name": {"type": "text_to_speech", "value": "Brown"}
  },
  {
    "hebrew": {"type": "text", "value": "שחור"},
    "english_name": {"type": "text_to_speech", "value": "Black"}
  },
  {
    "hebrew": {"type": "text", "value": "לבן"},
    "english_name": {"type": "text_to_speech", "value": "White"}
  },
  {
    "hebrew": {"type": "text", "value": "אפור"},
    "english_name": {"type": "text_to_speech", "value": "Gray"}
  },
  {
    "hebrew": {"type": "text", "value": "זהב"},
    "english_name": {"type": "text_to_speech", "value": "Gold"}
  },
  {
    "hebrew": {"type": "text", "value": "כסף"},
    "english_name": {"type": "text_to_speech", "value": "Silver"}
  }
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

WEATHER: [
  {
    "hebrew": {
      "type": "text",
      "value": "שמש"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Sunny"
    },
    "emoji": {
      "type": "text",
      "value": "☀️"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "גשם"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Rainy"
    },
    "emoji": {
      "type": "text",
      "value": "🌧️"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "מעונן"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Cloudy"
    },
    "emoji": {
      "type": "text",
      "value": "☁️"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "שלג"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Snowy"
    },
    "emoji": {
      "type": "text",
      "value": "❄️"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "רוח"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Windy"
    },
    "emoji": {
      "type": "text",
      "value": "🌬️"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "חם"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Hot"
    },
    "emoji": {
      "type": "text",
      "value": "🔥"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "קר"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Cold"
    },
    "emoji": {
      "type": "text",
      "value": "🥶"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "קשת בענן"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Rainbow"
    },
    "emoji": {
      "type": "text",
      "value": "🌈"
    }
  }
],

FAMILY: [
  {
    "hebrew": {
      "type": "text",
      "value": "אבא"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Father"
    },
    "emoji": {
      "type": "text",
      "value": "👨"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "אמא"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Mother"
    },
    "emoji": {
      "type": "text",
      "value": "👩"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "אח"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Brother"
    },
    "emoji": {
      "type": "text",
      "value": "👦"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "אחות"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Sister"
    },
    "emoji": {
      "type": "text",
      "value": "👧"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "סבא"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Grandfather"
    },
    "emoji": {
      "type": "text",
      "value": "👴"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "סבתא"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Grandmother"
    },
    "emoji": {
      "type": "text",
      "value": "👵"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "דוד"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Uncle"
    },
    "emoji": {
      "type": "text",
      "value": "👨‍🦱"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "דודה"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Aunt"
    },
    "emoji": {
      "type": "text",
      "value": "👩‍🦱"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "בן"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Son"
    },
    "emoji": {
      "type": "text",
      "value": "👦"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "בת"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Daughter"
    },
    "emoji": {
      "type": "text",
      "value": "👧"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "אחיין"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Nephew"
    },
    "emoji": {
      "type": "text",
      "value": "👶"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "משפחה"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Family"
    },
    "emoji": {
      "type": "text",
      "value": "👪"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "אבא"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Dad"
    },
    "emoji": {
      "type": "text",
      "value": "👨"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "אמא"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Mom"
    },
    "emoji": {
      "type": "text",
      "value": "👩"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "סבתא"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Grandma"
    },
    "emoji": {
      "type": "text",
      "value": "👵"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "סבא"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Grandpa"
    },
    "emoji": {
      "type": "text",
      "value": "👴"
    }
  }
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

PREPOSITIONS: [
  {
    "hebrew": {
      "type": "text",
      "value": "מעל"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Above"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "מתחת"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Below"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "ליד"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Next to"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "בין"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Between"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "מאחורי"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Behind"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "לפני"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "In front of"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "בתוך"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Inside"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "מחוץ"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Outside"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "על"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "On"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "מתחת ל"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Under"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "קרוב ל"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Near"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "בפנים"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Inside"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "בחוץ"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Outside"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "עם"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "With"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "בלי"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Without"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "מול"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Opposite"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "דרך"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Through"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "אל"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "To"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "מ"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "From"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "כמו"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Like"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "על יד"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "By"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "עד"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Until"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "ל"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "For"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "ב"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "In"
    }
  },
  {
    "hebrew": {
      "type": "text",
      "value": "מול"
    },
    "english_name": {
      "type": "text_to_speech",
      "value": "Against"
    }
  }
],

COLUMN_WORDS: [
  {
    "hebrew": {"type": "text", "value": "עיר"},
    "english_name": {"type": "text_to_speech", "value": "City"}
  },
  {
    "hebrew": {"type": "text", "value": "בית חולים"},
    "english_name": {"type": "text_to_speech", "value": "Hospital"}
  },
  {
    "hebrew": {"type": "text", "value": "ספריה"},
    "english_name": {"type": "text_to_speech", "value": "Library"}
  },
  {
    "hebrew": {"type": "text", "value": "פארק"},
    "english_name": {"type": "text_to_speech", "value": "Park"}
  },
  {
    "hebrew": {"type": "text", "value": "רחוב"},
    "english_name": {"type": "text_to_speech", "value": "Street"}
  },
  {
    "hebrew": {"type": "text", "value": "שכונה"},
    "english_name": {"type": "text_to_speech", "value": "Town"}
  },
  {
    "hebrew": {"type": "text", "value": "מה הכתובת שלך?"},
    "english_name": {"type": "text_to_speech", "value": "What is your address?"}
  },
  {
    "hebrew": {"type": "text", "value": "הכתובת שלי..."},
    "english_name": {"type": "text_to_speech", "value": "My address is..."}
  },
  {
    "hebrew": {"type": "text", "value": "חוף ים"},
    "english_name": {"type": "text_to_speech", "value": "Beach"}
  },
  {
    "hebrew": {"type": "text", "value": "אוזניים"},
    "english_name": {"type": "text_to_speech", "value": "Ears"}
  },
  {
    "hebrew": {"type": "text", "value": "רגליים"},
    "english_name": {"type": "text_to_speech", "value": "Feet"}
  },
  {
    "hebrew": {"type": "text", "value": "גבינה"},
    "english_name": {"type": "text_to_speech", "value": "Cheese"}
  },
  {
    "hebrew": {"type": "text", "value": "ירוק"},
    "english_name": {"type": "text_to_speech", "value": "Green"}
  },
  {
    "hebrew": {"type": "text", "value": "לישון"},
    "english_name": {"type": "text_to_speech", "value": "Sleep"}
  },
  {
    "hebrew": {"type": "text", "value": "שיניים"},
    "english_name": {"type": "text_to_speech", "value": "Teeth"}
  },
  {
    "hebrew": {"type": "text", "value": "נקי"},
    "english_name": {"type": "text_to_speech", "value": "Clean"}
  },
  {
    "hebrew": {"type": "text", "value": "בשר"},
    "english_name": {"type": "text_to_speech", "value": "Meat"}
  },
  {
    "hebrew": {"type": "text", "value": "לקרוא"},
    "english_name": {"type": "text_to_speech", "value": "Read"}
  },
  {
    "hebrew": {"type": "text", "value": "מורה"},
    "english_name": {"type": "text_to_speech", "value": "Teacher"}
  },
  {
    "hebrew": {"type": "text", "value": "כסא"},
    "english_name": {"type": "text_to_speech", "value": "Chair"}
  },
  {
    "hebrew": {"type": "text", "value": "לשחק"},
    "english_name": {"type": "text_to_speech", "value": "Play"}
  },
  {
    "hebrew": {"type": "text", "value": "סירה"},
    "english_name": {"type": "text_to_speech", "value": "Boat"}
  },
  {
    "hebrew": {"type": "text", "value": "נהג"},
    "english_name": {"type": "text_to_speech", "value": "Drive"}
  },
  {
    "hebrew": {"type": "text", "value": "ללכת"},
    "english_name": {"type": "text_to_speech", "value": "Walk"}
  },
  {
    "hebrew": {"type": "text", "value": "באוטובוס/מכונית/רכבת"},
    "english_name": {"type": "text_to_speech", "value": "By bus/car/train"}
  },
  {
    "hebrew": {"type": "text", "value": "פרח"},
    "english_name": {"type": "text_to_speech", "value": "Flower"}
  },
  {
    "hebrew": {"type": "text", "value": "חום"},
    "english_name": {"type": "text_to_speech", "value": "Brown"}
  },
  {
    "hebrew": {"type": "text", "value": "בית"},
    "english_name": {"type": "text_to_speech", "value": "House"}
  },
  {
    "hebrew": {"type": "text", "value": "מאחור"},
    "english_name": {"type": "text_to_speech", "value": "Behind"}
  },
  {
    "hebrew": {"type": "text", "value": "מול"},
    "english_name": {"type": "text_to_speech", "value": "In front of"}
  },
  {
    "hebrew": {"type": "text", "value": "להתקרר"},
    "english_name": {"type": "text_to_speech", "value": "Cool"}
  },
  {
    "hebrew": {"type": "text", "value": "ספר"},
    "english_name": {"type": "text_to_speech", "value": "Book"}
  },
  {
    "hebrew": {"type": "text", "value": "עוגיה"},
    "english_name": {"type": "text_to_speech", "value": "Cookie"}
  },
  {
    "hebrew": {"type": "text", "value": "כיתה"},
    "english_name": {"type": "text_to_speech", "value": "Classroom"}
  },
  {
    "hebrew": {"type": "text", "value": "קפה"},
    "english_name": {"type": "text_to_speech", "value": "Coffee"}
  },
  {
    "hebrew": {"type": "text", "value": "מלכה"},
    "english_name": {"type": "text_to_speech", "value": "Queen"}
  },
  {
    "hebrew": {"type": "text", "value": "עץ"},
    "english_name": {"type": "text_to_speech", "value": "Tree"}
  },
  {
    "hebrew": {"type": "text", "value": "לאכול"},
    "english_name": {"type": "text_to_speech", "value": "Eat"}
  },
  {
    "hebrew": {"type": "text", "value": "בבקשה"},
    "english_name": {"type": "text_to_speech", "value": "Please"}
  },
  {
    "hebrew": {"type": "text", "value": "תה"},
    "english_name": {"type": "text_to_speech", "value": "Tea"}
  },
  {
    "hebrew": {"type": "text", "value": "רופא"},
    "english_name": {"type": "text_to_speech", "value": "Doctor"}
  },
  {
    "hebrew": {"type": "text", "value": "אנשים"},
    "english_name": {"type": "text_to_speech", "value": "People"}
  },
  {
    "hebrew": {"type": "text", "value": "שוטר"},
    "english_name": {"type": "text_to_speech", "value": "Police"}
  },
  {
    "hebrew": {"type": "text", "value": "שכן"},
    "english_name": {"type": "text_to_speech", "value": "Neighbor"}
  },
  {
    "hebrew": {"type": "text", "value": "מטוס"},
    "english_name": {"type": "text_to_speech", "value": "Airplane"}
  },
  {
    "hebrew": {"type": "text", "value": "שיער"},
    "english_name": {"type": "text_to_speech", "value": "Hair"}
  },
  {
    "hebrew": {"type": "text", "value": "גשם"},
    "english_name": {"type": "text_to_speech", "value": "Rain"}
  },
  {
    "hebrew": {"type": "text", "value": "רכבת"},
    "english_name": {"type": "text_to_speech", "value": "Train"}
  },
  {
    "hebrew": {"type": "text", "value": "לחכות"},
    "english_name": {"type": "text_to_speech", "value": "Wait"}
  },
  {
    "hebrew": {"type": "text", "value": "יום הולדת"},
    "english_name": {"type": "text_to_speech", "value": "Birthday"}
  },
  {
    "hebrew": {"type": "text", "value": "עפרונות צבעוניים"},
    "english_name": {"type": "text_to_speech", "value": "Crayons"}
  },
  {
    "hebrew": {"type": "text", "value": "אפור"},
    "english_name": {"type": "text_to_speech", "value": "Gray"}
  },
  {
    "hebrew": {"type": "text", "value": "היום"},
    "english_name": {"type": "text_to_speech", "value": "Today"}
  },
  {
    "hebrew": {"type": "text", "value": "מכונית"},
    "english_name": {"type": "text_to_speech", "value": "Car"}
  },
  {
    "hebrew": {"type": "text", "value": "לטוס/לעוף"},
    "english_name": {"type": "text_to_speech", "value": "Fly"}
  },
  {
    "hebrew": {"type": "text", "value": "ענן"},
    "english_name": {"type": "text_to_speech", "value": "Cloud"}
  },
  {
    "hebrew": {"type": "text", "value": "פרה"},
    "english_name": {"type": "text_to_speech", "value": "Cow"}
  },
  {
    "hebrew": {"type": "text", "value": "בחוץ"},
    "english_name": {"type": "text_to_speech", "value": "Outside"}
  },
  {
    "hebrew": {"type": "text", "value": "פה"},
    "english_name": {"type": "text_to_speech", "value": "Mouth"}
  },
  {
    "hebrew": {"type": "text", "value": "עיר"},
    "english_name": {"type": "text_to_speech", "value": "Town"}
  },
  {
    "hebrew": {"type": "text", "value": "מימין ל"},
    "english_name": {"type": "text_to_speech", "value": "To the right of"}
  },
  {
    "hebrew": {"type": "text", "value": "משמאל ל"},
    "english_name": {"type": "text_to_speech", "value": "To the left of"}
  },
  {
    "hebrew": {"type": "text", "value": "בלון"},
    "english_name": {"type": "text_to_speech", "value": "Balloon"}
  },
  {
    "hebrew": {"type": "text", "value": "מגפיים"},
    "english_name": {"type": "text_to_speech", "value": "Boots"}
  },
  {
    "hebrew": {"type": "text", "value": "איגלו"},
    "english_name": {"type": "text_to_speech", "value": "Igloo"}
  },
  {
    "hebrew": {"type": "text", "value": "אוכל"},
    "english_name": {"type": "text_to_speech", "value": "Food"}
  },
  {
    "hebrew": {"type": "text", "value": "נכון"},
    "english_name": {"type": "text_to_speech", "value": "Look"}
  },
  {
    "hebrew": {"type": "text", "value": "חשוב"},
    "english_name": {"type": "text_to_speech", "value": "Important"}
  },
  {
    "hebrew": {"type": "text", "value": "סימן"},
    "english_name": {"type": "text_to_speech", "value": "Sign"}
  },
  {
    "hebrew": {"type": "text", "value": "לחצות את הרחוב"},
    "english_name": {"type": "text_to_speech", "value": "Cross the street"}
  },
  {
    "hebrew": {"type": "text", "value": "גן חיות"},
    "english_name": {"type": "text_to_speech", "value": "Zoo"}
  },
  {
    "hebrew": {"type": "text", "value": "לכנס בבטח"},
    "english_name": {"type": "text_to_speech", "value": "Safe"}
  },
  {
    "hebrew": {"type": "text", "value": "רמזור"},
    "english_name": {"type": "text_to_speech", "value": "Traffic light"}
  }
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

CONFUSING_LETTERS : [
    {
        "letter": {
            "type": "text",
            "value": "B"
        },
        "confusingLetter": {
            "type": "text",
            "value": "b"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/b.mp3"
        },
        "groups": ["bd"]
    },
    {
        "letter": {
            "type": "text",
            "value": "D"
        },
        "confusingLetter": {
            "type": "text",
            "value": "d"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/d.mp3"
        },
        "groups": ["bd"]
    },
    {
        "letter": {
            "type": "text",
            "value": "P"
        },
        "confusingLetter": {
            "type": "text",
            "value": "p"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/p.mp3"
        },
        "groups": ["pq"]
    },
    {
        "letter": {
            "type": "text",
            "value": "Q"
        },
        "confusingLetter": {
            "type": "text",
            "value": "q"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/q.mp3"
        },
        "groups": ["pq"]
    },
    {
        "letter": {
            "type": "text",
            "value": "M"
        },
        "confusingLetter": {
            "type": "text",
            "value": "m"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/m.mp3"
        },
        "groups": ["mn"]
    },
    {
        "letter": {
            "type": "text",
            "value": "N"
        },
        "confusingLetter": {
            "type": "text",
            "value": "n"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/n.mp3"
        },
        "groups": ["mn"]
    },
    {
        "letter": {
            "type": "text",
            "value": "U"
        },
        "confusingLetter": {
            "type": "text",
            "value": "u"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/u.mp3"
        },
        "groups": ["uv"]
    },
    {
        "letter": {
            "type": "text",
            "value": "V"
        },
        "confusingLetter": {
            "type": "text",
            "value": "v"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/v.mp3"
        },
        "groups": ["uv"]
    },
    {
        "letter": {
            "type": "text",
            "value": "H"
        },
        "confusingLetter": {
            "type": "text",
            "value": "h"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/h.mp3"
        },
        "groups": ["hn"]
    },
    {
        "letter": {
            "type": "text",
            "value": "N"
        },
        "confusingLetter": {
            "type": "text",
            "value": "n"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/n.mp3"
        },
        "groups": ["hn"]
    },
    {
        "letter": {
            "type": "text",
            "value": "J"
        },
        "confusingLetter": {
            "type": "text",
            "value": "j"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/j.mp3"
        },
        "groups": ["gj"]
    },
    {
        "letter": {
            "type": "text",
            "value": "G"
        },
        "confusingLetter": {
            "type": "text",
            "value": "g"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/g.mp3"
        },
        "groups": ["gj"]
    },
    {
        "letter": {
            "type": "text",
            "value": "I"
        },
        "confusingLetter": {
            "type": "text",
            "value": "i"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/i.mp3"
        },
        "groups": ["il"]
    },
    {
        "letter": {
            "type": "text",
            "value": "L"
        },
        "confusingLetter": {
            "type": "text",
            "value": "l"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/l.mp3"
        },
        "groups": ["il"]
    },
    {
        "letter": {
            "type": "text",
            "value": "W"
        },
        "confusingLetter": {
            "type": "text",
            "value": "w"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/w.mp3"
        },
        "groups": ["wm"]
    },
    {
        "letter": {
            "type": "text",
            "value": "M"
        },
        "confusingLetter": {
            "type": "text",
            "value": "m"
        },
        "audio": {
            "type": "audio",
            "value": "./sounds/letters/m.mp3"
        },
        "groups": ["wm"]
    },
    {
            "letter": {
                "type": "text",
                "value": "b"
            },
            "confusingLetter": {
                "type": "text",
                "value": "B"
            },
            "audio": {
                "type": "audio",
                "value": "./sounds/letters/b.mp3"
            },
            "groups": ["BD"]
        },
        {
            "letter": {
                "type": "text",
                "value": "d"
            },
            "confusingLetter": {
                "type": "text",
                "value": "D"
            },
            "audio": {
                "type": "audio",
                "value": "./sounds/letters/d.mp3"
            },
            "groups": ["BD"]
        },
        {
            "letter": {
                "type": "text",
                "value": "p"
            },
            "confusingLetter": {
                "type": "text",
                "value": "P"
            },
            "audio": {
                "type": "audio",
                "value": "./sounds/letters/p.mp3"
            },
            "groups": ["PQ"]
        },
        {
            "letter": {
                "type": "text",
                "value": "q"
            },
            "confusingLetter": {
                "type": "text",
                "value": "Q"
            },
            "audio": {
                "type": "audio",
                "value": "./sounds/letters/q.mp3"
            },
            "groups": ["PQ"]
        },
        {
            "letter": {
                "type": "text",
                "value": "m"
            },
            "confusingLetter": {
                "type": "text",
                "value": "M"
            },
            "audio": {
                "type": "audio",
                "value": "./sounds/letters/m.mp3"
            },
            "groups": ["MN"]
        },
        {
            "letter": {
                "type": "text",
                "value": "n"
            },
            "confusingLetter": {
                "type": "text",
                "value": "N"
            },
            "audio": {
                "type": "audio",
                "value": "./sounds/letters/n.mp3"
            },
            "groups": ["MN"]
        },
        {
            "letter": {
                "type": "text",
                "value": "u"
            },
            "confusingLetter": {
                "type": "text",
                "value": "U"
            },
            "audio": {
                "type": "audio",
                "value": "./sounds/letters/u.mp3"
            },
            "groups": ["UV"]
        },
        {
            "letter": {
                "type": "text",
                "value": "v"
            },
            "confusingLetter": {
                "type": "text",
                "value": "V"
            },
            "audio": {
                "type": "audio",
                "value": "./sounds/letters/v.mp3"
            },
            "groups": ["UV"]
        },
        {
            "letter": {
                "type": "text",
                "value": "i"
            },
            "confusingLetter": {
                "type": "text",
                "value": "I"
            },
            "audio": {
                "type": "audio",
                "value": "./sounds/letters/i.mp3"
            },
            "groups": ["IL"]
        },
        {
            "letter": {
                "type": "text",
                "value": "l"
            },
            "confusingLetter": {
                "type": "text",
                "value": "L"
            },
            "audio": {
                "type": "audio",
                "value": "./sounds/letters/l.mp3"
            },
            "groups": ["IL"]
        },
        {
            "letter": {
                "type": "text",
                "value": "w"
            },
            "confusingLetter": {
                "type": "text",
                "value": "W"
            },
            "audio": {
                "type": "audio",
                "value": "./sounds/letters/w.mp3"
            },
            "groups": ["WM"]
        },
        {
            "letter": {
                "type": "text",
                "value": "m"
            },
            "confusingLetter": {
                "type": "text",
                "value": "M"
            },
            "audio": {
                "type": "audio",
                "value": "./sounds/letters/m.mp3"
            },
            "groups": ["WM"]
        }
],

FIVE_LITTLE_DUCKS: [
{
  "name": {"type": "text", "value": "חמש"},
  "english_name": {"type": "text_to_speech", "value": "Five"},
  "hebrew_english_name": {"type": "text", "value": "פַיְב"}
},
{
  "name": {"type": "text", "value": "קטן"},
  "english_name": {"type": "text_to_speech", "value": "Little"},
  "hebrew_english_name": {"type": "text", "value": "לִיטֶל"}
},
{
  "name": {"type": "text", "value": "ברווזים"},
  "english_name": {"type": "text_to_speech", "value": "Ducks"},
  "hebrew_english_name": {"type": "text", "value": "דַאקס"}
},
{
  "name": {"type": "text", "value": "הלכו"},
  "english_name": {"type": "text_to_speech", "value": "Went"},
  "hebrew_english_name": {"type": "text", "value": "וֶנְט"}
},
{
  "name": {"type": "text", "value": "חוצה"},
  "english_name": {"type": "text_to_speech", "value": "Out"},
  "hebrew_english_name": {"type": "text", "value": "אַוּט"}
},
{
  "name": {"type": "text", "value": "אחד"},
  "english_name": {"type": "text_to_speech", "value": "One"},
  "hebrew_english_name": {"type": "text", "value": "וָאן"}
},
{
  "name": {"type": "text", "value": "יום"},
  "english_name": {"type": "text_to_speech", "value": "Day"},
  "hebrew_english_name": {"type": "text", "value": "דֵי"}
},
{
  "name": {"type": "text", "value": "מעל"},
  "english_name": {"type": "text_to_speech", "value": "Over"},
  "hebrew_english_name": {"type": "text", "value": "אוֹבֶר"}
},
{
  "name": {"type": "text", "value": "ה"},
  "english_name": {"type": "text_to_speech", "value": "The"},
  "hebrew_english_name": {"type": "text", "value": "דַ"}
},
{
  "name": {"type": "text", "value": "גבעות"},
  "english_name": {"type": "text_to_speech", "value": "Hills"},
  "hebrew_english_name": {"type": "text", "value": "הִילְס"}
},
{
  "name": {"type": "text", "value": "וגם"},
  "english_name": {"type": "text_to_speech", "value": "And"},
  "hebrew_english_name": {"type": "text", "value": "אֶנְד"}
},
{
  "name": {"type": "text", "value": "רחוק"},
  "english_name": {"type": "text_to_speech", "value": "Far Away"},
  "hebrew_english_name": {"type": "text", "value": "פָאר"}
},
{
  "name": {"type": "text", "value": "אמא"},
  "english_name": {"type": "text_to_speech", "value": "Mother"},
  "hebrew_english_name": {"type": "text", "value": "מַדֶ'ר"}
},
{
  "name": {"type": "text", "value": "ברווז"},
  "english_name": {"type": "text_to_speech", "value": "Duck"},
  "hebrew_english_name": {"type": "text", "value": "דָאק"}
},
{
  "name": {"type": "text", "value": "אמר"},
  "english_name": {"type": "text_to_speech", "value": "Said"},
  "hebrew_english_name": {"type": "text", "value": "סֵד"}
},
{
  "name": {"type": "text", "value": "קוואק"},
  "english_name": {"type": "text_to_speech", "value": "Quack"},
  "hebrew_english_name": {"type": "text", "value": "קוַאק"}
},
{
  "name": {"type": "text", "value": "אבל"},
  "english_name": {"type": "text_to_speech", "value": "But"},
  "hebrew_english_name": {"type": "text", "value": "בַּט"}
},
{
  "name": {"type": "text", "value": "רק"},
  "english_name": {"type": "text_to_speech", "value": "Only"},
  "hebrew_english_name": {"type": "text", "value": "אוֹנְלִי"}
},
{
  "name": {"type": "text", "value": "ארבע"},
  "english_name": {"type": "text_to_speech", "value": "Four"},
  "hebrew_english_name": {"type": "text", "value": "פוֹר"}
},
{
  "name": {"type": "text", "value": "חזר"},
  "english_name": {"type": "text_to_speech", "value": "Came"},
  "hebrew_english_name": {"type": "text", "value": "קֵיְם"}
},
{
  "name": {"type": "text", "value": "חזרה"},
  "english_name": {"type": "text_to_speech", "value": "Back"},
  "hebrew_english_name": {"type": "text", "value": "בַּק"}
},
{
  "name": {"type": "text", "value": "שלוש"},
  "english_name": {"type": "text_to_speech", "value": "Three"},
  "hebrew_english_name": {"type": "text", "value": "ת'רִי"}
},
{
  "name": {"type": "text", "value": "שתיים"},
  "english_name": {"type": "text_to_speech", "value": "Two"},
  "hebrew_english_name": {"type": "text", "value": "טְווּ"}
},
{
  "name": {"type": "text", "value": "אף אחד"},
  "english_name": {"type": "text_to_speech", "value": "None"},
  "hebrew_english_name": {"type": "text", "value": "נַאן"}
},
{
  "name": {"type": "text", "value": "של"},
  "english_name": {"type": "text_to_speech", "value": "Of"},
  "hebrew_english_name": {"type": "text", "value": "אוֹב"}
}
],
  OLD_MACDONALD: [
    {
      "name": {"type": "text", "value": "זקן"},
      "english_name": {"type": "text_to_speech", "value": "Old"},
      "hebrew_english_name": {"type": "text", "value": "אוֹלְד"}
    },
    {
      "name": {"type": "text", "value": "מקדונלד"},
      "english_name": {"type": "text_to_speech", "value": "Macdonald"},
      "hebrew_english_name": {"type": "text", "value": "מַקְדּוֹנַלְד"}
    },
    {
      "name": {"type": "text", "value": "היה"},
      "english_name": {"type": "text_to_speech", "value": "Had"},
      "hebrew_english_name": {"type": "text", "value": "הַד"}
    },
    {
      "name": {"type": "text", "value": "א"},
      "english_name": {"type": "text_to_speech", "value": "A"},
      "hebrew_english_name": {"type": "text", "value": "אֵי"}
    },
    {
      "name": {"type": "text", "value": "חווה"},
      "english_name": {"type": "text_to_speech", "value": "Farm"},
      "hebrew_english_name": {"type": "text", "value": "פַארְם"}
    },
    {
      "name": {"type": "text", "value": "אי-אי-או"},
      "english_name": {"type": "text_to_speech", "value": "E-I-E-I-O"},
      "hebrew_english_name": {"type": "text", "value": "אִי-אִי-אוֹ"}
    },
    {
      "name": {"type": "text", "value": "וגם"},
      "english_name": {"type": "text_to_speech", "value": "And"},
      "hebrew_english_name": {"type": "text", "value": "אֶנְד"}
    },
    {
      "name": {"type": "text", "value": "בזה"},
      "english_name": {"type": "text_to_speech", "value": "On"},
      "hebrew_english_name": {"type": "text", "value": "אוֹן"}
    },
    {
      "name": {"type": "text", "value": "ש"},
      "english_name": {"type": "text_to_speech", "value": "That"},
      "hebrew_english_name": {"type": "text", "value": "זַ"}
    },
    {
      "name": {"type": "text", "value": "הוא"},
      "english_name": {"type": "text_to_speech", "value": "He"},
      "hebrew_english_name": {"type": "text", "value": "הִי"}
    },
    {
      "name": {"type": "text", "value": "פרה"},
      "english_name": {"type": "text_to_speech", "value": "Cow"},
      "hebrew_english_name": {"type": "text", "value": "קַאוּ"}
    },
    {
      "name": {"type": "text", "value": "עם"},
      "english_name": {"type": "text_to_speech", "value": "With"},
      "hebrew_english_name": {"type": "text", "value": "וִוית"}
    },
    {
      "name": {"type": "text", "value": "מו"},
      "english_name": {"type": "text_to_speech", "value": "Moo"},
      "hebrew_english_name": {"type": "text", "value": "מוּ"}
    },
    {
      "name": {"type": "text", "value": "כאן"},
      "english_name": {"type": "text_to_speech", "value": "Here"},
      "hebrew_english_name": {"type": "text", "value": "הִיר"}
    },
    {
      "name": {"type": "text", "value": "שם"},
      "english_name": {"type": "text_to_speech", "value": "There"},
      "hebrew_english_name": {"type": "text", "value": "דֵ'ר"}
    },
    {
      "name": {"type": "text", "value": "בכל מקום"},
      "english_name": {"type": "text_to_speech", "value": "Everywhere"},
      "hebrew_english_name": {"type": "text", "value": "אֵבְרִיוֶור"}
    },
    {
      "name": {"type": "text", "value": "תרנגולת"},
      "english_name": {"type": "text_to_speech", "value": "Chicken"},
      "hebrew_english_name": {"type": "text", "value": "צִ'יקֶן"}
    },
    {
      "name": {"type": "text", "value": "כבש"},
      "english_name": {"type": "text_to_speech", "value": "Sheep"},
      "hebrew_english_name": {"type": "text", "value": "שִיפ"}
    },
    {
      "name": {"type": "text", "value": "סוס"},
      "english_name": {"type": "text_to_speech", "value": "Horse"},
      "hebrew_english_name": {"type": "text", "value": "הוֹרְס"}
    },
    {
      "name": {"type": "text", "value": "עז"},
      "english_name": {"type": "text_to_speech", "value": "Goat"},
      "hebrew_english_name": {"type": "text", "value": "גוֹט"}
    },
    {
      "name": {"type": "text", "value": "ברווז"},
      "english_name": {"type": "text_to_speech", "value": "Duck"},
      "hebrew_english_name": {"type": "text", "value": "דָאק"}
    },
    {
      "name": {"type": "text", "value": "קוואק"},
      "english_name": {"type": "text_to_speech", "value": "Quack"},
      "hebrew_english_name": {"type": "text", "value": "קוַאק"}
    },
    {
      "name": {"type": "text", "value": "אווז"},
      "english_name": {"type": "text_to_speech", "value": "Goose"},
      "hebrew_english_name": {"type": "text", "value": "גוּס"}
    },
    {
      "name": {"type": "text", "value": "חמור"},
      "english_name": {"type": "text_to_speech", "value": "Donkey"},
      "hebrew_english_name": {"type": "text", "value": "דַאנְקִי"}
    },
    {
      "name": {"type": "text", "value": "יונה"},
      "english_name": {"type": "text_to_speech", "value": "Pigeon"},
      "hebrew_english_name": {"type": "text", "value": "פִּיגֵ'ן"}
    },
    {
      "name": {"type": "text", "value": "כלב"},
      "english_name": {"type": "text_to_speech", "value": "Dog"},
      "hebrew_english_name": {"type": "text", "value": "דוֹג"}
    },
    {
      "name": {"type": "text", "value": "וואף"},
      "english_name": {"type": "text_to_speech", "value": "Woof"},
      "hebrew_english_name": {"type": "text", "value": "ווּף"}
    },
    {
      "name": {"type": "text", "value": "חתול"},
      "english_name": {"type": "text_to_speech", "value": "Cat"},
      "hebrew_english_name": {"type": "text", "value": "קָאט"}
    },
    {
      "name": {"type": "text", "value": "מיאו"},
      "english_name": {"type": "text_to_speech", "value": "Meow"},
      "hebrew_english_name": {"type": "text", "value": "מִיאָו"}
    }
  ],

FIVE_LITTLE_MONKEYS: [
{
  "name": {"type": "text", "value": "חמש"},
  "english_name": {"type": "text_to_speech", "value": "Five"},
  "hebrew_english_name": {"type": "text", "value": "פַיְב"}
},
{
  "name": {"type": "text", "value": "קטן"},
  "english_name": {"type": "text_to_speech", "value": "Little"},
  "hebrew_english_name": {"type": "text", "value": "לִיטֶל"}
},
{
  "name": {"type": "text", "value": "קופים"},
  "english_name": {"type": "text_to_speech", "value": "Monkeys"},
  "hebrew_english_name": {"type": "text", "value": "מוֹנְקִיז"}
},
{
  "name": {"type": "text", "value": "קופצים"},
  "english_name": {"type": "text_to_speech", "value": "Jumping"},
  "hebrew_english_name": {"type": "text", "value": "גַ'מְפִּינג"}
},
{
  "name": {"type": "text", "value": "על"},
  "english_name": {"type": "text_to_speech", "value": "On"},
  "hebrew_english_name": {"type": "text", "value": "אוֹן"}
},
{
  "name": {"type": "text", "value": "ה"},
  "english_name": {"type": "text_to_speech", "value": "The"},
  "hebrew_english_name": {"type": "text", "value": "דַ"}
},
{
  "name": {"type": "text", "value": "מיטה"},
  "english_name": {"type": "text_to_speech", "value": "Bed"},
  "hebrew_english_name": {"type": "text", "value": "בֵּד"}
},
{
  "name": {"type": "text", "value": "אחד"},
  "english_name": {"type": "text_to_speech", "value": "One"},
  "hebrew_english_name": {"type": "text", "value": "וָאן"}
},
{
  "name": {"type": "text", "value": "נפל"},
  "english_name": {"type": "text_to_speech", "value": "Fell"},
  "hebrew_english_name": {"type": "text", "value": "פֶל"}
},
{
  "name": {"type": "text", "value": "למטה"},
  "english_name": {"type": "text_to_speech", "value": "Down"},
  "hebrew_english_name": {"type": "text", "value": "דַאוּן"}
},
{
  "name": {"type": "text", "value": "וגם"},
  "english_name": {"type": "text_to_speech", "value": "And"},
  "hebrew_english_name": {"type": "text", "value": "אֶנְד"}
},
{
  "name": {"type": "text", "value": "חבט"},
  "english_name": {"type": "text_to_speech", "value": "Bumped"},
  "hebrew_english_name": {"type": "text", "value": "בַּמְפְּד"}
},
{
  "name": {"type": "text", "value": "שלו"},
  "english_name": {"type": "text_to_speech", "value": "His"},
  "hebrew_english_name": {"type": "text", "value": "הִיז"}
},
{
  "name": {"type": "text", "value": "ראש"},
  "english_name": {"type": "text_to_speech", "value": "Head"},
  "hebrew_english_name": {"type": "text", "value": "הֶד"}
},
{
  "name": {"type": "text", "value": "אמא"},
  "english_name": {"type": "text_to_speech", "value": "Mama"},
  "hebrew_english_name": {"type": "text", "value": "מַמַא"}
},
{
  "name": {"type": "text", "value": "קראה"},
  "english_name": {"type": "text_to_speech", "value": "Called"},
  "hebrew_english_name": {"type": "text", "value": "קוֹלְד"}
},
{
  "name": {"type": "text", "value": "רופא"},
  "english_name": {"type": "text_to_speech", "value": "Doctor"},
  "hebrew_english_name": {"type": "text", "value": "דּוֹקְטוֹר"}
},
{
  "name": {"type": "text", "value": "אמר"},
  "english_name": {"type": "text_to_speech", "value": "Said"},
  "hebrew_english_name": {"type": "text", "value": "סֵד"}
},
{
  "name": {"type": "text", "value": "לא"},
  "english_name": {"type": "text_to_speech", "value": "No"},
  "hebrew_english_name": {"type": "text", "value": "נוֹ"}
},
{
  "name": {"type": "text", "value": "עוד"},
  "english_name": {"type": "text_to_speech", "value": "More"},
  "hebrew_english_name": {"type": "text", "value": "מוֹר"}
},
{
  "name": {"type": "text", "value": "מיטה!"},
  "english_name": {"type": "text_to_speech", "value": "Bed!"},
  "hebrew_english_name": {"type": "text", "value": "בֵּד!"}
},
{
  "name": {"type": "text", "value": "ארבע"},
  "english_name": {"type": "text_to_speech", "value": "Four"},
  "hebrew_english_name": {"type": "text", "value": "פוֹר"}
},
{
  "name": {"type": "text", "value": "שלוש"},
  "english_name": {"type": "text_to_speech", "value": "Three"},
  "hebrew_english_name": {"type": "text", "value": "ת'רִי"}
},
{
  "name": {"type": "text", "value": "שלה"},
  "english_name": {"type": "text_to_speech", "value": "Her"},
  "hebrew_english_name": {"type": "text", "value": "הֶר"}
},
{
  "name": {"type": "text", "value": "שתיים"},
  "english_name": {"type": "text_to_speech", "value": "Two"},
  "hebrew_english_name": {"type": "text", "value": "טְווּ"}
},
{
  "name": {"type": "text", "value": "קוף"},
  "english_name": {"type": "text_to_speech", "value": "Monkey"},
  "hebrew_english_name": {"type": "text", "value": "מוֹנְקִי"}
},
{
  "name": {"type": "text", "value": "היא"},
  "english_name": {"type": "text_to_speech", "value": "She"},
  "hebrew_english_name": {"type": "text", "value": "שִי"}
},
{
  "name": {"type": "text", "value": "שמה"},
  "english_name": {"type": "text_to_speech", "value": "Put"},
  "hebrew_english_name": {"type": "text", "value": "פּוּט"}
},
{
  "name": {"type": "text", "value": "האלה"},
  "english_name": {"type": "text_to_speech", "value": "Those"},
  "hebrew_english_name": {"type": "text", "value": "תוֹז"}
},
{
  "name": {"type": "text", "value": "ימין"},
  "english_name": {"type": "text_to_speech", "value": "Right"},
  "hebrew_english_name": {"type": "text", "value": "רַיְט"}
},
{
  "name": {"type": "text", "value": "אל"},
  "english_name": {"type": "text_to_speech", "value": "To"},
  "hebrew_english_name": {"type": "text", "value": "טוּ"}
}
],

JUMP: [
{
  "name": {"type": "text", "value": "חייב"},
  "english_name": {"type": "text_to_speech", "value": "Gotta"},
  "hebrew_english_name": {"type": "text", "value": "גָאטָה"}
},
{
  "name": {"type": "text", "value": "לשמור"},
  "english_name": {"type": "text_to_speech", "value": "Keep"},
  "hebrew_english_name": {"type": "text", "value": "קִיפּ"}
},
{
  "name": {"type": "text", "value": "אחד"},
  "english_name": {"type": "text_to_speech", "value": "One"},
  "hebrew_english_name": {"type": "text", "value": "וָאן"}
},
{
  "name": {"type": "text", "value": "קפיצה"},
  "english_name": {"type": "text_to_speech", "value": "Jump"},
  "hebrew_english_name": {"type": "text", "value": "גַ'מְפּ"}
},
{
  "name": {"type": "text", "value": "קדימה"},
  "english_name": {"type": "text_to_speech", "value": "Ahead"},
  "hebrew_english_name": {"type": "text", "value": "אַהֶד"}
},
{
  "name": {"type": "text", "value": "של"},
  "english_name": {"type": "text_to_speech", "value": "Of"},
  "hebrew_english_name": {"type": "text", "value": "אוֹב"}
},
{
  "name": {"type": "text", "value": "ה"},
  "english_name": {"type": "text_to_speech", "value": "The"},
  "hebrew_english_name": {"type": "text", "value": "דַ"}
},
{
  "name": {"type": "text", "value": "שורת הלחם"},
  "english_name": {"type": "text_to_speech", "value": "Breadline"},
  "hebrew_english_name": {"type": "text", "value": "בְּרֵדְלַיְן"}
},
{
  "name": {"type": "text", "value": "לנפנף"},
  "english_name": {"type": "text_to_speech", "value": "Swing"},
  "hebrew_english_name": {"type": "text", "value": "סְוִוינְג"}
},
{
  "name": {"type": "text", "value": "חרב"},
  "english_name": {"type": "text_to_speech", "value": "Sword"},
  "hebrew_english_name": {"type": "text", "value": "סוֹרְד"}
},
{
  "name": {"type": "text", "value": "אני"},
  "english_name": {"type": "text_to_speech", "value": "I"},
  "hebrew_english_name": {"type": "text", "value": "אַי"}
},
{
  "name": {"type": "text", "value": "לגנוב"},
  "english_name": {"type": "text_to_speech", "value": "Steal"},
  "hebrew_english_name": {"type": "text", "value": "סְטִיל"}
},
{
  "name": {"type": "text", "value": "רק"},
  "english_name": {"type": "text_to_speech", "value": "Only"},
  "hebrew_english_name": {"type": "text", "value": "אוֹנְלִי"}
},
{
  "name": {"type": "text", "value": "מה"},
  "english_name": {"type": "text_to_speech", "value": "What"},
  "hebrew_english_name": {"type": "text", "value": "וָאט"}
},
{
  "name": {"type": "text", "value": "לא יכול"},
  "english_name": {"type": "text_to_speech", "value": "Can't"},
  "hebrew_english_name": {"type": "text", "value": "קַאנט"}
},
{
  "name": {"type": "text", "value": "לרשות לעצמי"},
  "english_name": {"type": "text_to_speech", "value": "Afford"},
  "hebrew_english_name": {"type": "text", "value": "אַפוֹרד"}
},
{
  "name": {"type": "text", "value": "וגם"},
  "english_name": {"type": "text_to_speech", "value": "And"},
  "hebrew_english_name": {"type": "text", "value": "אֶנְד"}
},
{
  "name": {"type": "text", "value": "זה"},
  "english_name": {"type": "text_to_speech", "value": "That's"},
  "hebrew_english_name": {"type": "text", "value": "זַאטְס"}
},
{
  "name": {"type": "text", "value": "הכל"},
  "english_name": {"type": "text_to_speech", "value": "Everything"},
  "hebrew_english_name": {"type": "text", "value": "אֵבְרִיתִ'ינג"}
},
{
  "name": {"type": "text", "value": "שומרי החוק"},
  "english_name": {"type": "text_to_speech", "value": "Lawmen"},
  "hebrew_english_name": {"type": "text", "value": "לוֹמֵן"}
},
{
  "name": {"type": "text", "value": "הכל"},
  "english_name": {"type": "text_to_speech", "value": "All"},
  "hebrew_english_name": {"type": "text", "value": "אוֹל"}
},
{
  "name": {"type": "text", "value": "לא"},
  "english_name": {"type": "text_to_speech", "value": "No"},
  "hebrew_english_name": {"type": "text", "value": "נוֹ"}
},
{
  "name": {"type": "text", "value": "בדיחה"},
  "english_name": {"type": "text_to_speech", "value": "Joke"},
  "hebrew_english_name": {"type": "text", "value": "ג'וֹק"}
},
{
  "name": {"type": "text", "value": "האלה"},
  "english_name": {"type": "text_to_speech", "value": "These"},
  "hebrew_english_name": {"type": "text", "value": "דִיז"}
},
{
  "name": {"type": "text", "value": "בחורים"},
  "english_name": {"type": "text_to_speech", "value": "Guys"},
  "hebrew_english_name": {"type": "text", "value": "גַיְז"}
},
{
  "name": {"type": "text", "value": "לא"},
  "english_name": {"type": "text_to_speech", "value": "Don't"},
  "hebrew_english_name": {"type": "text", "value": "דוֹנְט"}
},
{
  "name": {"type": "text", "value": "מעריכים"},
  "english_name": {"type": "text_to_speech", "value": "Appreciate"},
  "hebrew_english_name": {"type": "text", "value": "אַפְּרִישִיֵיט"}
},
{
  "name": {"type": "text", "value": "אני"},
  "english_name": {"type": "text_to_speech", "value": "I'm"},
  "hebrew_english_name": {"type": "text", "value": "אַי'ם"}
},
{
  "name": {"type": "text", "value": "שבור"},
  "english_name": {"type": "text_to_speech", "value": "Broke"},
  "hebrew_english_name": {"type": "text", "value": "בְּרוֹק"}
}],

PRINCE: [
    {
      "name": {"type": "text", "value": "עשה"},
      "english_name": {"type": "text_to_speech", "value": "Make"},
      "hebrew_english_name": {"type": "text", "value": "מֵייק"}
    },
    {
      "name": {"type": "text", "value": "דרך"},
      "english_name": {"type": "text_to_speech", "value": "Way"},
      "hebrew_english_name": {"type": "text", "value": "וֵיי"}
    },
    {
      "name": {"type": "text", "value": "בשביל"},
      "english_name": {"type": "text_to_speech", "value": "For"},
      "hebrew_english_name": {"type": "text", "value": "פוֹר"}
    },
    {
      "name": {"type": "text", "value": "נסיך"},
      "english_name": {"type": "text_to_speech", "value": "Prince"},
      "hebrew_english_name": {"type": "text", "value": "פּרִינְס"}
    },
    {
      "name": {"type": "text", "value": "עלי"},
      "english_name": {"type": "text_to_speech", "value": "Ali"},
      "hebrew_english_name": {"type": "text", "value": "עַלִי"}
    },
    {
      "name": {"type": "text", "value": "אמור"},
      "english_name": {"type": "text_to_speech", "value": "Say"},
      "hebrew_english_name": {"type": "text", "value": "סֵי"}
    },
    {
      "name": {"type": "text", "value": "היי"},
      "english_name": {"type": "text_to_speech", "value": "Hey"},
      "hebrew_english_name": {"type": "text", "value": "הֵיי"}
    },
    {
      "name": {"type": "text", "value": "זה"},
      "english_name": {"type": "text_to_speech", "value": "It's"},
      "hebrew_english_name": {"type": "text", "value": "אִיטְס"}
    },
    {
      "name": {"type": "text", "value": "היי"},
      "english_name": {"type": "text_to_speech", "value": "Hey"},
      "hebrew_english_name": {"type": "text", "value": "הֵיי"}
    },
    {
      "name": {"type": "text", "value": "ברור"},
      "english_name": {"type": "text_to_speech", "value": "Clear"},
      "hebrew_english_name": {"type": "text", "value": "קְלִיר"}
    },
    {
      "name": {"type": "text", "value": "ה"},
      "english_name": {"type": "text_to_speech", "value": "The"},
      "hebrew_english_name": {"type": "text", "value": "דַ"}
    },
    {
      "name": {"type": "text", "value": "ב"},
      "english_name": {"type": "text_to_speech", "value": "In"},
      "hebrew_english_name": {"type": "text", "value": "אִין"}
    },
    {
      "name": {"type": "text", "value": "ישן"},
      "english_name": {"type": "text_to_speech", "value": "Old"},
      "hebrew_english_name": {"type": "text", "value": "אוֹלְד"}
    },
    {
      "name": {"type": "text", "value": "בזאר"},
      "english_name": {"type": "text_to_speech", "value": "Bazaar"},
      "hebrew_english_name": {"type": "text", "value": "בָּזָאר"}
    },
    {
      "name": {"type": "text", "value": "אתה"},
      "english_name": {"type": "text_to_speech", "value": "You"},
      "hebrew_english_name": {"type": "text", "value": "יוּ"}
    },
    {
      "name": {"type": "text", "value": "תן"},
      "english_name": {"type": "text_to_speech", "value": "Let"},
      "hebrew_english_name": {"type": "text", "value": "לֵט"}
    },
    {
      "name": {"type": "text", "value": "לנו"},
      "english_name": {"type": "text_to_speech", "value": "Us"},
      "hebrew_english_name": {"type": "text", "value": "אַס"}
    },
    {
      "name": {"type": "text", "value": "לעבור"},
      "english_name": {"type": "text_to_speech", "value": "Through"},
      "hebrew_english_name": {"type": "text", "value": "תְרוּ"}
    },
    {
      "name": {"type": "text", "value": "א"},
      "english_name": {"type": "text_to_speech", "value": "A"},
      "hebrew_english_name": {"type": "text", "value": "אֵי"}
    },
    {
      "name": {"type": "text", "value": "חדש לגמרי"},
      "english_name": {"type": "text_to_speech", "value": "Brand-new"},
      "hebrew_english_name": {"type": "text", "value": "בְּרַאנְד-נוּ"}
    },
    {
      "name": {"type": "text", "value": "כוכב"},
      "english_name": {"type": "text_to_speech", "value": "Star"},
      "hebrew_english_name": {"type": "text", "value": "סְטַאר"}
    },
    {
      "name": {"type": "text", "value": "אוי"},
      "english_name": {"type": "text_to_speech", "value": "Oh"},
      "hebrew_english_name": {"type": "text", "value": "אוֹ"}
    },
    {
      "name": {"type": "text", "value": "בוא"},
      "english_name": {"type": "text_to_speech", "value": "Come"},
      "hebrew_english_name": {"type": "text", "value": "קַם"}
    },
    {
      "name": {"type": "text", "value": "תהיה"},
      "english_name": {"type": "text_to_speech", "value": "Be"},
      "hebrew_english_name": {"type": "text", "value": "בִּי"}
    },
    {
      "name": {"type": "text", "value": "ראשון"},
      "english_name": {"type": "text_to_speech", "value": "First"},
      "hebrew_english_name": {"type": "text", "value": "פֶרְסְט"}
    },
    {
      "name": {"type": "text", "value": "על"},
      "english_name": {"type": "text_to_speech", "value": "On"},
      "hebrew_english_name": {"type": "text", "value": "אוֹן"}
    },
    {
      "name": {"type": "text", "value": "שלך"},
      "english_name": {"type": "text_to_speech", "value": "Your"},
      "hebrew_english_name": {"type": "text", "value": "יוֹר"}
    },
    {
      "name": {"type": "text", "value": "בלוק"},
      "english_name": {"type": "text_to_speech", "value": "Block"},
      "hebrew_english_name": {"type": "text", "value": "בְּלוֹק"}
    },
    {
      "name": {"type": "text", "value": "לפגוש"},
      "english_name": {"type": "text_to_speech", "value": "Meet"},
      "hebrew_english_name": {"type": "text", "value": "מִיט"}
    },
    {
      "name": {"type": "text", "value": "שלו"},
      "english_name": {"type": "text_to_speech", "value": "His"},
      "hebrew_english_name": {"type": "text", "value": "הִיז"}
    },
    {
      "name": {"type": "text", "value": "עין"},
      "english_name": {"type": "text_to_speech", "value": "Eye"},
      "hebrew_english_name": {"type": "text", "value": "אַי"}
    },
    {
      "name": {"type": "text", "value": "כאן"},
      "english_name": {"type": "text_to_speech", "value": "Here"},
      "hebrew_english_name": {"type": "text", "value": "הִיר"}
    },
    {
      "name": {"type": "text", "value": "הוא"},
      "english_name": {"type": "text_to_speech", "value": "He"},
      "hebrew_english_name": {"type": "text", "value": "הִי"}
    },
    {
      "name": {"type": "text", "value": "באים"},
      "english_name": {"type": "text_to_speech", "value": "Comes"},
      "hebrew_english_name": {"type": "text", "value": "קַאמְז"}
    },
    {
      "name": {"type": "text", "value": "צלצול"},
      "english_name": {"type": "text_to_speech", "value": "Ring"},
      "hebrew_english_name": {"type": "text", "value": "רִינג"}
    },
    {
      "name": {"type": "text", "value": "פעמונים"},
      "english_name": {"type": "text_to_speech", "value": "Bells"},
      "hebrew_english_name": {"type": "text", "value": "בֵּלְס"}
    },
    {
      "name": {"type": "text", "value": "תוף"},
      "english_name": {"type": "text_to_speech", "value": "Bang"},
      "hebrew_english_name": {"type": "text", "value": "בַּנְג"}
    },
    {
      "name": {"type": "text", "value": "תופים"},
      "english_name": {"type": "text_to_speech", "value": "Drums"},
      "hebrew_english_name": {"type": "text", "value": "דְרַאמְס"}
    },
    {
      "name": {"type": "text", "value": "אתה"},
      "english_name": {"type": "text_to_speech", "value": "You're"},
      "hebrew_english_name": {"type": "text", "value": "יוּר"}
    },
    {
      "name": {"type": "text", "value": "הולך"},
      "english_name": {"type": "text_to_speech", "value": "Gonna"},
      "hebrew_english_name": {"type": "text", "value": "גוֹנַה"}
    },
    {
      "name": {"type": "text", "value": "לאהוב"},
      "english_name": {"type": "text_to_speech", "value": "Love"},
      "hebrew_english_name": {"type": "text", "value": "לָאב"}
    },
    {
      "name": {"type": "text", "value": "את"},
      "english_name": {"type": "text_to_speech", "value": "This"},
      "hebrew_english_name": {"type": "text", "value": "דִיס"}
    },
    {
      "name": {"type": "text", "value": "בחור"},
      "english_name": {"type": "text_to_speech", "value": "Guy"},
      "hebrew_english_name": {"type": "text", "value": "גַי"}
    },
    {
      "name": {"type": "text", "value": "מופלא"},
      "english_name": {"type": "text_to_speech", "value": "Fabulous"},
      "hebrew_english_name": {"type": "text", "value": "פַאבְיוּלוּס"}
    },
    {
      "name": {"type": "text", "value": "אבבווה"},
      "english_name": {"type": "text_to_speech", "value": "Ababwa"},
      "hebrew_english_name": {"type": "text", "value": "אַבָּבְּווָּה"}
    },
    {
      "name": {"type": "text", "value": "הראה"},
      "english_name": {"type": "text_to_speech", "value": "Show"},
      "hebrew_english_name": {"type": "text", "value": "שוֹ"}
    },
    {
      "name": {"type": "text", "value": "כמה"},
      "english_name": {"type": "text_to_speech", "value": "Some"},
      "hebrew_english_name": {"type": "text", "value": "סַאם"}
    },
    {
      "name": {"type": "text", "value": "כבוד"},
      "english_name": {"type": "text_to_speech", "value": "Respect"},
      "hebrew_english_name": {"type": "text", "value": "רִיסְפֶּקְט"}
    },
    {
      "name": {"type": "text", "value": "בחור"},
      "english_name": {"type": "text_to_speech", "value": "Boy"},
      "hebrew_english_name": {"type": "text", "value": "בּוֹי"}
    },
    {
      "name": {"type": "text", "value": "להתכופף"},
      "english_name": {"type": "text_to_speech", "value": "Genuflect"},
      "hebrew_english_name": {"type": "text", "value": "גֵ'נְיוּפְלֶקְט"}
    },
    {
      "name": {"type": "text", "value": "למטה"},
      "english_name": {"type": "text_to_speech", "value": "Down"},
      "hebrew_english_name": {"type": "text", "value": "דַאוּן"}
    },
    {
      "name": {"type": "text", "value": "ברך אחת"},
      "english_name": {"type": "text_to_speech", "value": "One Knee"},
      "hebrew_english_name": {"type": "text", "value": "וָאן נִי"}
    },
    {
      "name": {"type": "text", "value": "עכשיו"},
      "english_name": {"type": "text_to_speech", "value": "Now"},
      "hebrew_english_name": {"type": "text", "value": "נַאו"}
    },
    {
      "name": {"type": "text", "value": "נסה"},
      "english_name": {"type": "text_to_speech", "value": "Try"},
      "hebrew_english_name": {"type": "text", "value": "טְרַי"}
    },
    {
      "name": {"type": "text", "value": "הטוב ביותר"},
      "english_name": {"type": "text_to_speech", "value": "Best"},
      "hebrew_english_name": {"type": "text", "value": "בֶּסְט"}
    },
    {
      "name": {"type": "text", "value": "להישאר"},
      "english_name": {"type": "text_to_speech", "value": "Stay"},
      "hebrew_english_name": {"type": "text", "value": "סְטֵי"}
    },
    {
      "name": {"type": "text", "value": "רגוע"},
      "english_name": {"type": "text_to_speech", "value": "Calm"},
      "hebrew_english_name": {"type": "text", "value": "קָאלְם"}
    },
    {
      "name": {"type": "text", "value": "לצחצח"},
      "english_name": {"type": "text_to_speech", "value": "Brush"},
      "hebrew_english_name": {"type": "text", "value": "בְּרָאש"}
    },
    {
      "name": {"type": "text", "value": "על"},
      "english_name": {"type": "text_to_speech", "value": "Up"},
      "hebrew_english_name": {"type": "text", "value": "אַפּ"}
    },
    {
      "name": {"type": "text", "value": "שישי"},
      "english_name": {"type": "text_to_speech", "value": "Friday"},
      "hebrew_english_name": {"type": "text", "value": "פְרַיְדֵי"}
    },
    {
      "name": {"type": "text", "value": "שלום"},
      "english_name": {"type": "text_to_speech", "value": "Salaam"},
      "hebrew_english_name": {"type": "text", "value": "סָלָאם"}
    },
    {
      "name": {"type": "text", "value": "אז"},
      "english_name": {"type": "text_to_speech", "value": "Then"},
      "hebrew_english_name": {"type": "text", "value": "תֶ'נ"}
    },
    {
      "name": {"type": "text", "value": "וגם"},
      "english_name": {"type": "text_to_speech", "value": "And"},
      "hebrew_english_name": {"type": "text", "value": "אֶנְד"}
    },
    {
      "name": {"type": "text", "value": "מרהיב"},
      "english_name": {"type": "text_to_speech", "value": "Spectacular"},
      "hebrew_english_name": {"type": "text", "value": "סְפֶקְטָקוּלָר"}
    },
    {
      "name": {"type": "text", "value": "חבורה"},
      "english_name": {"type": "text_to_speech", "value": "Coterie"},
      "hebrew_english_name": {"type": "text", "value": "קוֹטֶרִי"}
    },
    {
      "name": {"type": "text", "value": "אדיר"},
      "english_name": {"type": "text_to_speech", "value": "Mighty"},
      "hebrew_english_name": {"type": "text", "value": "מַייטִי"}
    },
    {
      "name": {"type": "text", "value": "הוא"},
      "english_name": {"type": "text_to_speech", "value": "Is"},
      "hebrew_english_name": {"type": "text", "value": "אִיז"}
    },
    {
      "name": {"type": "text", "value": "חזק"},
      "english_name": {"type": "text_to_speech", "value": "Strong"},
      "hebrew_english_name": {"type": "text", "value": "סְטְרוֹנְג"}
    },
    {
      "name": {"type": "text", "value": "כמו"},
      "english_name": {"type": "text_to_speech", "value": "As"},
      "hebrew_english_name": {"type": "text", "value": "אַס"}
    },
    {
      "name": {"type": "text", "value": "עשרה"},
      "english_name": {"type": "text_to_speech", "value": "Ten"},
      "hebrew_english_name": {"type": "text", "value": "תֵן"}
    },
    {
      "name": {"type": "text", "value": "רגיל"},
      "english_name": {"type": "text_to_speech", "value": "Regular"},
      "hebrew_english_name": {"type": "text", "value": "רֶגְיוּלָר"}
    },
    {
      "name": {"type": "text", "value": "גברים"},
      "english_name": {"type": "text_to_speech", "value": "Men"},
      "hebrew_english_name": {"type": "text", "value": "מֵן"}
    },
    {
      "name": {"type": "text", "value": "בהחלט"},
      "english_name": {"type": "text_to_speech", "value": "Definitely"},
      "hebrew_english_name": {"type": "text", "value": "דֶפִּינִיטְלִי"}
    },
    {
      "name": {"type": "text", "value": "הוא"},
      "english_name": {"type": "text_to_speech", "value": "He's"},
      "hebrew_english_name": {"type": "text", "value": "הִיז"}
    },
    {
      "name": {"type": "text", "value": "התמודד"},
      "english_name": {"type": "text_to_speech", "value": "Faced"},
      "hebrew_english_name": {"type": "text", "value": "פֵיְסְט"}
    },
    {
      "name": {"type": "text", "value": "דוהר"},
      "english_name": {"type": "text_to_speech", "value": "Galloping"},
      "hebrew_english_name": {"type": "text", "value": "גָלוֹפִּינְג"}
    },
    {
      "name": {"type": "text", "value": "המון"},
      "english_name": {"type": "text_to_speech", "value": "Hordes"},
      "hebrew_english_name": {"type": "text", "value": "הוֹרְדְס"}
    },
    {
      "name": {"type": "text", "value": "א"},
      "english_name": {"type": "text_to_speech", "value": "A"},
      "hebrew_english_name": {"type": "text", "value": "אֵי"}
    },
    {
      "name": {"type": "text", "value": "מאה"},
      "english_name": {"type": "text_to_speech", "value": "Hundred"},
      "hebrew_english_name": {"type": "text", "value": "הַנְדְרֵד"}
    },
    {
      "name": {"type": "text", "value": "רעים"},
      "english_name": {"type": "text_to_speech", "value": "Bad"},
      "hebrew_english_name": {"type": "text", "value": "בַּאד"}
    },
    {
      "name": {"type": "text", "value": "בחורים"},
      "english_name": {"type": "text_to_speech", "value": "Guys"},
      "hebrew_english_name": {"type": "text", "value": "גַיְז"}
    },
    {
      "name": {"type": "text", "value": "עם"},
      "english_name": {"type": "text_to_speech", "value": "With"},
      "hebrew_english_name": {"type": "text", "value": "וִוית"}
    },
    {
      "name": {"type": "text", "value": "חרבות"},
      "english_name": {"type": "text_to_speech", "value": "Swords"},
      "hebrew_english_name": {"type": "text", "value": "סוֹרְדְס"}
    },
    {
      "name": {"type": "text", "value": "מי"},
      "english_name": {"type": "text_to_speech", "value": "Who"},
      "hebrew_english_name": {"type": "text", "value": "הוּ"}
    },
    {
      "name": {"type": "text", "value": "שלח"},
      "english_name": {"type": "text_to_speech", "value": "Sent"},
      "hebrew_english_name": {"type": "text", "value": "סֵנְט"}
    },
    {
      "name": {"type": "text", "value": "אלה"},
      "english_name": {"type": "text_to_speech", "value": "Those"},
      "hebrew_english_name": {"type": "text", "value": "תוֹז"}
    },
    {
      "name": {"type": "text", "value": "בריונים"},
      "english_name": {"type": "text_to_speech", "value": "Goons"},
      "hebrew_english_name": {"type": "text", "value": "גוּנְז"}
    },
    {
      "name": {"type": "text", "value": "אדוניהם"},
      "english_name": {"type": "text_to_speech", "value": "Lords"},
      "hebrew_english_name": {"type": "text", "value": "לוֹרְדְס"}
    },
    {
      "name": {"type": "text", "value": "למה"},
      "english_name": {"type": "text_to_speech", "value": "Why"},
      "hebrew_english_name": {"type": "text", "value": "וַוי"}
    }
  ],

MAN : [
    {
      "name": {"type": "text", "value": "להיות"},
      "english_name": {"type": "text_to_speech", "value": "Be"},
      "hebrew_english_name": {"type": "text", "value": "בִּי"}
    },
    {
      "name": {"type": "text", "value": "א"},
      "english_name": {"type": "text_to_speech", "value": "A"},
      "hebrew_english_name": {"type": "text", "value": "אֵי"}
    },
    {
      "name": {"type": "text", "value": "איש"},
      "english_name": {"type": "text_to_speech", "value": "Man"},
      "hebrew_english_name": {"type": "text", "value": "מֶן"}
    },
    {
      "name": {"type": "text", "value": "אנחנו"},
      "english_name": {"type": "text_to_speech", "value": "We"},
      "hebrew_english_name": {"type": "text", "value": "וִוי"}
    },
    {
      "name": {"type": "text", "value": "חייבים"},
      "english_name": {"type": "text_to_speech", "value": "Must"},
      "hebrew_english_name": {"type": "text", "value": "מַאסט"}
    },
    {
      "name": {"type": "text", "value": "מהיר"},
      "english_name": {"type": "text_to_speech", "value": "Swift"},
      "hebrew_english_name": {"type": "text", "value": "סְוִויִפְט"}
    },
    {
      "name": {"type": "text", "value": "כמו"},
      "english_name": {"type": "text_to_speech", "value": "As"},
      "hebrew_english_name": {"type": "text", "value": "אַס"}
    },
    {
      "name": {"type": "text", "value": "ה"},
      "english_name": {"type": "text_to_speech", "value": "The"},
      "hebrew_english_name": {"type": "text", "value": "דַ"}
    },
    {
      "name": {"type": "text", "value": "זורם"},
      "english_name": {"type": "text_to_speech", "value": "Coursing"},
      "hebrew_english_name": {"type": "text", "value": "קוֹרְסִינְג"}
    },
    {
      "name": {"type": "text", "value": "נהר"},
      "english_name": {"type": "text_to_speech", "value": "River"},
      "hebrew_english_name": {"type": "text", "value": "רִיבֶר"}
    },
    {
      "name": {"type": "text", "value": "עם"},
      "english_name": {"type": "text_to_speech", "value": "With"},
      "hebrew_english_name": {"type": "text", "value": "וִוית"}
    },
    {
      "name": {"type": "text", "value": "כל"},
      "english_name": {"type": "text_to_speech", "value": "All"},
      "hebrew_english_name": {"type": "text", "value": "אוֹל"}
    },
    {
      "name": {"type": "text", "value": "הכוח"},
      "english_name": {"type": "text_to_speech", "value": "Force"},
      "hebrew_english_name": {"type": "text", "value": "פוֹרְס"}
    },
    {
      "name": {"type": "text", "value": "של"},
      "english_name": {"type": "text_to_speech", "value": "Of"},
      "hebrew_english_name": {"type": "text", "value": "אוֹב"}
    },
    {
      "name": {"type": "text", "value": "טייפון"},
      "english_name": {"type": "text_to_speech", "value": "Typhoon"},
      "hebrew_english_name": {"type": "text", "value": "טַיְפוּן"}
    },
    {
      "name": {"type": "text", "value": "עוצמה"},
      "english_name": {"type": "text_to_speech", "value": "Strength"},
      "hebrew_english_name": {"type": "text", "value": "סְטְרֵנְגְת"}
    },
    {
      "name": {"type": "text", "value": "זועם"},
      "english_name": {"type": "text_to_speech", "value": "Raging"},
      "hebrew_english_name": {"type": "text", "value": "רֵיְגִ'ינְג"}
    },
    {
      "name": {"type": "text", "value": "אש"},
      "english_name": {"type": "text_to_speech", "value": "Fire"},
      "hebrew_english_name": {"type": "text", "value": "פַיְיֶר"}
    },
    {
      "name": {"type": "text", "value": "מסתורי"},
      "english_name": {"type": "text_to_speech", "value": "Mysterious"},
      "hebrew_english_name": {"type": "text", "value": "מִיסְטִירִיוּס"}
    },
    {
      "name": {"type": "text", "value": "כהה"},
      "english_name": {"type": "text_to_speech", "value": "Dark"},
      "hebrew_english_name": {"type": "text", "value": "דַארְק"}
    },
    {
      "name": {"type": "text", "value": "צד"},
      "english_name": {"type": "text_to_speech", "value": "Side"},
      "hebrew_english_name": {"type": "text", "value": "סַיְד"}
    },
    {
      "name": {"type": "text", "value": "ירח"},
      "english_name": {"type": "text_to_speech", "value": "Moon"},
      "hebrew_english_name": {"type": "text", "value": "מוּן"}
    },
    {
      "name": {"type": "text", "value": "בוא נלך"},
      "english_name": {"type": "text_to_speech", "value": "Let's"},
      "hebrew_english_name": {"type": "text", "value": "לֵטְס"}
    },
    {
      "name": {"type": "text", "value": "לקבל"},
      "english_name": {"type": "text_to_speech", "value": "Get"},
      "hebrew_english_name": {"type": "text", "value": "גֶט"}
    },
    {
      "name": {"type": "text", "value": "למטה"},
      "english_name": {"type": "text_to_speech", "value": "Down"},
      "hebrew_english_name": {"type": "text", "value": "דַאוּן"}
    },
    {
      "name": {"type": "text", "value": "לעסקים"},
      "english_name": {"type": "text_to_speech", "value": "Business"},
      "hebrew_english_name": {"type": "text", "value": "בִּיזְנֶס"}
    },
    {
      "name": {"type": "text", "value": "להביס"},
      "english_name": {"type": "text_to_speech", "value": "Defeat"},
      "hebrew_english_name": {"type": "text", "value": "דִיפִיט"}
    },
    {
      "name": {"type": "text", "value": "חונים"},
      "english_name": {"type": "text_to_speech", "value": "Huns"},
      "hebrew_english_name": {"type": "text", "value": "הוּנְס"}
    },
    {
      "name": {"type": "text", "value": "הא"},
      "english_name": {"type": "text_to_speech", "value": "Huh"},
      "hebrew_english_name": {"type": "text", "value": "הָה"}
    },
    {
      "name": {"type": "text", "value": "עשה"},
      "english_name": {"type": "text_to_speech", "value": "Did"},
      "hebrew_english_name": {"type": "text", "value": "דִיד"}
    },
    {
      "name": {"type": "text", "value": "הם"},
      "english_name": {"type": "text_to_speech", "value": "They"},
      "hebrew_english_name": {"type": "text", "value": "דֵ'י"}
    },
    {
      "name": {"type": "text", "value": "שלחו"},
      "english_name": {"type": "text_to_speech", "value": "Send"},
      "hebrew_english_name": {"type": "text", "value": "סֵנְד"}
    },
    {
      "name": {"type": "text", "value": "אני"},
      "english_name": {"type": "text_to_speech", "value": "Me"},
      "hebrew_english_name": {"type": "text", "value": "מִי"}
    },
    {
      "name": {"type": "text", "value": "בנות"},
      "english_name": {"type": "text_to_speech", "value": "Daughters"},
      "hebrew_english_name": {"type": "text", "value": "דּוֹטֶרְס"}
    },
    {
      "name": {"type": "text", "value": "מתי"},
      "english_name": {"type": "text_to_speech", "value": "When"},
      "hebrew_english_name": {"type": "text", "value": "וֶון"}
    },
    {
      "name": {"type": "text", "value": "אני"},
      "english_name": {"type": "text_to_speech", "value": "I"},
      "hebrew_english_name": {"type": "text", "value": "אַי"}
    },
    {
      "name": {"type": "text", "value": "ביקשתי"},
      "english_name": {"type": "text_to_speech", "value": "Asked"},
      "hebrew_english_name": {"type": "text", "value": "אַסְקְט"}
    },
    {
      "name": {"type": "text", "value": "עבור"},
      "english_name": {"type": "text_to_speech", "value": "For"},
      "hebrew_english_name": {"type": "text", "value": "פוֹר"}
    },
    {
      "name": {"type": "text", "value": "בנים"},
      "english_name": {"type": "text_to_speech", "value": "Sons"},
      "hebrew_english_name": {"type": "text", "value": "סַאנְס"}
    },
    {
      "name": {"type": "text", "value": "אתה"},
      "english_name": {"type": "text_to_speech", "value": "You're"},
      "hebrew_english_name": {"type": "text", "value": "יוּר"}
    },
    {
      "name": {"type": "text", "value": "העצוב ביותר"},
      "english_name": {"type": "text_to_speech", "value": "Saddest"},
      "hebrew_english_name": {"type": "text", "value": "סַאדֶסְט"}
    },
    {
      "name": {"type": "text", "value": "חבורה"},
      "english_name": {"type": "text_to_speech", "value": "Bunch"},
      "hebrew_english_name": {"type": "text", "value": "בַּאנְץ"}
    },
    {
      "name": {"type": "text", "value": "אי פעם"},
      "english_name": {"type": "text_to_speech", "value": "Ever"},
      "hebrew_english_name": {"type": "text", "value": "אֵבֶר"}
    },
    {
      "name": {"type": "text", "value": "פגשתי"},
      "english_name": {"type": "text_to_speech", "value": "Met"},
      "hebrew_english_name": {"type": "text", "value": "מֵט"}
    },
    {
      "name": {"type": "text", "value": "אבל"},
      "english_name": {"type": "text_to_speech", "value": "But"},
      "hebrew_english_name": {"type": "text", "value": "בַּאט"}
    },
    {
      "name": {"type": "text", "value": "אתה"},
      "english_name": {"type": "text_to_speech", "value": "You"},
      "hebrew_english_name": {"type": "text", "value": "יוּ"}
    },
    {
      "name": {"type": "text", "value": "יכול"},
      "english_name": {"type": "text_to_speech", "value": "Can"},
      "hebrew_english_name": {"type": "text", "value": "קֵן"}
    },
    {
      "name": {"type": "text", "value": "להמר"},
      "english_name": {"type": "text_to_speech", "value": "Bet"},
      "hebrew_english_name": {"type": "text", "value": "בֵּט"}
    },
    {
      "name": {"type": "text", "value": "לפני"},
      "english_name": {"type": "text_to_speech", "value": "Before"},
      "hebrew_english_name": {"type": "text", "value": "בִּפוֹר"}
    },
    {
      "name": {"type": "text", "value": "שאנחנו"},
      "english_name": {"type": "text_to_speech", "value": "We're"},
      "hebrew_english_name": {"type": "text", "value": "וִוי'ר"}
    },
    {
      "name": {"type": "text", "value": "דרך"},
      "english_name": {"type": "text_to_speech", "value": "Through"},
      "hebrew_english_name": {"type": "text", "value": "תְרוּ"}
    },
    {
      "name": {"type": "text", "value": "אדוני"},
      "english_name": {"type": "text_to_speech", "value": "Mister"},
      "hebrew_english_name": {"type": "text", "value": "מִיסְטֶר"}
    },
    {
      "name": {"type": "text", "value": "אני"},
      "english_name": {"type": "text_to_speech", "value": "I'll"},
      "hebrew_english_name": {"type": "text", "value": "אַי'ל"}
    },
    {
      "name": {"type": "text", "value": "לעשות"},
      "english_name": {"type": "text_to_speech", "value": "Make"},
      "hebrew_english_name": {"type": "text", "value": "מֵייק"}
    },
    {
      "name": {"type": "text", "value": "החוצה"},
      "english_name": {"type": "text_to_speech", "value": "Out"},
      "hebrew_english_name": {"type": "text", "value": "אַוּט"}
    },
    {
      "name": {"type": "text", "value": "שלווה"},
      "english_name": {"type": "text_to_speech", "value": "Tranquil"},
      "hebrew_english_name": {"type": "text", "value": "טְרַנְקְוִויל"}
    },
    {
      "name": {"type": "text", "value": "יער"},
      "english_name": {"type": "text_to_speech", "value": "Forest"},
      "hebrew_english_name": {"type": "text", "value": "פוֹרֶסְט"}
    },
    {
      "name": {"type": "text", "value": "על"},
      "english_name": {"type": "text_to_speech", "value": "On"},
      "hebrew_english_name": {"type": "text", "value": "אוֹן"}
    },
    {
      "name": {"type": "text", "value": "בתוך"},
      "english_name": {"type": "text_to_speech", "value": "Within"},
      "hebrew_english_name": {"type": "text", "value": "וִויִתִ'ין"}
    },
    {
      "name": {"type": "text", "value": "פעם אחת"},
      "english_name": {"type": "text_to_speech", "value": "Once"},
      "hebrew_english_name": {"type": "text", "value": "וַואנְס"}
    },
    {
      "name": {"type": "text", "value": "למצוא"},
      "english_name": {"type": "text_to_speech", "value": "Find"},
      "hebrew_english_name": {"type": "text", "value": "פַיְנְד"}
    },
    {
      "name": {"type": "text", "value": "שלך"},
      "english_name": {"type": "text_to_speech", "value": "Your"},
      "hebrew_english_name": {"type": "text", "value": "יוֹר"}
    },
    {
      "name": {"type": "text", "value": "מרכז"},
      "english_name": {"type": "text_to_speech", "value": "Center"},
      "hebrew_english_name": {"type": "text", "value": "סֶנְטֶר"}
    },
    {
      "name": {"type": "text", "value": "הם"},
      "english_name": {"type": "text_to_speech", "value": "Are"},
      "hebrew_english_name": {"type": "text", "value": "אַר"}
    },
    {
      "name": {"type": "text", "value": "בטוח"},
      "english_name": {"type": "text_to_speech", "value": "Sure"},
      "hebrew_english_name": {"type": "text", "value": "שוּר"}
    },
    {
      "name": {"type": "text", "value": "לנצח"},
      "english_name": {"type": "text_to_speech", "value": "Win"},
      "hebrew_english_name": {"type": "text", "value": "וִוין"}
    },
    {
      "name": {"type": "text", "value": "חסר עמוד שדרה"},
      "english_name": {"type": "text_to_speech", "value": "Spineless"},
      "hebrew_english_name": {"type": "text", "value": "סְפַּיְנְלֶס"}
    },
    {
      "name": {"type": "text", "value": "חיוור"},
      "english_name": {"type": "text_to_speech", "value": "Pale"},
      "hebrew_english_name": {"type": "text", "value": "פֵייל"}
    },
    {
      "name": {"type": "text", "value": "פתטי"},
      "english_name": {"type": "text_to_speech", "value": "Pathetic"},
      "hebrew_english_name": {"type": "text", "value": "פָּתֶ'טִיק"}
    },
    {
      "name": {"type": "text", "value": "הרבה"},
      "english_name": {"type": "text_to_speech", "value": "Lot"},
      "hebrew_english_name": {"type": "text", "value": "לוֹט"}
    },
    {
      "name": {"type": "text", "value": "וגם"},
      "english_name": {"type": "text_to_speech", "value": "And"},
      "hebrew_english_name": {"type": "text", "value": "אֶנְד"}
    },
    {
      "name": {"type": "text", "value": "לא"},
      "english_name": {"type": "text_to_speech", "value": "Haven't"},
      "hebrew_english_name": {"type": "text", "value": "הֵבֶנְ'ט"}
    },
    {
      "name": {"type": "text", "value": "יש"},
      "english_name": {"type": "text_to_speech", "value": "Got"},
      "hebrew_english_name": {"type": "text", "value": "גוֹט"}
    },
    {
      "name": {"type": "text", "value": "רמז"},
      "english_name": {"type": "text_to_speech", "value": "Clue"},
      "hebrew_english_name": {"type": "text", "value": "קְלוּ"}
    },
    {
      "name": {"type": "text", "value": "בדרך כלשהי"},
      "english_name": {"type": "text_to_speech", "value": "Somehow"},
      "hebrew_english_name": {"type": "text", "value": "סָאמְהָאוּ"}
    },
    {
      "name": {"type": "text", "value": "אני"},
      "english_name": {"type": "text_to_speech", "value": "I'm"},
      "hebrew_english_name": {"type": "text", "value": "אַי'ם"}
    },
    {
      "name": {"type": "text", "value": "לעולם לא"},
      "english_name": {"type": "text_to_speech", "value": "Never"},
      "hebrew_english_name": {"type": "text", "value": "נֵבֶר"}
    },
    {
      "name": {"type": "text", "value": "הולך"},
      "english_name": {"type": "text_to_speech", "value": "Gonna"},
      "hebrew_english_name": {"type": "text", "value": "גוֹנַה"}
    },
    {
      "name": {"type": "text", "value": "לתפוס"},
      "english_name": {"type": "text_to_speech", "value": "Catch"},
      "hebrew_english_name": {"type": "text", "value": "קֶאץ"}
    },
    {
      "name": {"type": "text", "value": "שלי"},
      "english_name": {"type": "text_to_speech", "value": "My"},
      "hebrew_english_name": {"type": "text", "value": "מַאי"}
    },
    {
      "name": {"type": "text", "value": "נשימה"},
      "english_name": {"type": "text_to_speech", "value": "Breath"},
      "hebrew_english_name": {"type": "text", "value": "בְּרֶת"}
    },
    {
      "name": {"type": "text", "value": "אמור"},
      "english_name": {"type": "text_to_speech", "value": "Say"},
      "hebrew_english_name": {"type": "text", "value": "סֵי"}
    },
    {
      "name": {"type": "text", "value": "טוב"},
      "english_name": {"type": "text_to_speech", "value": "Good"},
      "hebrew_english_name": {"type": "text", "value": "גוּד"}
    },
    {
      "name": {"type": "text", "value": "שלום"},
      "english_name": {"type": "text_to_speech", "value": "Bye"},
      "hebrew_english_name": {"type": "text", "value": "בַּאי"}
    },
    {
      "name": {"type": "text", "value": "אלה"},
      "english_name": {"type": "text_to_speech", "value": "Those"},
      "hebrew_english_name": {"type": "text", "value": "תוֹז"}
    },
    {
      "name": {"type": "text", "value": "מי"},
      "english_name": {"type": "text_to_speech", "value": "Who"},
      "hebrew_english_name": {"type": "text", "value": "הוּ"}
    },
    {
      "name": {"type": "text", "value": "ידעו"},
      "english_name": {"type": "text_to_speech", "value": "Knew"},
      "hebrew_english_name": {"type": "text", "value": "נוּ"}
    },
    {
      "name": {"type": "text", "value": "בחור"},
      "english_name": {"type": "text_to_speech", "value": "Boy"},
      "hebrew_english_name": {"type": "text", "value": "בּוֹי"}
    },
    {
      "name": {"type": "text", "value": "היה"},
      "english_name": {"type": "text_to_speech", "value": "Was"},
      "hebrew_english_name": {"type": "text", "value": "וָאז"}
    },
    {
      "name": {"type": "text", "value": "שוטה"},
      "english_name": {"type": "text_to_speech", "value": "Fool"},
      "hebrew_english_name": {"type": "text", "value": "פוּל"}
    },
    {
      "name": {"type": "text", "value": "ב"},
      "english_name": {"type": "text_to_speech", "value": "In"},
      "hebrew_english_name": {"type": "text", "value": "אִין"}
    },
    {
      "name": {"type": "text", "value": "בית ספר"},
      "english_name": {"type": "text_to_speech", "value": "School"},
      "hebrew_english_name": {"type": "text", "value": "סְקוּל"}
    },
    {
      "name": {"type": "text", "value": "לחתוך"},
      "english_name": {"type": "text_to_speech", "value": "Cutting"},
      "hebrew_english_name": {"type": "text", "value": "קָאטִינְג"}
    }],

SUMMER_VACATION: [
  {
    "name": {"type": "text", "value": "There's"},
    "english_name": {"type": "text_to_speech", "value": "There's"},
    "hebrew_english_name": {"type": "text", "value": "There's"}
  },
  {
    "name": {"type": "text", "value": "a"},
    "english_name": {"type": "text_to_speech", "value": "a"},
    "hebrew_english_name": {"type": "text", "value": "a"}
  },
  {
    "name": {"type": "text", "value": "hundred"},
    "english_name": {"type": "text_to_speech", "value": "hundred"},
    "hebrew_english_name": {"type": "text", "value": "hundred"}
  },
  {
    "name": {"type": "text", "value": "and"},
    "english_name": {"type": "text_to_speech", "value": "and"},
    "hebrew_english_name": {"type": "text", "value": "and"}
  },
  {
    "name": {"type": "text", "value": "four"},
    "english_name": {"type": "text_to_speech", "value": "four"},
    "hebrew_english_name": {"type": "text", "value": "four"}
  },
  {
    "name": {"type": "text", "value": "days"},
    "english_name": {"type": "text_to_speech", "value": "days"},
    "hebrew_english_name": {"type": "text", "value": "days"}
  },
  {
    "name": {"type": "text", "value": "of"},
    "english_name": {"type": "text_to_speech", "value": "of"},
    "hebrew_english_name": {"type": "text", "value": "of"}
  },
  {
    "name": {"type": "text", "value": "summer"},
    "english_name": {"type": "text_to_speech", "value": "summer"},
    "hebrew_english_name": {"type": "text", "value": "summer"}
  },
  {
    "name": {"type": "text", "value": "vacation"},
    "english_name": {"type": "text_to_speech", "value": "vacation"},
    "hebrew_english_name": {"type": "text", "value": "vacation"}
  },
  {
    "name": {"type": "text", "value": "Then"},
    "english_name": {"type": "text_to_speech", "value": "Then"},
    "hebrew_english_name": {"type": "text", "value": "Then"}
  },
  {
    "name": {"type": "text", "value": "school"},
    "english_name": {"type": "text_to_speech", "value": "school"},
    "hebrew_english_name": {"type": "text", "value": "school"}
  },
  {
    "name": {"type": "text", "value": "comes"},
    "english_name": {"type": "text_to_speech", "value": "comes"},
    "hebrew_english_name": {"type": "text", "value": "comes"}
  },
  {
    "name": {"type": "text", "value": "along"},
    "english_name": {"type": "text_to_speech", "value": "along"},
    "hebrew_english_name": {"type": "text", "value": "along"}
  },
  {
    "name": {"type": "text", "value": "just"},
    "english_name": {"type": "text_to_speech", "value": "just"},
    "hebrew_english_name": {"type": "text", "value": "just"}
  },
  {
    "name": {"type": "text", "value": "to"},
    "english_name": {"type": "text_to_speech", "value": "to"},
    "hebrew_english_name": {"type": "text", "value": "to"}
  },
  {
    "name": {"type": "text", "value": "end"},
    "english_name": {"type": "text_to_speech", "value": "end"},
    "hebrew_english_name": {"type": "text", "value": "end"}
  },
  {
    "name": {"type": "text", "value": "it"},
    "english_name": {"type": "text_to_speech", "value": "it"},
    "hebrew_english_name": {"type": "text", "value": "it"}
  },
  {
    "name": {"type": "text", "value": "So"},
    "english_name": {"type": "text_to_speech", "value": "So"},
    "hebrew_english_name": {"type": "text", "value": "So"}
  },
  {
    "name": {"type": "text", "value": "the"},
    "english_name": {"type": "text_to_speech", "value": "the"},
    "hebrew_english_name": {"type": "text", "value": "the"}
  },
  {
    "name": {"type": "text", "value": "annual"},
    "english_name": {"type": "text_to_speech", "value": "annual"},
    "hebrew_english_name": {"type": "text", "value": "annual"}
  },
  {
    "name": {"type": "text", "value": "problem"},
    "english_name": {"type": "text_to_speech", "value": "problem"},
    "hebrew_english_name": {"type": "text", "value": "problem"}
  },
  {
    "name": {"type": "text", "value": "for"},
    "english_name": {"type": "text_to_speech", "value": "for"},
    "hebrew_english_name": {"type": "text", "value": "for"}
  },
  {
    "name": {"type": "text", "value": "our"},
    "english_name": {"type": "text_to_speech", "value": "our"},
    "hebrew_english_name": {"type": "text", "value": "our"}
  },
  {
    "name": {"type": "text", "value": "generation"},
    "english_name": {"type": "text_to_speech", "value": "generation"},
    "hebrew_english_name": {"type": "text", "value": "generation"}
  },
  {
    "name": {"type": "text", "value": "Is"},
    "english_name": {"type": "text_to_speech", "value": "Is"},
    "hebrew_english_name": {"type": "text", "value": "Is"}
  },
  {
    "name": {"type": "text", "value": "finding"},
    "english_name": {"type": "text_to_speech", "value": "finding"},
    "hebrew_english_name": {"type": "text", "value": "finding"}
  },
  {
    "name": {"type": "text", "value": "good"},
    "english_name": {"type": "text_to_speech", "value": "good"},
    "hebrew_english_name": {"type": "text", "value": "good"}
  },
  {
    "name": {"type": "text", "value": "way"},
    "english_name": {"type": "text_to_speech", "value": "way"},
    "hebrew_english_name": {"type": "text", "value": "way"}
  },
  {
    "name": {"type": "text", "value": "spend"},
    "english_name": {"type": "text_to_speech", "value": "spend"},
    "hebrew_english_name": {"type": "text", "value": "spend"}
  },
  {
    "name": {"type": "text", "value": "Like"},
    "english_name": {"type": "text_to_speech", "value": "Like"},
    "hebrew_english_name": {"type": "text", "value": "Like"}
  },
  {
    "name": {"type": "text", "value": "maybe"},
    "english_name": {"type": "text_to_speech", "value": "maybe"},
    "hebrew_english_name": {"type": "text", "value": "maybe"}
  },
  {
    "name": {"type": "text", "value": "Building"},
    "english_name": {"type": "text_to_speech", "value": "Building"},
    "hebrew_english_name": {"type": "text", "value": "Building"}
  },
  {
    "name": {"type": "text", "value": "rocket"},
    "english_name": {"type": "text_to_speech", "value": "rocket"},
    "hebrew_english_name": {"type": "text", "value": "rocket"}
  },
  {
    "name": {"type": "text", "value": "Or"},
    "english_name": {"type": "text_to_speech", "value": "Or"},
    "hebrew_english_name": {"type": "text", "value": "Or"}
  },
  {
    "name": {"type": "text", "value": "fighting"},
    "english_name": {"type": "text_to_speech", "value": "fighting"},
    "hebrew_english_name": {"type": "text", "value": "fighting"}
  },
  {
    "name": {"type": "text", "value": "mummy"},
    "english_name": {"type": "text_to_speech", "value": "mummy"},
    "hebrew_english_name": {"type": "text", "value": "mummy"}
  },
  {
    "name": {"type": "text", "value": "climbing"},
    "english_name": {"type": "text_to_speech", "value": "climbing"},
    "hebrew_english_name": {"type": "text", "value": "climbing"}
  },
  {
    "name": {"type": "text", "value": "up"},
    "english_name": {"type": "text_to_speech", "value": "up"},
    "hebrew_english_name": {"type": "text", "value": "up"}
  },
  {
    "name": {"type": "text", "value": "Eiffel"},
    "english_name": {"type": "text_to_speech", "value": "Eiffel"},
    "hebrew_english_name": {"type": "text", "value": "Eiffel"}
  },
  {
    "name": {"type": "text", "value": "Tower"},
    "english_name": {"type": "text_to_speech", "value": "Tower"},
    "hebrew_english_name": {"type": "text", "value": "Tower"}
  },
  {
    "name": {"type": "text", "value": "Discovering"},
    "english_name": {"type": "text_to_speech", "value": "Discovering"},
    "hebrew_english_name": {"type": "text", "value": "Discovering"}
  },
  {
    "name": {"type": "text", "value": "something"},
    "english_name": {"type": "text_to_speech", "value": "something"},
    "hebrew_english_name": {"type": "text", "value": "something"}
  },
  {
    "name": {"type": "text", "value": "that"},
    "english_name": {"type": "text_to_speech", "value": "that"},
    "hebrew_english_name": {"type": "text", "value": "that"}
  },
  {
    "name": {"type": "text", "value": "doesn't"},
    "english_name": {"type": "text_to_speech", "value": "doesn't"},
    "hebrew_english_name": {"type": "text", "value": "doesn't"}
  },
  {
    "name": {"type": "text", "value": "exist"},
    "english_name": {"type": "text_to_speech", "value": "exist"},
    "hebrew_english_name": {"type": "text", "value": "exist"}
  },
  {
    "name": {"type": "text", "value": "Hey"},
    "english_name": {"type": "text_to_speech", "value": "Hey"},
    "hebrew_english_name": {"type": "text", "value": "Hey"}
  },
  {
    "name": {"type": "text", "value": "giving"},
    "english_name": {"type": "text_to_speech", "value": "giving"},
    "hebrew_english_name": {"type": "text", "value": "giving"}
  },
  {
    "name": {"type": "text", "value": "monkey"},
    "english_name": {"type": "text_to_speech", "value": "monkey"},
    "hebrew_english_name": {"type": "text", "value": "monkey"}
  },
  {
    "name": {"type": "text", "value": "shower"},
    "english_name": {"type": "text_to_speech", "value": "shower"},
    "hebrew_english_name": {"type": "text", "value": "shower"}
  },
  {
    "name": {"type": "text", "value": "Surfing"},
    "english_name": {"type": "text_to_speech", "value": "Surfing"},
    "hebrew_english_name": {"type": "text", "value": "Surfing"}
  },
  {
    "name": {"type": "text", "value": "tidal"},
    "english_name": {"type": "text_to_speech", "value": "tidal"},
    "hebrew_english_name": {"type": "text", "value": "tidal"}
  },
  {
    "name": {"type": "text", "value": "waves"},
    "english_name": {"type": "text_to_speech", "value": "waves"},
    "hebrew_english_name": {"type": "text", "value": "waves"}
  },
  {
    "name": {"type": "text", "value": "Creating"},
    "english_name": {"type": "text_to_speech", "value": "Creating"},
    "hebrew_english_name": {"type": "text", "value": "Creating"}
  },
  {
    "name": {"type": "text", "value": "nanobots"},
    "english_name": {"type": "text_to_speech", "value": "nanobots"},
    "hebrew_english_name": {"type": "text", "value": "nanobots"}
  },
  {
    "name": {"type": "text", "value": "locating"},
    "english_name": {"type": "text_to_speech", "value": "locating"},
    "hebrew_english_name": {"type": "text", "value": "locating"}
  },
  {
    "name": {"type": "text", "value": "Frankenstein's"},
    "english_name": {"type": "text_to_speech", "value": "Frankenstein's"},
    "hebrew_english_name": {"type": "text", "value": "Frankenstein's"}
  },
  {
    "name": {"type": "text", "value": "brain"},
    "english_name": {"type": "text_to_speech", "value": "brain"},
    "hebrew_english_name": {"type": "text", "value": "brain"}
  },
  {
    "name": {"type": "text", "value": "It's"},
    "english_name": {"type": "text_to_speech", "value": "It's"},
    "hebrew_english_name": {"type": "text", "value": "It's"}
  },
  {
    "name": {"type": "text", "value": "over"},
    "english_name": {"type": "text_to_speech", "value": "over"},
    "hebrew_english_name": {"type": "text", "value": "over"}
  },
  {
    "name": {"type": "text", "value": "here"},
    "english_name": {"type": "text_to_speech", "value": "here"},
    "hebrew_english_name": {"type": "text", "value": "here"}
  },
  {
    "name": {"type": "text", "value": "Finding"},
    "english_name": {"type": "text_to_speech", "value": "Finding"},
    "hebrew_english_name": {"type": "text", "value": "Finding"}
  },
  {
    "name": {"type": "text", "value": "dodo"},
    "english_name": {"type": "text_to_speech", "value": "dodo"},
    "hebrew_english_name": {"type": "text", "value": "dodo"}
  },
  {
    "name": {"type": "text", "value": "bird"},
    "english_name": {"type": "text_to_speech", "value": "bird"},
    "hebrew_english_name": {"type": "text", "value": "bird"}
  },
  {
    "name": {"type": "text", "value": "Painting"},
    "english_name": {"type": "text_to_speech", "value": "Painting"},
    "hebrew_english_name": {"type": "text", "value": "Painting"}
  },
  {
    "name": {"type": "text", "value": "continent"},
    "english_name": {"type": "text_to_speech", "value": "continent"},
    "hebrew_english_name": {"type": "text", "value": "continent"}
  },
  {
    "name": {"type": "text", "value": "driving"},
    "english_name": {"type": "text_to_speech", "value": "driving"},
    "hebrew_english_name": {"type": "text", "value": "driving"}
  },
  {
    "name": {"type": "text", "value": "sister"},
    "english_name": {"type": "text_to_speech", "value": "sister"},
    "hebrew_english_name": {"type": "text", "value": "sister"}
  },
  {
    "name": {"type": "text", "value": "insane"},
    "english_name": {"type": "text_to_speech", "value": "insane"},
    "hebrew_english_name": {"type": "text", "value": "insane"}
  },
  {
    "name": {"type": "text", "value": "Phineas"},
    "english_name": {"type": "text_to_speech", "value": "Phineas"},
    "hebrew_english_name": {"type": "text", "value": "Phineas"}
  },
  {
    "name": {"type": "text", "value": "As"},
    "english_name": {"type": "text_to_speech", "value": "As"},
    "hebrew_english_name": {"type": "text", "value": "As"}
  },
  {
    "name": {"type": "text", "value": "you"},
    "english_name": {"type": "text_to_speech", "value": "you"},
    "hebrew_english_name": {"type": "text", "value": "you"}
  },
  {
    "name": {"type": "text", "value": "can"},
    "english_name": {"type": "text_to_speech", "value": "can"},
    "hebrew_english_name": {"type": "text", "value": "can"}
  },
  {
    "name": {"type": "text", "value": "see"},
    "english_name": {"type": "text_to_speech", "value": "see"},
    "hebrew_english_name": {"type": "text", "value": "see"}
  },
  {
    "name": {"type": "text", "value": "whole"},
    "english_name": {"type": "text_to_speech", "value": "whole"},
    "hebrew_english_name": {"type": "text", "value": "whole"}
  },
  {
    "name": {"type": "text", "value": "lot"},
    "english_name": {"type": "text_to_speech", "value": "lot"},
    "hebrew_english_name": {"type": "text", "value": "lot"}
  },
  {
    "name": {"type": "text", "value": "stuff"},
    "english_name": {"type": "text_to_speech", "value": "stuff"},
    "hebrew_english_name": {"type": "text", "value": "stuff"}
  },
  {
    "name": {"type": "text", "value": "do"},
    "english_name": {"type": "text_to_speech", "value": "do"},
    "hebrew_english_name": {"type": "text", "value": "do"}
  },
  {
    "name": {"type": "text", "value": "Before"},
    "english_name": {"type": "text_to_speech", "value": "Before"},
    "hebrew_english_name": {"type": "text", "value": "Before"}
  },
  {
    "name": {"type": "text", "value": "starts"},
    "english_name": {"type": "text_to_speech", "value": "starts"},
    "hebrew_english_name": {"type": "text", "value": "starts"}
  },
  {
    "name": {"type": "text", "value": "this"},
    "english_name": {"type": "text_to_speech", "value": "this"},
    "hebrew_english_name": {"type": "text", "value": "this"}
  },
  {
    "name": {"type": "text", "value": "fall"},
    "english_name": {"type": "text_to_speech", "value": "fall"},
    "hebrew_english_name": {"type": "text", "value": "fall"}
  },
  {
    "name": {"type": "text", "value": "Come"},
    "english_name": {"type": "text_to_speech", "value": "Come"},
    "hebrew_english_name": {"type": "text", "value": "Come"}
  },
  {
    "name": {"type": "text", "value": "on"},
    "english_name": {"type": "text_to_speech", "value": "on"},
    "hebrew_english_name": {"type": "text", "value": "on"}
  },
  {
    "name": {"type": "text", "value": "Perry"},
    "english_name": {"type": "text_to_speech", "value": "Perry"},
    "hebrew_english_name": {"type": "text", "value": "Perry"}
  },
  {
    "name": {"type": "text", "value": "stick"},
    "english_name": {"type": "text_to_speech", "value": "stick"},
    "hebrew_english_name": {"type": "text", "value": "stick"}
  },
  {
    "name": {"type": "text", "value": "with"},
    "english_name": {"type": "text_to_speech", "value": "with"},
    "hebrew_english_name": {"type": "text", "value": "with"}
  },
  {
    "name": {"type": "text", "value": "us"},
    "english_name": {"type": "text_to_speech", "value": "us"},
    "hebrew_english_name": {"type": "text", "value": "us"}
  },
  {
    "name": {"type": "text", "value": "Cause"},
    "english_name": {"type": "text_to_speech", "value": "Cause"},
    "hebrew_english_name": {"type": "text", "value": "Cause"}
  },
  {
    "name": {"type": "text", "value": "Ferb"},
    "english_name": {"type": "text_to_speech", "value": "Ferb"},
    "hebrew_english_name": {"type": "text", "value": "Ferb"}
  },
  {
    "name": {"type": "text", "value": "are"},
    "english_name": {"type": "text_to_speech", "value": "are"},
    "hebrew_english_name": {"type": "text", "value": "are"}
  },
  {
    "name": {"type": "text", "value": "gonna"},
    "english_name": {"type": "text_to_speech", "value": "gonna"},
    "hebrew_english_name": {"type": "text", "value": "gonna"}
  },
  {
    "name": {"type": "text", "value": "all"},
    "english_name": {"type": "text_to_speech", "value": "all"},
    "hebrew_english_name": {"type": "text", "value": "all"}
  },
  {
    "name": {"type": "text", "value": "Mom"},
    "english_name": {"type": "text_to_speech", "value": "Mom"},
    "hebrew_english_name": {"type": "text", "value": "Mom"}
  },
  {
    "name": {"type": "text", "value": "making"},
    "english_name": {"type": "text_to_speech", "value": "making"},
    "hebrew_english_name": {"type": "text", "value": "making"}
  },
  {
    "name": {"type": "text", "value": "title"},
    "english_name": {"type": "text_to_speech", "value": "title"},
    "hebrew_english_name": {"type": "text", "value": "title"}
  },
  {
    "name": {"type": "text", "value": "sequence"},
    "english_name": {"type": "text_to_speech", "value": "sequence"},
    "hebrew_english_name": {"type": "text", "value": "sequence"}
  }
],

ENGLISH_VOCAB_FOOD: [
  {"hebrew": {"type": "text", "value": "לחם"}, "english_name": {"type": "text_to_speech", "value": "Bread"}},
  {"hebrew": {"type": "text", "value": "ארוחת בוקר"}, "english_name": {"type": "text_to_speech", "value": "Breakfast"}},
  {"hebrew": {"type": "text", "value": "גזר"}, "english_name": {"type": "text_to_speech", "value": "Carrot"}},
  {"hebrew": {"type": "text", "value": "גבינה"}, "english_name": {"type": "text_to_speech", "value": "Cheese"}},
  {"hebrew": {"type": "text", "value": "עוף"}, "english_name": {"type": "text_to_speech", "value": "Chicken"}},
  {"hebrew": {"type": "text", "value": "צ'יפס"}, "english_name": {"type": "text_to_speech", "value": "Chips"}},
  {"hebrew": {"type": "text", "value": "שוקולד"}, "english_name": {"type": "text_to_speech", "value": "Chocolate"}},
  {"hebrew": {"type": "text", "value": "קפה"}, "english_name": {"type": "text_to_speech", "value": "Coffee"}},
  {"hebrew": {"type": "text", "value": "עוגייה"}, "english_name": {"type": "text_to_speech", "value": "Cookie"}},
  {"hebrew": {"type": "text", "value": "ארוחת ערב"}, "english_name": {"type": "text_to_speech", "value": "Dinner"}},
  {"hebrew": {"type": "text", "value": "שתייה"}, "english_name": {"type": "text_to_speech", "value": "Drink"}},
  {"hebrew": {"type": "text", "value": "לאכול"}, "english_name": {"type": "text_to_speech", "value": "Eat"}},
  {"hebrew": {"type": "text", "value": "בשר"}, "english_name": {"type": "text_to_speech", "value": "Meat"}},
  {"hebrew": {"type": "text", "value": "מילקשייק"}, "english_name": {"type": "text_to_speech", "value": "Milkshake"}},
  {"hebrew": {"type": "text", "value": "בצל"}, "english_name": {"type": "text_to_speech", "value": "Onion"}},
  {"hebrew": {"type": "text", "value": "דג"}, "english_name": {"type": "text_to_speech", "value": "Fish"}},
  {"hebrew": {"type": "text", "value": "אוכל"}, "english_name": {"type": "text_to_speech", "value": "Food"}},
  {"hebrew": {"type": "text", "value": "פרי"}, "english_name": {"type": "text_to_speech", "value": "Fruit"}},
  {"hebrew": {"type": "text", "value": "ריבה"}, "english_name": {"type": "text_to_speech", "value": "Jam"}},
  {"hebrew": {"type": "text", "value": "מיץ"}, "english_name": {"type": "text_to_speech", "value": "Juice"}},
  {"hebrew": {"type": "text", "value": "סלט"}, "english_name": {"type": "text_to_speech", "value": "Salad"}},
  {"hebrew": {"type": "text", "value": "סנדוויץ'"}, "english_name": {"type": "text_to_speech", "value": "Sandwich"}},
  {"hebrew": {"type": "text", "value": "פלפלים"}, "english_name": {"type": "text_to_speech", "value": "Peppers"}},
  {"hebrew": {"type": "text", "value": "עגבנייה"}, "english_name": {"type": "text_to_speech", "value": "Tomato"}},
  {"hebrew": {"type": "text", "value": "תרד"}, "english_name": {"type": "text_to_speech", "value": "Spinach"}},
  {"hebrew": {"type": "text", "value": "ירקות"}, "english_name": {"type": "text_to_speech", "value": "Vegetables"}}
],

ENGLISH_VOCAB_PEOPLE_AND_FAMILY: [
  {"hebrew": {"type": "text", "value": "מורה"}, "english_name": {"type": "text_to_speech", "value": "Teacher"}},
  {"hebrew": {"type": "text", "value": "ילדים"}, "english_name": {"type": "text_to_speech", "value": "Children"}},
  {"hebrew": {"type": "text", "value": "אח"}, "english_name": {"type": "text_to_speech", "value": "Brother"}},
  {"hebrew": {"type": "text", "value": "אבא"}, "english_name": {"type": "text_to_speech", "value": "Father"}},
  {"hebrew": {"type": "text", "value": "סבתא"}, "english_name": {"type": "text_to_speech", "value": "Grandmother"}},
  {"hebrew": {"type": "text", "value": "סבא"}, "english_name": {"type": "text_to_speech", "value": "Grandfather"}},
  {"hebrew": {"type": "text", "value": "אמא"}, "english_name": {"type": "text_to_speech", "value": "Mother"}}
],

ENGLISH_VOCAB_OBJECTS_AND_PLACES: [
  {"hebrew": {"type": "text", "value": "מטבח"}, "english_name": {"type": "text_to_speech", "value": "Kitchen"}},
  {"hebrew": {"type": "text", "value": "כיסא"}, "english_name": {"type": "text_to_speech", "value": "Chair"}},
  {"hebrew": {"type": "text", "value": "שולחן"}, "english_name": {"type": "text_to_speech", "value": "Table"}},
  {"hebrew": {"type": "text", "value": "מסעדה"}, "english_name": {"type": "text_to_speech", "value": "Restaurant"}},
  {"hebrew": {"type": "text", "value": "חנות"}, "english_name": {"type": "text_to_speech", "value": "Shop"}}
],

ENGLISH_VOCAB_DAYS_AND_TIMEWORDS: [
  {"hebrew": {"type": "text", "value": "יום שני"}, "english_name": {"type": "text_to_speech", "value": "Monday"}},
  {"hebrew": {"type": "text", "value": "יום רביעי"}, "english_name": {"type": "text_to_speech", "value": "Wednesday"}},
  {"hebrew": {"type": "text", "value": "יום חמישי"}, "english_name": {"type": "text_to_speech", "value": "Thursday"}},
  {"hebrew": {"type": "text", "value": "יום שישי"}, "english_name": {"type": "text_to_speech", "value": "Friday"}},
  {"hebrew": {"type": "text", "value": "יום שבת"}, "english_name": {"type": "text_to_speech", "value": "Saturday"}},
  {"hebrew": {"type": "text", "value": "יום ראשון"}, "english_name": {"type": "text_to_speech", "value": "Sunday"}},
  {"hebrew": {"type": "text", "value": "היום"}, "english_name": {"type": "text_to_speech", "value": "Today"}},
  {"hebrew": {"type": "text", "value": "מחר"}, "english_name": {"type": "text_to_speech", "value": "Tomorrow"}},
  {"hebrew": {"type": "text", "value": "אתמול"}, "english_name": {"type": "text_to_speech", "value": "Yesterday"}},
  {"hebrew": {"type": "text", "value": "יום שלישי"}, "english_name": {"type": "text_to_speech", "value": "Tuesday"}}
],

ENGLISH_VOCAB_NUMBERS: [
  {"hebrew": {"type": "text", "value": "שלוש"}, "english_name": {"type": "text_to_speech", "value": "Three"}},
  {"hebrew": {"type": "text", "value": "אחד עשר"}, "english_name": {"type": "text_to_speech", "value": "Eleven"}},
  {"hebrew": {"type": "text", "value": "שנים עשר"}, "english_name": {"type": "text_to_speech", "value": "Twelve"}},
  {"hebrew": {"type": "text", "value": "שלוש עשרה"}, "english_name": {"type": "text_to_speech", "value": "Thirteen"}},
  {"hebrew": {"type": "text", "value": "ארבע עשרה"}, "english_name": {"type": "text_to_speech", "value": "Fourteen"}},
  {"hebrew": {"type": "text", "value": "חמש עשרה"}, "english_name": {"type": "text_to_speech", "value": "Fifteen"}},
  {"hebrew": {"type": "text", "value": "שש עשרה"}, "english_name": {"type": "text_to_speech", "value": "Sixteen"}},
  {"hebrew": {"type": "text", "value": "שבע עשרה"}, "english_name": {"type": "text_to_speech", "value": "Seventeen"}},
  {"hebrew": {"type": "text", "value": "שמונה עשרה"}, "english_name": {"type": "text_to_speech", "value": "Eighteen"}},
  {"hebrew": {"type": "text", "value": "תשע עשרה"}, "english_name": {"type": "text_to_speech", "value": "Nineteen"}},
  {"hebrew": {"type": "text", "value": "עשרים"}, "english_name": {"type": "text_to_speech", "value": "Twenty"}}
],

ENGLISH_VOCAB_FEELINGS_AND_NEEDS: [
  {"hebrew": {"type": "text", "value": "רעב"}, "english_name": {"type": "text_to_speech", "value": "Hungry"}},
  {"hebrew": {"type": "text", "value": "צמא"}, "english_name": {"type": "text_to_speech", "value": "Thirsty"}},
  {"hebrew": {"type": "text", "value": "צריך"}, "english_name": {"type": "text_to_speech", "value": "Need"}},
  {"hebrew": {"type": "text", "value": "רוצה"}, "english_name": {"type": "text_to_speech", "value": "Want"}}
],

ENGLISH_VOCAB_TIME_GENERAL: [
  {"hebrew": {"type": "text", "value": "יום"}, "english_name": {"type": "text_to_speech", "value": "Day"}},
  {"hebrew": {"type": "text", "value": "זמן"}, "english_name": {"type": "text_to_speech", "value": "Time"}}
],

ENGLISH_VOCAB_DAILY_ACTIONS: [
  {"hebrew": {"type": "text", "value": "לשטוף"}, "english_name": {"type": "text_to_speech", "value": "Wash"}}
],

ENGLISH_VOCAB_BODY_PARTS: [
  {"hebrew": {"type": "text", "value": "פה"}, "english_name": {"type": "text_to_speech", "value": "Mouth"}},
  {"hebrew": {"type": "text", "value": "שיניים"}, "english_name": {"type": "text_to_speech", "value": "Teeth"}}
],

ENGLISH_VOCAB_MISC: [
  {"hebrew": {"type": "text", "value": "יום הולדת"}, "english_name": {"type": "text_to_speech", "value": "Birthday"}},
  {"hebrew": {"type": "text", "value": "מועדף"}, "english_name": {"type": "text_to_speech", "value": "Favorite"}},
  {"hebrew": {"type": "text", "value": "לשתף"}, "english_name": {"type": "text_to_speech", "value": "Share"}},
  {"hebrew": {"type": "text", "value": "קצר"}, "english_name": {"type": "text_to_speech", "value": "Short"}},
  {"hebrew": {"type": "text", "value": "ארוחת צהריים"}, "english_name": {"type": "text_to_speech", "value": "Lunch"}}
],

ENGLISH_VOCAB_ALL: [],

ADDITION: createAsymmetricExercises(10, inverseAddition, "ADDITION"),
SUBTRACTION: createAsymmetricExercises(10, inverseSubtraction, "SUBTRACTION"),
MULTIPLICATION: createAsymmetricExercises(10, inverseMultiplication, "MULTIPLICATION"),
DIVISION: createAsymmetricExercises(10, inverseDivision, "DIVISION"),
COUNT: createCount(10),
}

const ENGLISH_VOCABULARY_LISTS = [
    DATA.ENGLISH_VOCAB_FOOD,
    DATA.ENGLISH_VOCAB_PEOPLE_AND_FAMILY,
    DATA.ENGLISH_VOCAB_OBJECTS_AND_PLACES,
    DATA.ENGLISH_VOCAB_DAYS_AND_TIMEWORDS,
    DATA.ENGLISH_VOCAB_NUMBERS,
    DATA.ENGLISH_VOCAB_FEELINGS_AND_NEEDS,
    DATA.ENGLISH_VOCAB_TIME_GENERAL,
    DATA.ENGLISH_VOCAB_DAILY_ACTIONS,
    DATA.ENGLISH_VOCAB_BODY_PARTS,
    DATA.ENGLISH_VOCAB_MISC,
];
DATA.ENGLISH_VOCAB_ALL = ENGLISH_VOCABULARY_LISTS.flat();

function filterABCByString(lettersStr, abcList) {
    const letterSet = new Set(lettersStr.split("")); // להאיץ את הבדיקה
    return abcList.filter(item => letterSet.has(item.englishUpperCase.value));
}
DATA.practiceABC = filterABCByString("QRYPGJKZVN", DATA.ABC)




function getUniqueElements(word) {
    const uniqueLettersSet = new Set();
    const uniqueElements = [];
    const hebrewLettersRegex = /^[\u0590-\u05FF]+$/; // טווח תווי יוניקוד של אותיות עבריות

    for (const char of word) {
        if (hebrewLettersRegex.test(char) && !uniqueLettersSet.has(char)) {
            uniqueLettersSet.add(char);
            const element = DATA['hebrewAlphabet'].find(item => item.letter.value === char);
            if (element) {
                uniqueElements.push(element);
            }
        }
    }

    return uniqueElements;
}

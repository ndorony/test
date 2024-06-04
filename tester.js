// https://freesound.org/people/MattLeschuck/sounds/511484/
const successSound = new Audio("./sounds/success.mp3");
// https://freesound.org/people/Leszek_Szary/sounds/171672/
const failureSound = new Audio("./sounds/failure.mp3");
function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function empty(){
}

function add() {
    let a = randomIntFromInterval(1, 10);
    let b = randomIntFromInterval(0, 6);
    let result = a + b;
    let results = [result,];
    while (results.length !== 4) {
        let option = randomIntFromInterval(1, 16);
        if (!results.includes(option)) {
            results.push(option);
        }

    }
    return [result, results, `${a} + ${b} =`, empty];
}

function sub() {
    let aa = randomIntFromInterval(1, 10);
    let bb = randomIntFromInterval(0, 6);
    let a = Math.max(aa, bb);
    let b = Math.min(aa, bb);
    let result = a - b;
    let results = [result,];
    while (results.length !== 4) {
        let option = randomIntFromInterval(1, 16);
        if (!results.includes(option)) {
            results.push(option);
        }

    }
    return [result, results, `${a} - ${b} =`, empty];
}

function getNItmes(number) {
    return he.decode(Array(number + 1).join("&#128540; "))
}

function count() {
    let result = randomIntFromInterval(1, 5);
    let nums = [result,];
    while (nums.length !== 4) {
        let option = randomIntFromInterval(1, 5);
        if (!nums.includes(option)) {
            nums.push(option);
        }
    }

    let results = [];
    for (let i = 0; i < nums.length; i++) {
        results.push(getNItmes(nums[i]));
    }
    return [getNItmes(result), results, result, empty];
}

function get_results_numbers(min, max) {
    let results = [];
    while (results.length !== 4) {
        let option = randomIntFromInterval(min, max);
        if (!results.includes(option)) {
            results.push(option);
        }
    }

    return results
}

const ALEPH_BET = [
    {
        letter: {type: "text", value:  "אָ"},
        kamatz_sound: {type: "text_to_speech", value: "aa"}
    },
    {
        letter: {type: "text", value:  "בָ"},
        kamatz_sound: {type: "text_to_speech", value: "ba"}
    },
    {
        letter: {type: "text", value:  "גָ"},
        kamatz_sound: {type: "text_to_speech", value: "ga"}
    },
    {
        letter: {type: "text", value:  "דָ"},
        kamatz_sound: {type: "text_to_speech", value: "da"}
    },
    {
        letter: {type: "text", value:  "הָ"},
        kamatz_sound: {type: "text_to_speech", value: "ha"}
    },
    {
        letter: {type: "text", value:  "וָ"},
        kamatz_sound: {type: "text_to_speech", value: "va"}
    },
    {
        letter: {type: "text", value:  "זָ"},
        kamatz_sound: {type: "text_to_speech", value: "za"}
    },
    {
        letter: {type: "text", value:  "חָ"},
        kamatz_sound: {type: "text_to_speech", value: "cha"}
    }
]



// The Alphabet records by tim.kahn - https://freesound.org/people/tim.kahn/packs/4371/
const ABC = [
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
];

function render(object) {
    switch (object.type) {
        case "text":
            return object.value;
        case "audio":
        return `<a href="#!" class="brand-logo" onclick="audio('${object.value}')"><span class="material-icons">play_circle_filled</span></a>`;
        case "text_to_speech":
            return `<a href="#!" class="brand-logo" onclick="text_to_speech('${object.value}')"><span class="material-icons">play_circle_filled</span></a>`;
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

function generate_from_list(list, questionIndex, resultIndex) {
    let results_numbers = get_results_numbers(0, list.length - 1);
    let results = [];

    for (let i = 0; i < results_numbers.length; i++) {
        results.push(render(list[results_numbers[i]][resultIndex]))
    }

    let results_number = results_numbers[randomIntFromInterval(0, results_numbers.length - 1)];
    res =  [render(list[results_number][resultIndex]), results, render(list[results_number][questionIndex]), empty];
    if(list[results_number][questionIndex].type == "audio"){
        res[3] = function(){audio(list[results_number][questionIndex].value)}
    }
    if(list[results_number][questionIndex].type == "text_to_speech"){
        res[3] = function(){text_to_speech(list[results_number][questionIndex].value)}
    }
    return res;
}

function lowerToCapital() {
    return generate_from_list(ABC, "englishLowerCase", "englishUpperCase");
}

function capitalToLower() {
    return generate_from_list(ABC, "englishUpperCase", "englishUpperCase");
}

function letterToName() {
    return generate_from_list(ABC, "englishLowerCase", "hebrewTransliteration");
}

function nameToLetter() {
    return generate_from_list(ABC, "hebrewTransliteration", "englishLowerCase");
}

function audioToLetter() {
    return generate_from_list(ABC, "audio", "englishLowerCase");
}

function heAudioToLetter() {
    return generate_from_list(ALEPH_BET, "kamatz_sound", "letter");
}

apps = [
    {icon: 'format_shapes', func: nameToLetter, name:'זהה את האות'},
    {icon: 'format_shapes', func: letterToName, name:'זהה את האות'},
    {icon: 'volume_up', func: audioToLetter, name:'זהה את האות'},
    {icon: 'format_size', func: lowerToCapital, name:'אות קטנה לגדולה'},
    {icon: 'format_size', func: capitalToLower, name:'אות גדולה לקטנה'},
    {icon: 'add_circle_outline', func: add, name:'חיבור'},
    {icon: 'remove_circle_outline', func: sub, name:'חיסור'},
    {icon: 'format_list_numbered', func: count, name:'ספירה'},
//    {icon: 'volume_up', func: heAudioToLetter, name:''},
];

let app = new Vue({
    el: '#app',
    data: {
        result: 0,
        exercise: '',
        message: {},
        ended: false,
        currentAppNumber: 0,
        score: 0,
    },
    methods: {
        create: function (code) {
            this.ended = false;
            let a = this.currentApp.func();
            this.results = this.shuffle(a[1]);
            this.exercise = a[2];
            this.result = a[0];
            a[3]();

        }, shuffle: function (a) {
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }, check: function (index) {
            if (this.results[index] === this.result) {
                this.ended = true;
                this.message = {value: this.getSuccessMsg(), success: true};
                successSound.play();
                setTimeout(this.create
                , 1)
                this.score += 1;
            } else {
                failureSound.play();
                this.score = Math.max(0, this.score - 1);
                this.message = {value: 'נסה שוב :(', error: true}
            }
        }, next: function () {
            if (this.ended) {
                this.create()
            }
        }, getSuccessMsg: function () {
            return he.decode("הצלחת &#128525;");
        }, changeApp: function () {
            this.score = 0;
            this.currentAppNumber = (this.currentAppNumber + 1) % apps.length;
            this.create();
        }
    }, created: function () {
        this.create();
    }, computed: {
        currentApp: function () {
            return apps[this.currentAppNumber];
        }
    }
})

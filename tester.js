if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      }, error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

function removeDuplicates(arr) {
  const map = new Map();
  arr.forEach(item => map.set(JSON.stringify(item), item));
  return Array.from(map.values());
}

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


function render(object) {
    switch (object.type) {
        case "text":
            return object.value;
        case "audio":
        return `<a class="brand-logo" onclick="audio('${object.value}')"><i class="medium material-icons">play_circle_filled</i></a>`;
        case "text_to_speech":
            return `<a class="brand-logo" onclick="text_to_speech('${object.value}')">${object.value}</a>`;
        case "speech":
            return `<a class="brand-logo" onclick="text_to_speech('${object.value}')"><i class="medium material-icons">play_circle_filled</i></a>`;
        default:
            return null;
    }
}

function audio(url){
    const sound = new Audio(url);
    sound.play();
}

function isHebrew(str) {
    const hebrewRegex = /^[\u0590-\u05FF\uFB1D-\uFB4F\s.,?!'"()-]*$/;
    return hebrewRegex.test(str);
}

function text_to_speech(text){
    var msg = new SpeechSynthesisUtterance();
    msg.text = text;
    if (isHebrew(text)){
        lang = 'he';
        msg.lang = "he-IL";
    } else {
        lang = 'en';
        msg.lang = "en_US";
    }
    voice = getVoice(lang);
    console.log(`Get ${voice}`)

    if (voice){
        msg.voice = voice;
    }
    msg.rate = 0.7;
    window.speechSynthesis.speak(msg);
}


const getDataList = (listName) => {
    if (!DATA[listName]) {
        throw new Error('List does not exist');
    }
    return DATA[listName];
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
        // todo: dynamic numbers
        weights = weights.map(weight => weight === 0 ? 2 : weight);

        // Set the first setItems elements that are 0 to 5
        let count = 0;
        newsItems = [];
        for (let i = 0; i < weights.length && count < setItems; i++) {
            if (weights[i] === -1) {
                weights[i] = 5;
                newsItems.push(i);
                count++;
            }
        }
        oldNew = getLocalStorage(`${key}_new_items`, []);
        newsItems = oldNew.concat(newsItems);
        setLocalStorage(`${key}_new_items`, newsItems);
    } else {
        weights = weights.map(() => 5);
    }

    setProgress(key, weights.length,
                weights.filter(function(number) { return number > -1;}).length);
    setCurrentLevelProgress(key, weights);
    }
    return weights;
}

const getWeightsForKey = (key, setItems, elements) => {
    // Check if weights already exist in localStorage
    const storedWeights = localStorage.getItem(getWeightsKey(key));
    if (storedWeights) {
        let weights = JSON.parse(storedWeights);
        if (setItems){
            newWeights = updateWeights(key, weights, setItems);
            if (newWeights) {
                weights = newWeights;
                var wKey = getWeightsKey(key);
                var wVal = JSON.stringify(weights);
                localStorage.setItem(wKey, wVal);
                if (typeof firebaseSyncLocalStorageKey === 'function') firebaseSyncLocalStorageKey(wKey, wVal);
            }
        }
        return weights;
    }

    // Initialize weights based on the mode
    let weights;
    if (setItems === 0 || getActivityMode() == 'practicing') {
        // All elements get a fixed weight of 5
        weights = elements.map(() => 5);
    } else {
        // All elements get -1 except the first which gets 5
        weights = elements.map((_, index) => index < setItems ? 5 : -1);
        setProgress(key, weights.length,
                    weights.filter(function(number) { return number > -1;}).length);
        setLocalStorage(`${key}_new_items`, Array.from({ length: setItems }, (_, index) => index));
    }

    // Store the generated weights in localStorage
    var wKey2 = getWeightsKey(key);
    var wVal2 = JSON.stringify(weights);
    localStorage.setItem(wKey2, wVal2);
    if (typeof firebaseSyncLocalStorageKey === 'function') firebaseSyncLocalStorageKey(wKey2, wVal2);
    setCurrentLevelProgress(key, weights);

    return weights;
}

const updateWeightForKey = (key, index, change) => {
    // Retrieve the current weights from localStorage
    const storedWeights = localStorage.getItem(getWeightsKey(key));
    recordAttemptResult(key, index, change < 0);
    if (typeof gtag === 'function') {
        var _appItem = getItemById(apps, key);
        gtag('event', 'question_answered', {
            app_id: key,
            app_name: _appItem ? _appItem.name : key,
            is_correct: change < 0
        });
    }
    if (!storedWeights) {
        return
    }

    // Parse the stored weights
    const weights = JSON.parse(storedWeights);

    // Update the weight with the given change and ensure it stays within bounds
    weights[index] = Math.max(0, Math.min(weights[index] + change, 15));

    // Store the updated weights back in localStorage
    var uwKey = getWeightsKey(key);
    var uwVal = JSON.stringify(weights);
    localStorage.setItem(uwKey, uwVal);
    if (typeof firebaseSyncLocalStorageKey === 'function') firebaseSyncLocalStorageKey(uwKey, uwVal);

    setCurrentLevelProgress(key, weights);

    return weights;
}

// Function to select a weighted random index
const getWeightedRandomIndexes = (list, key, setItems, count=1) => {
    const weights = getWeightsForKey(key, setItems, list);
    const eligibleIndexes = weights
        .map((weight, index) => (weight >= 0 ? index : null))
        .filter(index => index !== null);
    const totalWeight = eligibleIndexes.reduce((acc, index) => acc + weights[index], 0);

    if (eligibleIndexes.length === 0) {
        return [];
    }

    const targetCount = Math.min(count, eligibleIndexes.length);

    if (totalWeight <= 0) {
        const shuffled = eligibleIndexes.slice().sort(() => Math.random() - 0.5);
        return shuffled.slice(0, targetCount);
    }

    const indexes = [];
    let remainingWeight = totalWeight;

    while (indexes.length < targetCount && remainingWeight > 0) {
        const randomWeight = Math.random() * remainingWeight;
        let weightSum = 0;

        for (let i = 0; i < weights.length; i++) {
            if (weights[i] < 0 || indexes.includes(i)) {
                continue;
            }
            weightSum += weights[i];
            if (randomWeight < weightSum) {
                indexes.push(i);
                remainingWeight -= weights[i];
                break;
            }
        }
    }
    return indexes;
}
const getWeightedRandomIndex = (list, key, setItems) => {
    const indexes = getWeightedRandomIndexes(list, key, setItems, count=1);
    if (indexes.length) {
        return indexes[0];
    }
    return list.length ? Math.floor(Math.random() * list.length) : null;
}

const shuffleIndexes = (indexes) => {
    const shuffled = indexes.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Function to select additional random indexes excluding a specific index
const getRandomIndexesExcluding = (list, resultIndex, answerIndex, count = 3) => {
    if (!Array.isArray(list) || list.length === 0 || answerIndex === null) {
        return [];
    }

    const targetGroups = list[answerIndex]?.groups;
    let filteredIndexes;

    if (targetGroups && targetGroups.length > 0) {
        filteredIndexes = list
            .map((item, index) => ({ item, index }))
            .filter(({ item, index }) =>
                index !== answerIndex &&
                item.groups &&
                item.groups.some(group => targetGroups.includes(group))
            )
            .map(({ index }) => index);
    } else {
        filteredIndexes = list
            .map((item, index) => index)
            .filter(index => index !== answerIndex);
    }

    const answerValue = list[answerIndex]?.[resultIndex]?.value;
    const uniqueIndexByValue = new Map();

    for (const index of filteredIndexes) {
        const candidateValue = list[index]?.[resultIndex]?.value;
        if (candidateValue === undefined || candidateValue === answerValue) {
            continue;
        }
        const key = typeof candidateValue === 'string' ? candidateValue : JSON.stringify(candidateValue);
        if (!uniqueIndexByValue.has(key)) {
            uniqueIndexByValue.set(key, index);
        }
    }

    const uniqueIndexes = Array.from(uniqueIndexByValue.values());
    const targetCount = Math.min(count, uniqueIndexes.length);
    return shuffleIndexes(uniqueIndexes).slice(0, targetCount);
}

const generateOptions = (list, resultIndexes, resultFieldIndex) => {
    return resultIndexes.map(index => render(list[index][resultFieldIndex]));
}

function generateQuestion(question) {
    let action = () => {};
    if (question.type === "audio") {
        action = () => audio(question.value);
    } else if (question.type === "text_to_speech" || question.type === "speech" ) {
        action = () => text_to_speech(question.value);
    }
    return action;
}

function generateFromList(listName, questionIndex, resultIndex, key, setItems=1, questionType=null) {
    const list = getDataList(listName);

    // Select a question using weighted random selection
    const weightedRandomIndex = getWeightedRandomIndex(list, key, setItems);

    // Select three additional answers excluding weights
    const additionalIndexes = getRandomIndexesExcluding(list, resultIndex, weightedRandomIndex);

    // Combine the question index with the additional answer indexes
    const resultsIndexes = [weightedRandomIndex, ...additionalIndexes];
    const options = generateOptions(list, resultsIndexes, resultIndex);
    questionItem = { ...list[weightedRandomIndex][questionIndex] };
    if (questionType){
        questionItem['type'] = questionType;
    }

    const result = render(list[weightedRandomIndex][resultIndex]);
    const question = render(questionItem);

    action = generateQuestion(list[weightedRandomIndex][questionIndex]);

    return {
        result: result,
        options: options,
        question: question,
        action: action,
        questionIndex: weightedRandomIndex,
    };
}


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

function getSetItems(currentApp, defaultValue=1){
    return currentApp.hasOwnProperty('setItems') ? currentApp['setItems'] : defaultValue;
}


var ProgressBarComponent = Vue.component('progress-bar', {
  props: {
    progress: {
      type: Object,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    theme: {
      type: Object,
      required: true
    }
  },
  template: `
    <div>
      <p :style="{color: theme.colors.text}">{{ title }}: {{ progress.progress }}/{{ progress.total }}</p>
    <div class="progress-container" :style="{ background: theme.progressBar.background }">
        <div class="progress-bar" :style="{ width: (100 - ((progress.progress / progress.total) * 100)) + '%' }"></div>
    </div>
    </div>
  `,
  data() {
    return {};
  },
  computed: {},
  methods: {}
});



var BaseGameComponent = Vue.component('base-game',{
    template: `<div>base</div>`,

    data: function() { return {
        theme: getTheme(),
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
        reloadProgress: function(){
            this.progress = getCurrentLevelProgress(this.currentAppId);
            if (this.progress.progress == this.progress.total){
                this.$router.push('/app/' + this.currentAppId);
                return false;

            } else if (this.progress.progress == 0){
                if(getLocalStorage(`${this.currentAppId}_new_items`, []).length != 0){
                   this.$router.push('/display/news/' + this.currentAppId);
                   return false;
                }
            }
            return true;

        },
        next: function () {
            if (this.ended) {
                this.create();
            }
        },
        getSuccessMsg: function () {
            return he.decode("הצלחת &#128525;");
        },
        updateScore: function(){
            this.score = getScore(this.currentAppId);
        },
        saveScore: function(){
            setLocalStorage(`score${this.currentAppId}`, this.score);
        },
        shuffle: function (a) {
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        },
    },

    created: function () {
        this.currentAppId = this.$route.params.currentAppId
        this.currentApp = getItemById(apps, this.currentAppId);
        this.reloadProgress();
        this.updateScore();
        this.create();
        this.saveApp(this.currentAppId);
    },
})

var MCQComponent = Vue.component('msq',Vue.extend({
    template: `<div>

    <div class="container">
        <div class="row">
            <h3 v-html="exercise" :style="{color: theme.colors.text}"></h3>
        </div>
        <div class="row">
            <a class="waves-effect waves-light btn-large result answer-option"
               v-for="(result, index) in results"
               v-on:click="check(index)"
               :style="{background: theme.colors.secondary}">{{ result }}</a>

        </div>
        <div class="row" dir="rtl">
            <h2 v-bind:class="{ 'error': message.error, 'success': message.success }">{{ message.value }}</h2>
        </div>
        <div class="row"><h3 :style="{color: theme.colors.text}">{{ score }}</h3></div>
        <progress-bar :title="'שלב נוכחי'" :progress="progress" :theme="theme"></progress-bar>
        </div>
        </div>
    </div>`,

    extends: BaseGameComponent,

    methods: {
        create: function (code) {
            this.saved = []

            let question = generateFromList(this.currentApp.listName, this.currentApp.questionIndex, this.currentApp.resultIndex, this.currentAppId,
                                            getSetItems(this.currentApp), questionType=this.currentApp.questionType);
            this.results = this.shuffle(question.options);
            this.exercise = question.question;
            this.result = question.result;
            this.questionIndex = question.questionIndex;
            if(this.reloadProgress()){
                question.action();
                this.$forceUpdate();
                setTimeout(() => {
                this.ended = false;
                }, 500);
            }

        },
        check: function (index) {
            if (this.ended){
                return
            }
            else if (this.results[index] === this.result) {
                this.ended = true;
                this.message = {value: this.getSuccessMsg(), success: true};
                successSound.play();
                updateWeightForKey(this.currentAppId, this.questionIndex, -1)
                this.score += 1;
                if (this.reloadProgress()){
                    this.saveScore();
                    setTimeout(this.create, 1000)
                }
            } else {
                failureSound.play();
                this.score = Math.max(0, this.score - 1);
                this.saveScore();
                updateWeightForKey(this.currentAppId, this.questionIndex, 1)
                this.message = {value: 'נסה שוב :(', error: true}
                this.reloadProgress();
            }
        },
    },
}))

var CommonComponent = Vue.component('common',Vue.extend({
    template: `<div>
    <div class="container">
        <div class="row">
          <div class="col s10 offset-s1">
            <div class="card">
             <div class="radio-group">
              <label v-for="(button, idx) in indexes['a']" :key="idx + globalKey" style="padding:5%">
                <input
                  class="with-gap"
                  name="a"
                  type="radio"
                  :value="button"
                  v-model="selectedButtons['a']"
                  @change="runLogicIfBothSelected"
                />
                <span>{{ getButton('a', idx) }}</span>
              </label>
             </div>
            </div>
            <div class="card">
             <div class="radio-group">
              <label v-for="(button, idx) in indexes['b']" :key="idx + globalKey + 10" style="padding:5%">
                <input
                  class="with-gap"
                  name="a"
                  type="radio"
                  :value="button"
                  v-model="selectedButtons['b']"
                  @change="runLogicIfBothSelected"
                />
                <span>{{ getButton('b', idx) }}</span>
              </label>
             </div>
            </div>
          </div>
        </div>

        <div class="row" dir="rtl">
            <h2 v-bind:class="{ 'error': message.error, 'success': message.success }">{{ message.value }}</h2>
        </div>
        <div class="row"><h3 :style="{color: theme.colors.text}">{{ score }}</h3></div>
        <progress-bar :title="'שלב נוכחי'" :progress="progress" :theme="theme"></progress-bar>
        </div>
        </div>
    </div>`,

    extends: BaseGameComponent,

    data: function() { return {
        groups: ['a', 'b'],
        indexes: null,
        questionIndex: null,
        selectedButtons: null,
        list: null,
        globalKey: 0,
    }},

    methods: {
        create: function (code) {
            this.selectedButtons = {}
            this.indexes = {}
            this.list = getDataList(this.currentApp.listName);
            const weightedRandomIndex = getWeightedRandomIndex(this.list, this.currentAppId, getSetItems(this.currentApp, 5));
            const additionalIndexes = getRandomIndexesExcluding(this.list, this.currentApp.a, weightedRandomIndex, 10);
            this.questionIndex = weightedRandomIndex;
            this.indexes['a'] = this.shuffle(additionalIndexes.slice(0, 5).concat(weightedRandomIndex));
            this.indexes['b'] = this.shuffle(additionalIndexes.slice(-5).concat(weightedRandomIndex));
            if(this.reloadProgress()){
                this.$forceUpdate();
                setTimeout(() => {
                this.ended = false;
                }, 500);
            }

        }, clearSelection() {
          this.selectedButtons = {
            'a': null,
            'b': null
          };
        },
        getButton(group, idx){
               return this.list[this.indexes[group][idx]][this.currentApp[group]].value;
        },

        runLogicIfBothSelected() {

          if (this.selectedButtons.a == null || this.selectedButtons.b == null) {
           return
          }
            if (this.selectedButtons.a === this.selectedButtons.b){
                    this.ended = true;
                    this.message = {value: this.getSuccessMsg(), success: true};
                    successSound.play();
                    updateWeightForKey(this.currentAppId, this.questionIndex, -1)
                    this.score += 1;
                    this.questionIndex = null;
                    if (this.reloadProgress()){
                        this.saveScore();
                        setTimeout(this.create, 500)
                    }
            } else {
                failureSound.play();
                this.score = Math.max(0, this.score - 1);
                this.saveScore();
                updateWeightForKey(this.currentAppId, this.questionIndex, 1)
                this.message = {value: `נסה שוב :(`, error: true}
                this.reloadProgress();

            }
            this.clearSelection();
            this.globalKey += 100;
            this.$forceUpdate();

          },
         display: function(){

        }
    },
}))

var SpellComponent = Vue.component('spell',Vue.extend({
    template: `<div>

    <div class="container">
        <div class="row">
            <h3 v-html="exercise" :style="{color: theme.colors.text}"></h3>
        </div>
        <div class="row">
        <div class="col s8 offset-s2">
        <div>
          <label for="answer">הקלד את המילה:</label>
          <input type="text" id="answer" v-model="answer">
        </div>
        </div>
       </div>
       <div class="row">
            <div class="center-align">
               <a class="waves-effect waves-light btn-large result" v-on:click="check()" :style="{background: theme.colors.secondary}">בדוק</a>
            </div>
        </div>
        <div class="row" dir="rtl">
            <h2 v-bind:class="{ 'error': message.error, 'success': message.success }">{{ message.value }}</h2>
        </div>
        <div class="row"><h3 :style="{color: theme.colors.text}">{{ score }}</h3></div>
        <progress-bar :title="'שלב נוכחי'" :progress="progress" :theme="theme"></progress-bar>
        </div>
        </div>
    </div>`,

    extends: BaseGameComponent,

    data: function() { return {
        answer: null
    }},

    methods: {
        create: function (code) {
            this.saved = []
            const list = getDataList(this.currentApp.listName);
            const weightedRandomIndex = getWeightedRandomIndex(list,
                                                               this.currentAppId,
                                                               getSetItems(this.currentApp));
            this.result = list[weightedRandomIndex][this.currentApp.questionIndex].value;
            this.exercise = render({'type': 'speech', 'value': this.result});
            this.questionIndex = weightedRandomIndex;
            if(this.reloadProgress()){
                this.$forceUpdate();
                setTimeout(() => {
                this.ended = false;
                text_to_speech(this.result);
                }, 500);
            }

        },
        check: function (index) {
            if (this.ended){
                return
            }
            else if (this.result.toLowerCase() === this.answer.trim().toLowerCase()) {
                this.ended = true;
                this.message = {value: this.getSuccessMsg(), success: true};
                successSound.play();
                updateWeightForKey(this.currentAppId, this.questionIndex, -1)
                this.score += 1;
                this.answer = '';
                if (this.reloadProgress()){
                    this.saveScore();
                    setTimeout(this.create, 1000)
                }
            } else {
                failureSound.play();
                this.score = Math.max(0, this.score - 1);
                this.saveScore();
                updateWeightForKey(this.currentAppId, this.questionIndex, 1)
                this.message = {value: `נסה שוב :( התשובה היא ${this.result}`, error: true}
                this.reloadProgress();
            }
        },

         display: function(){

        }
    },
}))

var DrawLetterComponent = Vue.component('draw', Vue.extend({
    template: `<div>

    <div class="container">
        <div class="row">
            <h5 v-html="title" :style="{color: theme.colors.text}"></h5>
            <h5 v-html="exercise" :style="{color: theme.colors.text}"></h5>

        </div>
        <div class="row">
        <div class="center-align">
          <canvas  id="drawingCanvas" width="%100" height="280"></canvas>
        </div>
       </div>

        <div class="row">
            <div class="center-align">
               <a class="waves-effect waves-light btn-large result" v-on:click="check()" :style="{background: theme.colors.secondary}">בדוק</a>
               <a class="waves-effect waves-light btn-large result" v-on:click="clearCanvas()" :style="{background: theme.colors.secondary}">נקה</a>
            </div>
        </div>
        <div class="row" dir="rtl">
            <h5 v-bind:class="{ 'error': message.error, 'success': message.success }">{{ message.value }}</h5>
        </div>
        <div class="row"><h5 :style="{color: theme.colors.text}">{{ score }}</h5></div>
        <progress-bar :title="'שלב נוכחי'" :progress="progress" :theme="theme"></progress-bar>
        </div>
        </div>

    </div>`,

    extends: BaseGameComponent,

    data: function() {
        return {
            title: '',
            answer: null,
            recognizedLetter: '',
            score: 0
        }
    },

    methods: {
        create: function (code) {
        const canvas = document.getElementById('drawingCanvas');
        const ctx = canvas.getContext('2d');

        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'black';

        const getCoordinates = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            if (e.type.includes('touch')) {
                return [
                    (e.touches[0].clientX - rect.left) * scaleX,
                    (e.touches[0].clientY - rect.top) * scaleY
                ];
            } else {
                return [
                    (e.clientX - rect.left) * scaleX,
                    (e.clientY - rect.top) * scaleY
                ];
            }
        };

        const startDrawing = (e) => {
            isDrawing = true;
            [lastX, lastY] = getCoordinates(e);
        };

        const draw = (e) => {
            if (!isDrawing) return;
            e.preventDefault(); // Prevent scrolling on touch devices
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            const [currentX, currentY] = getCoordinates(e);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            [lastX, lastY] = [currentX, currentY];
        };

        const stopDrawing = () => {
            isDrawing = false;
        };

        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);


            const list = getDataList(this.currentApp.listName);
            const weightedRandomIndex = getWeightedRandomIndex(list,
                                                               this.currentAppId,
                                                               getSetItems(this.currentApp));
            this.title = this.currentApp.title;
            this.questionIndex = weightedRandomIndex;
            this.result = list[weightedRandomIndex][this.currentApp.resultIndex].value;
            this.exercise = render(list[weightedRandomIndex][this.currentApp.questionIndex]);
            action = generateQuestion(list[weightedRandomIndex][this.currentApp.questionIndex]);
            if(this.reloadProgress()){
                this.$forceUpdate();
                setTimeout(() => {
                this.ended = false;
                action();
                }, 500);
            }
        },

        getCoordinates(e) {
            const canvas = document.getElementById('drawingCanvas');
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX || e.touches[0].clientX) - rect.left;
            const y = (e.clientY || e.touches[0].clientY) - rect.top;
            return [x, y];
        },

        clearCanvas: function() {
            const canvas = document.getElementById('drawingCanvas');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            resultDiv.textContent = '';
        },
        check: function () {
            const canvas = document.getElementById('drawingCanvas');
            const list = getDataList(this.currentApp.listName);
            const whitelist = new Set();
            list.forEach(item => {
                const letter = item[this.currentApp.resultIndex].value.toUpperCase();
                if (/[A-Z]/.test(letter)) {
                    whitelist.add(letter);
                }
            });
            const tessedit_char_whitelist = Array.from(whitelist).join('')
            console.log(tessedit_char_whitelist);


            Tesseract.recognize(canvas, 'eng', {
                logger: m => console.log(m),
                tessedit_char_whitelist: tessedit_char_whitelist,
                oem: Tesseract.OEM_LSTM_ONLY,
                psm: Tesseract.PSM_SINGLE_CHAR
            }).then(({ data: { text, confidence, symbols } }) => {
                this.recognizedLetter = text.trim().charAt(0);
                console.log("Recognized letter:", this.recognizedLetter);
                console.log("Confidence:", confidence);
                console.log("Expected result:", this.result);

                const confidenceThreshold = 40;

                if (this.recognizedLetter && /[A-Z]/.test(this.recognizedLetter.toUpperCase())) {
                    if (this.recognizedLetter === this.result.toUpperCase() && confidence >= confidenceThreshold) {
                        this.message = {value: this.getSuccessMsg(), success: true};
                        this.score += 1;
                        this.saveScore();

                        updateWeightForKey(this.currentAppId, this.questionIndex, -1);
                    } else if (confidence < confidenceThreshold) {
                        this.message = {value: 'לא בטוח בזיהוי. נסה לכתוב ברור יותר.', error: true};
                    } else {
                        this.message = {value: `נסה שוב :( התשובה היא ${this.result}`, error: true};
                        this.score = Math.max(0, this.score - 1);
                        this.saveScore();
                        updateWeightForKey(this.currentAppId, this.questionIndex, 1);
                    }
                } else {
                    this.message = {value: 'לא זוהתה אות באנגלית. נסה שוב.', error: true};
                }

                this.saveScore();
                this.reloadProgress();
                setTimeout(this.clearCanvas, 500);
                if (this.message.success) {
                    setTimeout(this.create, 1000);
                }
            });
        },

        calculateScore(confidence, symbols) {
            if (symbols && symbols.length > 0) {
                let symbolConfidence = symbols[0].confidence;
                let normalizedScore = Math.round(symbolConfidence);
                return Math.min(Math.max(normalizedScore, 0), 100) / 10;
            } else {
                return Math.round(confidence) / 10;
            }
        },

        clearCanvas() {
            const canvas = document.getElementById('drawingCanvas');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        },

        display: function() {
        }
    },

    mounted() {
        this.currentAppId = this.$route.params.currentAppId
        this.currentApp = getItemById(apps, this.currentAppId);
        this.reloadProgress();
        this.updateScore();
        this.create();
    }
}));

var FallingAnswersComponent = Vue.component('falling-answers', Vue.extend({
    template: `
    <div class="container">
        <div class="row">
            <h3 v-html="title" :style="{color: theme.colors.text}"></h3>
        </div>
        <div class="row">
            <h3 v-html="exercise" :style="{color: theme.colors.text}"></h3>
        </div>
        <div class="row">
            <div class="game-area" ref="gameArea">
                <div v-for="answer in fallingAnswers"
                     :key="answer.id"
                     class="falling-answer answer-option"
                     :style="{top: answer.top + 'px', left: answer.left + 'px'}"
                     @click="checkAnswer(answer)">
                    {{ answer.text }}
                </div>
            </div>
        </div>
        <div class="row" dir="rtl">
            <h2 v-bind:class="{ 'error': message.error, 'success': message.success }">{{ message.value }}</h2>
        </div>
        <div class="row"><h3 :style="{color: theme.colors.text}">{{ score }}</h3></div>
        <progress-bar :title="'שלב נוכחי'" :progress="progress" :theme="theme"></progress-bar>
    </div>
    `,

    extends: BaseGameComponent,

    data: function() {
        return {
            title: '',
            fallingAnswers: [],
            score: 0,
            gameInterval: null,
            spawnInterval: null,
            list: [],
            mounted: false,
            currentQuestionIndex: -1,
            maxAnswersOnScreen: 6,
        }
    },

    methods: {
        create: function() {
        },

        createNewQuestion: function() {
            const weightedRandomIndex = getWeightedRandomIndex(this.list,
                                                               this.currentAppId,
                                                               getSetItems(this.currentApp));
            this.title = this.currentApp.title;
            this.currentQuestionIndex = weightedRandomIndex;
            this.result = this.list[weightedRandomIndex][this.currentApp.resultIndex].value;
            this.exercise = render(this.list[weightedRandomIndex][this.currentApp.questionIndex]);
            action = generateQuestion(this.list[weightedRandomIndex][this.currentApp.questionIndex]);
            action();
            this.updateFallingAnswers();
        },

        updateFallingAnswers: function() {

            const correctAnswer = this.list[this.currentQuestionIndex][this.currentApp.resultIndex].value;
            const wrongIndexes = getRandomIndexesExcluding(this.list, this.currentApp.resultIndex, this.currentQuestionIndex, this.maxAnswersOnScreen - 1);

            // Clear all existing answers
            this.fallingAnswers = [];
       this.createAnswer(correctAnswer, true)

            // Add the correct answer
            this.fallingAnswers.push(this.createAnswer(correctAnswer, true));

            // Add wrong answers
            wrongIndexes.forEach(wrongIndex => {
                const wrongAnswer = this.list[wrongIndex][this.currentApp.resultIndex].value;
                this.fallingAnswers.push(this.createAnswer(wrongAnswer, false));
            });

            // Shuffle the answers
            this.fallingAnswers = this.shuffleArray(this.fallingAnswers);
        },


        shuffleArray: function(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        },


        startFallingAnimation: function() {
            const gameAreaHeight = this.$refs.gameArea.offsetHeight;
            const gameAreaWidth = this.$refs.gameArea.offsetWidth;

            this.fallInterval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * this.fallingAnswers.length);
                const answer = this.fallingAnswers[randomIndex];
                if (answer.top > gameAreaHeight) {
                    answer.top = Math.random() * -200 - 50;
                    answer.left = Math.random() * (gameAreaWidth - 50);
                }
            }, 1000);

            this.gameInterval = setInterval(() => {
                this.fallingAnswers.forEach(answer => {
                    answer.top += 2;
                });
            }, 50);
        },


        createAnswer: function(text, isCorrect) {
            const gameAreaWidth = this.$refs.gameArea ? this.$refs.gameArea.offsetWidth : window.innerWidth;
            return {
                id: Math.random().toString(36).substr(2, 9),
                text: text,
                isCorrect: isCorrect,
                top: Math.random() * -200 - 50, // This will create a range from -250 to -50
                left: Math.random() * (gameAreaWidth - 50)
            };
        },

        checkAnswer: function(answer) {
            if (answer.isCorrect) {
                this.message = {value: this.getSuccessMsg(), success: true};
                this.score += 1;
                updateWeightForKey(this.currentAppId, this.currentQuestionIndex, -1);
                this.createNewQuestion();
            } else {
                this.message = {value: 'נסה שוב', error: true};
                this.score = Math.max(0, this.score - 1);
            }
            this.saveScore();
            this.reloadProgress();
        }
    },

    mounted() {
        this.currentAppId = this.$route.params.currentAppId
        this.currentApp = getItemById(apps, this.currentAppId);
        this.reloadProgress();
        this.updateScore();
        this.mounted = true;
        this.list = getDataList(this.currentApp.listName);
        this.createNewQuestion();
        this.reloadProgress();
        this.startFallingAnimation();
    },

    beforeDestroy() {
        clearInterval(this.gameInterval);
        clearInterval(this.fallInterval);
    }
}));


// Balloon Shooter - 3D first-person shooting range (Three.js).
// The question is shown above the game area; the answers hang on balloons.
// Hit the right balloon to pop it - the rest fly away. Wrong balloon pops
// and respawns. Right mouse button (or the touch button) zooms in (ADS).
var BalloonShooterComponent = Vue.component('balloon-shooter', Vue.extend({
    template: `
    <div class="container">
        <div class="row">
            <div class="shooter-area" ref="shooterArea">
                <div class="shooter-hud-top">
                    <div class="shooter-question" v-html="exercise"></div>
                    <div class="shooter-hud-message"
                         v-bind:class="{ 'error': message.error, 'success': message.success }">{{ message.value }}</div>
                </div>
                <div class="shooter-hud-score">⭐ {{ score }}</div>
                <a class="shooter-fullscreen-btn" @click="toggleFullscreen"><i class="material-icons">fullscreen</i></a>
                <div class="shooter-hud-progress" v-if="progress && progress.total">
                    <div class="shooter-hud-progress-fill"
                         :style="{width: (progress.progress / progress.total * 100) + '%'}"></div>
                </div>
                <div class="shooter-crosshair" v-show="!ads"></div>
                <div class="shooter-scope" v-show="ads"></div>
                <div class="shooter-hitmarker" v-show="hitMarker">✕</div>
                <div class="shooter-overlay" v-show="(!isTouch && !locked) || (isTouch && !started)" @click="startGame">
                    <div v-if="!isTouch">
                        <h5>לחץ כאן כדי לאחוז ברובה</h5>
                        <p>המשחק יעבור למסך מלא | הזז את העכבר כדי לכוון</p>
                        <p>קליק שמאלי — ירי | קליק ימני (החזק) — כוונת</p>
                        <p>ESC — שחרור העכבר</p>
                    </div>
                    <div v-else>
                        <h5>הקש כדי לשחק במסך מלא</h5>
                        <p>גרור כדי לכוון | 🔫 ירי | 🎯 זום</p>
                    </div>
                </div>
                <div v-if="isTouch" class="shooter-touch-controls">
                    <a class="btn-large shooter-touch-btn red" @touchstart.prevent="shoot">🔫 ירי</a>
                    <a class="btn-large shooter-touch-btn blue" @touchstart.prevent="toggleAds">🎯 זום</a>
                </div>
            </div>
        </div>
    </div>
    `,

    extends: BaseGameComponent,

    data: function() {
        return {
            title: '',
            list: [],
            locked: false,
            ads: false,
            isTouch: false,
            started: false,
            hitMarker: false,
        };
    },

    methods: {
        // BaseGameComponent's created() calls create() before the DOM exists;
        // the real setup happens in mounted() (same pattern as falling_answers).
        create: function() {},

        makeCanvasTexture: function(size, draw) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            draw(canvas.getContext('2d'), size);
            const texture = new THREE.CanvasTexture(canvas);
            texture.encoding = THREE.sRGBEncoding;
            return texture;
        },

        makeGrassTexture: function() {
            return this.makeCanvasTexture(256, (ctx, s) => {
                ctx.fillStyle = '#67a04b';
                ctx.fillRect(0, 0, s, s);
                const shades = ['#5c9444', '#74b35a', '#609a47', '#7fbd63', '#558a3f'];
                for (let i = 0; i < 3500; i++) {
                    ctx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
                    ctx.fillRect(Math.random() * s, Math.random() * s, 2, 3 + Math.random() * 3);
                }
            });
        },

        makeWoodTexture: function() {
            return this.makeCanvasTexture(256, (ctx, s) => {
                ctx.fillStyle = '#7a5230';
                ctx.fillRect(0, 0, s, s);
                for (let i = 0; i < 40; i++) {
                    ctx.strokeStyle = `rgba(${60 + Math.random() * 40}, ${35 + Math.random() * 25}, 15, ${0.25 + Math.random() * 0.3})`;
                    ctx.lineWidth = 1 + Math.random() * 2.5;
                    const y = Math.random() * s;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.bezierCurveTo(s * 0.3, y + (Math.random() - 0.5) * 14, s * 0.7, y + (Math.random() - 0.5) * 14, s, y);
                    ctx.stroke();
                }
            });
        },

        makeStripesTexture: function() {
            return this.makeCanvasTexture(128, (ctx, s) => {
                ctx.fillStyle = '#f6f2ea';
                ctx.fillRect(0, 0, s, s);
                ctx.fillStyle = '#d8342c';
                ctx.fillRect(0, 0, s / 2, s);
                const shade = ctx.createLinearGradient(0, 0, s, 0);
                shade.addColorStop(0, 'rgba(0,0,0,0.16)');
                shade.addColorStop(0.5, 'rgba(255,255,255,0.08)');
                shade.addColorStop(1, 'rgba(0,0,0,0.16)');
                ctx.fillStyle = shade;
                ctx.fillRect(0, 0, s, s);
            });
        },

        makeTargetTexture: function() {
            return this.makeCanvasTexture(256, (ctx, s) => {
                const c = s / 2;
                const rings = ['#ffffff', '#d8342c', '#ffffff', '#d8342c', '#ffd54f'];
                rings.forEach((color, i) => {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(c, c, c * (1 - i * 0.19), 0, Math.PI * 2);
                    ctx.fill();
                });
            });
        },

        makeRadialTexture: function(inner, outer) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 128;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
            gradient.addColorStop(0, inner);
            gradient.addColorStop(1, outer);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 128, 128);
            return new THREE.CanvasTexture(canvas);
        },

        makeTree: function(x, z, scale) {
            const g = this._g;
            const tree = new THREE.Group();
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.14, 0.2, 1.4, 8),
                g.woodMat
            );
            trunk.position.y = 0.7;
            trunk.castShadow = true;
            tree.add(trunk);
            const greens = [0x3e7c3a, 0x4d9446, 0x356b32];
            for (let i = 0; i < 3; i++) {
                const puff = new THREE.Mesh(
                    new THREE.SphereGeometry(0.9 - i * 0.12, 12, 10),
                    new THREE.MeshStandardMaterial({ color: greens[i % greens.length], roughness: 0.95 })
                );
                puff.position.set((Math.random() - 0.5) * 0.5, 1.7 + i * 0.55, (Math.random() - 0.5) * 0.5);
                puff.castShadow = true;
                tree.add(puff);
            }
            tree.position.set(x, 0, z);
            tree.scale.setScalar(scale);
            g.scene.add(tree);
        },

        initScene: function() {
            const area = this.$refs.shooterArea;
            // Quality tiers for weak devices: 2 = full (desktop), 1 = medium
            // (phones/tablets), 0 = low (weak phones). The FPS monitor in
            // animate() steps the tier down further if rendering is slow.
            const lowMemory = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
                              (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 3);
            const g = this._g = {
                balloons: [], particles: [],
                yaw: 0, pitch: 0, raf: null,
                quality: lowMemory ? 0 : (this.isTouch ? 1 : 2),
                fpsTime: 0, fpsFrames: 0,
                clock: new THREE.Clock(),
                raycaster: new THREE.Raycaster(),
            };

            g.scene = new THREE.Scene();
            g.scene.fog = new THREE.Fog(0xcfe4f5, 50, 140);

            g.camera = new THREE.PerspectiveCamera(75, area.clientWidth / area.clientHeight, 0.1, 300);
            g.camera.position.set(0, 1.6, 0);
            g.camera.rotation.order = 'YXZ';
            g.scene.add(g.camera);

            g.renderer = new THREE.WebGLRenderer({
                antialias: g.quality === 2,
                powerPreference: 'high-performance',
            });
            g.renderer.setSize(area.clientWidth, area.clientHeight);
            // Modern look: soft shadows + filmic tone mapping + sRGB output
            g.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            g.renderer.outputEncoding = THREE.sRGBEncoding;
            g.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            g.renderer.toneMappingExposure = 1.05;
            area.insertBefore(g.renderer.domElement, area.firstChild);

            // Gradient sky dome
            const sky = new THREE.Mesh(
                new THREE.SphereGeometry(220, 32, 16),
                new THREE.ShaderMaterial({
                    side: THREE.BackSide,
                    depthWrite: false,
                    uniforms: {
                        top: { value: new THREE.Color(0x2f6fd0) },
                        bottom: { value: new THREE.Color(0xcfe4f5) },
                    },
                    vertexShader: 'varying vec3 vP; void main(){ vP = position;' +
                        ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
                    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP;' +
                        ' void main(){ float h = normalize(vP).y * 0.5 + 0.5;' +
                        ' gl_FragColor = vec4(mix(bottom, top, pow(max(h, 0.0), 0.55)), 1.0); }',
                })
            );
            g.scene.add(sky);

            // Sun glow sprite high in the sky
            const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: this.makeRadialTexture('rgba(255,250,225,1)', 'rgba(255,236,170,0)'),
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            }));
            sunGlow.scale.set(60, 60, 1);
            sunGlow.position.set(70, 90, -120);
            g.scene.add(sunGlow);

            // Lights: warm sun with soft shadows + cool sky bounce
            g.scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x6a8f4f, 0.75));
            const sun = g.sun = new THREE.DirectionalLight(0xfff1d6, 1.25);
            sun.position.set(18, 28, 10);
            const shadowMapSize = g.quality === 2 ? 2048 : 1024;
            sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
            sun.shadow.camera.left = -25;
            sun.shadow.camera.right = 25;
            sun.shadow.camera.top = 30;
            sun.shadow.camera.bottom = -10;
            sun.shadow.camera.near = 5;
            sun.shadow.camera.far = 80;
            sun.shadow.bias = -0.0005;
            g.scene.add(sun);

            // Shared materials
            const woodMat = g.woodMat = new THREE.MeshStandardMaterial({
                map: this.makeWoodTexture(), roughness: 0.8, metalness: 0,
            });

            // Grass ground
            const grassTex = this.makeGrassTexture();
            grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
            grassTex.repeat.set(70, 70);
            grassTex.anisotropy = g.renderer.capabilities.getMaxAnisotropy();
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(300, 300),
                new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, metalness: 0 })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            g.scene.add(ground);

            // Carnival booth around the player: counter, pillars and striped roof beam
            const counter = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1, 0.7), woodMat);
            counter.position.set(0, 0.5, -1.8);
            counter.castShadow = true;
            counter.receiveShadow = true;
            g.scene.add(counter);
            const stripeTex = this.makeStripesTexture();
            for (const px of [-3.6, 3.6]) {
                const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.6, 0.25), woodMat);
                pillar.position.set(px, 1.8, -1.8);
                pillar.castShadow = true;
                g.scene.add(pillar);
            }
            const boothRoofTex = stripeTex.clone();
            boothRoofTex.needsUpdate = true;
            boothRoofTex.wrapS = THREE.RepeatWrapping;
            boothRoofTex.repeat.set(6, 1);
            const boothRoof = new THREE.Mesh(
                new THREE.BoxGeometry(7.6, 0.7, 0.1),
                new THREE.MeshStandardMaterial({ map: boothRoofTex, roughness: 0.7 })
            );
            boothRoof.position.set(0, 3.7, -1.85);
            boothRoof.rotation.x = 0.25;
            g.scene.add(boothRoof);

            // Back wall: striped carnival canvas + wooden frame + targets
            const wallTex = stripeTex.clone();
            wallTex.needsUpdate = true;
            wallTex.wrapS = THREE.RepeatWrapping;
            wallTex.repeat.set(14, 1);
            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(30, 6, 0.3),
                new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 })
            );
            wall.position.set(0, 3, -15);
            wall.receiveShadow = true;
            g.scene.add(wall);
            const wallTop = new THREE.Mesh(new THREE.BoxGeometry(30.6, 0.5, 0.5), woodMat);
            wallTop.position.set(0, 6.2, -15);
            wallTop.castShadow = true;
            g.scene.add(wallTop);
            const targetTex = this.makeTargetTexture();
            for (const tx of [-10, 0, 10]) {
                const target = new THREE.Mesh(
                    new THREE.CircleGeometry(1.1, 32),
                    new THREE.MeshStandardMaterial({ map: targetTex, roughness: 0.9 })
                );
                target.position.set(tx, 4.6, -14.8);
                g.scene.add(target);
            }

            // String lights along the top of the wall
            const bulbGeo = new THREE.SphereGeometry(0.09, 8, 8);
            const bulbColors = [0xffd54f, 0xff8a65, 0x81d4fa, 0xaed581];
            for (let i = 0; i < 17; i++) {
                const bulb = new THREE.Mesh(
                    bulbGeo,
                    new THREE.MeshBasicMaterial({ color: bulbColors[i % bulbColors.length] })
                );
                bulb.position.set(-14 + i * 1.75, 5.85 - Math.abs(Math.sin(i * 0.9)) * 0.18, -14.7);
                g.scene.add(bulb);
            }

            // Distant mountains fading into the haze
            for (const m of [[-60, -130, 26], [10, -150, 34], [75, -135, 24], [-15, -160, 40]]) {
                const mountain = new THREE.Mesh(
                    new THREE.ConeGeometry(m[2], m[2] * 0.55, 5),
                    new THREE.MeshLambertMaterial({ color: 0x8fa9c7 })
                );
                mountain.position.set(m[0], m[2] * 0.27, m[1]);
                g.scene.add(mountain);
            }

            // A few trees on the sides
            for (const tr of [[-14, -9, 1.2], [14, -10, 1.4], [-19, -13, 1.6], [20, -14, 1.1], [-9, -13.2, 0.9], [9.5, -13.5, 1.0]]) {
                this.makeTree(tr[0], tr[1], tr[2]);
            }

            // Soft clouds
            for (let i = 0; i < 5; i++) {
                const cloud = new THREE.Group();
                for (let j = 0; j < 4; j++) {
                    const puff = new THREE.Mesh(
                        new THREE.SphereGeometry(1.6 + Math.random() * 1.2, 12, 10),
                        new THREE.MeshLambertMaterial({ color: 0xffffff })
                    );
                    puff.position.set(j * 2.0 - 3, Math.random() * 0.6, Math.random() * 0.8);
                    cloud.add(puff);
                }
                cloud.position.set(-45 + i * 22, 18 + Math.random() * 8, -60 - Math.random() * 20);
                g.scene.add(cloud);
            }

            // Rifle attached to the camera
            const gun = g.gun = new THREE.Group();
            const metal = new THREE.MeshStandardMaterial({ color: 0x2b3137, roughness: 0.45, metalness: 0.85 });
            const darkMetal = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.35, metalness: 0.9 });
            const gunWood = new THREE.MeshStandardMaterial({ map: this.makeWoodTexture(), roughness: 0.6, metalness: 0 });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.075, 0.45), metal);
            body.position.set(0, 0, -0.22);
            gun.add(body);
            const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.26), gunWood);
            handguard.position.set(0, -0.022, -0.5);
            gun.add(handguard);
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 12), darkMetal);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.015, -0.62);
            gun.add(barrel);
            const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12), darkMetal);
            muzzle.rotation.x = Math.PI / 2;
            muzzle.position.set(0, 0.015, -0.78);
            gun.add(muzzle);
            const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.03, 0.01), darkMetal);
            frontSight.position.set(0, 0.04, -0.74);
            gun.add(frontSight);
            const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.07), darkMetal);
            magazine.position.set(0, -0.09, -0.3);
            magazine.rotation.x = 0.25;
            gun.add(magazine);
            const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.05), metal);
            trigger.position.set(0, -0.06, -0.12);
            gun.add(trigger);
            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.22), gunWood);
            stock.position.set(0, -0.035, 0.08);
            gun.add(stock);
            const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 14), darkMetal);
            scopeTube.rotation.x = Math.PI / 2;
            scopeTube.position.set(0, 0.062, -0.2);
            gun.add(scopeTube);
            const scopeLens = new THREE.Mesh(
                new THREE.CircleGeometry(0.019, 14),
                new THREE.MeshStandardMaterial({ color: 0x66ccff, roughness: 0.05, metalness: 0.6 })
            );
            scopeLens.position.set(0, 0.062, -0.281);
            gun.add(scopeLens);
            for (const mz of [-0.13, -0.27]) {
                const mount = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.02), darkMetal);
                mount.position.set(0, 0.045, mz);
                gun.add(mount);
            }
            // Muzzle flash: additive glow sprite
            g.flash = new THREE.Sprite(new THREE.SpriteMaterial({
                map: this.makeRadialTexture('rgba(255,240,180,1)', 'rgba(255,150,40,0)'),
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            }));
            g.flash.scale.set(0.3, 0.3, 1);
            g.flash.position.set(0, 0.015, -0.84);
            g.flash.visible = false;
            gun.add(g.flash);

            g.hipPos = new THREE.Vector3(0.22, -0.18, -0.35);
            // In ADS the scope (+0.062 above the gun origin) sits at screen center
            g.adsPos = new THREE.Vector3(0, -0.062, -0.3);
            g.gunBase = g.hipPos.clone();
            g.recoil = 0;
            gun.position.copy(g.hipPos);
            g.camera.add(gun);

            // Shared geometries: fewer allocations and less GC on weak devices
            const detail = g.quality === 2 ? [32, 24] : [20, 14];
            g.balloonGeo = new THREE.SphereGeometry(0.85, detail[0], detail[1]);
            g.knotGeo = new THREE.ConeGeometry(0.12, 0.18, 10);
            g.shredGeo = new THREE.SphereGeometry(0.06, 6, 6);
            g.popFlashGeo = new THREE.SphereGeometry(0.4, 12, 10);
            g.confettiGeo = new THREE.BoxGeometry(0.09, 0.09, 0.012);

            this.applyQuality();
        },

        // Pixel ratio and shadows by quality tier; called again by the FPS
        // monitor when stepping down on slow devices
        applyQuality: function() {
            const g = this._g;
            const maxRatios = [1, 1.5, 2];
            g.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxRatios[g.quality]));
            const shadows = g.quality > 0;
            if (g.renderer.shadowMap.enabled !== shadows) {
                g.renderer.shadowMap.enabled = shadows;
                g.sun.castShadow = shadows;
                g.scene.traverse(obj => {
                    if (obj.material) obj.material.needsUpdate = true;
                });
            }
            this.onResize();
        },

        makeLabelSprite: function(text) {
            const canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            let fontSize = 48;
            ctx.font = `bold ${fontSize}px Arial`;
            let textW = ctx.measureText(text).width;
            if (textW > 500) {
                fontSize = Math.max(22, Math.floor(fontSize * 500 / textW));
            }
            canvas.width = Math.min(560, Math.max(170, Math.ceil(textW) + 50));
            canvas.height = 96;
            ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.strokeStyle = '#37474f';
            ctx.lineWidth = 5;
            const r = 18, w = canvas.width, h = canvas.height;
            ctx.beginPath();
            ctx.moveTo(r, 3);
            ctx.arcTo(w - 3, 3, w - 3, h - 3, r);
            ctx.arcTo(w - 3, h - 3, 3, h - 3, r);
            ctx.arcTo(3, h - 3, 3, 3, r);
            ctx.arcTo(3, 3, w - 3, 3, r);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#212121';
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, w / 2, h / 2 + 2);

            const labelTexture = new THREE.CanvasTexture(canvas);
            labelTexture.encoding = THREE.sRGBEncoding;
            const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
                map: labelTexture,
                depthTest: false,
            }));
            const height = 0.85;
            sprite.scale.set(height * w / h, height, 1);
            return sprite;
        },

        makeBalloon: function(text, isCorrect, x, z, baseY, spawnDelay) {
            const g = this._g;
            const colors = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0x8e24aa, 0xfb8c00];
            const color = colors[Math.floor(Math.random() * colors.length)];

            // Glossy latex look: clearcoat physical material on full quality,
            // a cheaper phong on weaker devices
            if (!g.balloonMats) g.balloonMats = {};
            if (!g.balloonMats[color]) {
                g.balloonMats[color] = g.quality === 2
                    ? new THREE.MeshPhysicalMaterial({
                        color: color,
                        roughness: 0.3,
                        metalness: 0,
                        clearcoat: 1,
                        clearcoatRoughness: 0.12,
                    })
                    : new THREE.MeshPhongMaterial({ color: color, shininess: 90 });
            }
            const group = new THREE.Group();
            const sphere = new THREE.Mesh(g.balloonGeo, g.balloonMats[color]);
            sphere.scale.y = 1.15;
            sphere.castShadow = true;
            group.add(sphere);
            const knot = new THREE.Mesh(g.knotGeo, g.balloonMats[color]);
            knot.position.y = -1.05;
            group.add(knot);

            const sprite = this.makeLabelSprite(text);
            sprite.position.set(0, 0, 0.95);
            group.add(sprite);

            // String tied to a post on the ground (the post stays behind)
            const stringGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, -1.1, 0),
                new THREE.Vector3(0, -baseY + 0.7, 0),
            ]);
            const string = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0x444444 }));
            group.add(string);

            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.08, 0.7, 8),
                g.woodMat
            );
            post.position.set(x, 0.35, z);
            post.castShadow = true;
            g.scene.add(post);

            // New balloons inflate on the ground next to their post, then
            // float up to their place like helium (animated in animate())
            const groundY = 1.15;
            group.position.set(x, groundY, z);
            group.scale.setScalar(0.01);
            g.scene.add(group);

            const rec = {
                group: group, sphere: sphere, sprite: sprite, string: string, post: post,
                color: color, text: text, isCorrect: isCorrect,
                x: x, z: z, baseY: baseY, groundY: groundY,
                phase: Math.random() * Math.PI * 2,
                spawn: 0,
                rise: 0,
                settle: 0,
                spawnDelay: spawnDelay || 0,
                state: 'idle', vel: null,
            };
            sphere.userData.rec = rec;
            sprite.userData.rec = rec;
            g.balloons.push(rec);
            return rec;
        },

        // Free GPU resources owned by a single balloon (label texture, string)
        disposeBalloon: function(rec) {
            rec.sprite.material.map.dispose();
            rec.sprite.material.dispose();
            rec.string.geometry.dispose();
        },

        clearBalloons: function() {
            const g = this._g;
            g.balloons.forEach(b => {
                g.scene.remove(b.group);
                g.scene.remove(b.post);
                this.disposeBalloon(b);
            });
            g.balloons = [];
        },

        createNewQuestion: function() {
            const g = this._g;
            if (!g) return; // component may have been destroyed while a timeout was pending
            const weightedRandomIndex = getWeightedRandomIndex(this.list,
                                                               this.currentAppId,
                                                               getSetItems(this.currentApp));
            this.title = this.currentApp.title || '';
            this.questionIndex = weightedRandomIndex;
            this.result = this.list[weightedRandomIndex][this.currentApp.resultIndex].value;
            const questionItem = { ...this.list[weightedRandomIndex][this.currentApp.questionIndex] };
            if (this.currentApp.questionType) {
                questionItem['type'] = this.currentApp.questionType;
            }
            this.exercise = render(questionItem);
            const action = generateQuestion(this.list[weightedRandomIndex][this.currentApp.questionIndex]);
            action();

            const wrongIndexes = getRandomIndexesExcluding(this.list, this.currentApp.resultIndex, weightedRandomIndex, 3);
            const entries = this.shuffle(
                [{ text: this.result, isCorrect: true }].concat(
                    wrongIndexes.map(i => ({
                        text: this.list[i][this.currentApp.resultIndex].value,
                        isCorrect: false,
                    }))
                )
            );

            this.clearBalloons();
            const n = entries.length;
            entries.forEach((entry, i) => {
                const x = (i - (n - 1) / 2) * 3.4;
                const z = -11 - Math.random() * 1.5;
                const y = 2.6 + Math.random() * 1.6;
                this.makeBalloon(entry.text, entry.isCorrect, x, z, y, i * 0.12);
            });
            this.message = {};
            this.ended = false;
        },

        spawnParticles: function(position, color) {
            const g = this._g;
            // Rubber shreds of the popped balloon
            const shredCount = g.quality === 2 ? 16 : 9;
            for (let i = 0; i < shredCount; i++) {
                const mesh = new THREE.Mesh(
                    g.shredGeo,
                    new THREE.MeshBasicMaterial({ color: color, transparent: true })
                );
                mesh.scale.setScalar(0.8 + Math.random() * 1.2);
                mesh.position.copy(position);
                g.scene.add(mesh);
                g.particles.push({
                    mesh: mesh,
                    vel: new THREE.Vector3((Math.random() - 0.5) * 7, Math.random() * 6, (Math.random() - 0.5) * 7),
                    gravity: 9.8,
                    maxLife: 0.6,
                    life: 0.6,
                });
            }
            // Quick expanding flash at the pop point
            const flash = new THREE.Mesh(
                g.popFlashGeo,
                new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
            );
            flash.position.copy(position);
            g.scene.add(flash);
            g.particles.push({
                mesh: flash,
                vel: new THREE.Vector3(0, 0, 0),
                gravity: 0,
                grow: 6,
                maxLife: 0.18,
                life: 0.18,
            });
        },

        spawnConfetti: function(position) {
            const g = this._g;
            const colors = [0xff5252, 0xffd740, 0x69f0ae, 0x40c4ff, 0xe040fb, 0xffab40];
            const confettiCount = g.quality === 2 ? 26 : 14;
            for (let i = 0; i < confettiCount; i++) {
                const mesh = new THREE.Mesh(
                    g.confettiGeo,
                    new THREE.MeshBasicMaterial({
                        color: colors[i % colors.length],
                        transparent: true,
                        side: THREE.DoubleSide,
                    })
                );
                mesh.position.copy(position);
                g.scene.add(mesh);
                g.particles.push({
                    mesh: mesh,
                    vel: new THREE.Vector3((Math.random() - 0.5) * 5, 2 + Math.random() * 4, (Math.random() - 0.5) * 5),
                    gravity: 3.5,
                    spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
                    maxLife: 1.7,
                    life: 1.7,
                });
            }
        },

        playShotSound: function() {
            try {
                if (!this._audioCtx) {
                    this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = this._audioCtx;
                const duration = 0.12;
                const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
                }
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 900;
                const gain = ctx.createGain();
                gain.gain.value = 0.35;
                source.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                source.start();
            } catch (e) {}
        },

        shoot: function() {
            const g = this._g;
            if (!g) return;
            if (!this.isTouch && !this.locked) return;

            g.recoil = 1;
            g.flash.visible = true;
            g.flash.material.rotation = Math.random() * Math.PI * 2;
            setTimeout(() => { if (this._g) this._g.flash.visible = false; }, 60);
            this.playShotSound();

            if (this.ended) return;

            // Camera kick upwards, like a real rifle
            g.pitch = Math.min(1.2, g.pitch + (this.ads ? 0.004 : 0.012));

            g.raycaster.setFromCamera(new THREE.Vector2(0, 0), g.camera);
            const targets = [];
            g.balloons.forEach(b => {
                if (b.state === 'idle') {
                    targets.push(b.sphere, b.sprite);
                }
            });
            const hits = g.raycaster.intersectObjects(targets, false);
            if (!hits.length) return;

            // Hit marker flash at the crosshair
            this.hitMarker = true;
            clearTimeout(this._hitMarkerTimer);
            this._hitMarkerTimer = setTimeout(() => { this.hitMarker = false; }, 130);

            const rec = hits[0].object.userData.rec;
            this.popBalloon(rec);
            if (rec.isCorrect) {
                this.spawnConfetti(rec.group.position);
                this.onCorrectHit();
            } else {
                this.onWrongHit(rec);
            }
        },

        popBalloon: function(rec) {
            rec.state = 'popped';
            this.spawnParticles(rec.group.position, rec.color);
            this._g.scene.remove(rec.group);
            this.disposeBalloon(rec);
        },

        onCorrectHit: function() {
            this.ended = true;
            this.message = { value: this.getSuccessMsg(), success: true };
            successSound.play();
            updateWeightForKey(this.currentAppId, this.questionIndex, -1);
            this.score += 1;
            // The remaining balloons fly away
            this._g.balloons.forEach(b => {
                if (b.state === 'idle') {
                    b.state = 'flying';
                    b.vel = new THREE.Vector3((Math.random() - 0.5) * 1.5, 3.5 + Math.random() * 2, 0);
                    // The string dangles below the balloon instead of stretching to the ground
                    const positions = b.string.geometry.attributes.position;
                    positions.setY(1, -2.4);
                    positions.needsUpdate = true;
                }
            });
            if (this.reloadProgress()) {
                this.saveScore();
                setTimeout(this.createNewQuestion, 1800);
            }
        },

        onWrongHit: function(rec) {
            failureSound.play();
            this.score = Math.max(0, this.score - 1);
            this.saveScore();
            updateWeightForKey(this.currentAppId, this.questionIndex, 1);
            this.message = { value: 'נסה שוב :(', error: true };
            this.reloadProgress();
        },

        animate: function() {
            const g = this._g;
            if (!g) return;
            g.raf = requestAnimationFrame(this.animate);
            const dt = Math.min(g.clock.getDelta(), 0.05);
            const t = g.clock.elapsedTime;

            // Adaptive quality: step down if the device can't keep up
            g.fpsTime += dt;
            g.fpsFrames += 1;
            if (g.fpsTime > 2) {
                const fps = g.fpsFrames / g.fpsTime;
                g.fpsTime = 0;
                g.fpsFrames = 0;
                if (fps < 32 && g.quality > 0) {
                    g.quality -= 1;
                    this.applyQuality();
                }
            }

            // Balloons: gentle bobbing / flying away
            for (let i = g.balloons.length - 1; i >= 0; i--) {
                const b = g.balloons[i];
                if (b.state === 'idle') {
                    if (b.spawnDelay > 0) {
                        b.spawnDelay -= dt;
                    } else if (b.spawn < 1) {
                        // Inflate on the ground with a slight overshoot (easeOutBack)
                        b.spawn = Math.min(1, b.spawn + dt / 0.4);
                        const k = b.spawn - 1;
                        const scale = Math.max(0.01, 1 + 2.70158 * k * k * k + 1.70158 * k * k);
                        b.group.scale.setScalar(scale);
                        b.group.position.y = b.groundY;
                    } else if (b.rise < 1) {
                        // Float up to place like a helium balloon (easeInOutSine)
                        b.rise = Math.min(1, b.rise + dt / 1.1);
                        const e = 0.5 - 0.5 * Math.cos(Math.PI * b.rise);
                        b.group.position.y = b.groundY + (b.baseY - b.groundY) * e;
                        b.group.rotation.z = Math.sin(t * 2.2 + b.phase) * 0.04;
                    } else {
                        // Hovering in place; bobbing amplitude fades in to avoid a jump
                        b.settle = Math.min(1, b.settle + dt);
                        b.group.position.y = b.baseY + Math.sin(t * 1.4 + b.phase) * 0.18 * b.settle;
                        b.group.rotation.z = Math.sin(t * 1.1 + b.phase) * 0.05;
                    }
                    const positions = b.string.geometry.attributes.position;
                    // The string endpoint is in local coords; compensate for the
                    // position and inflation scale so it stays tied to the post
                    positions.setY(1, (-b.group.position.y + 0.7) / b.group.scale.y);
                    positions.needsUpdate = true;
                } else if (b.state === 'flying') {
                    b.vel.y += 2 * dt;
                    b.group.position.addScaledVector(b.vel, dt);
                    if (b.group.position.y > 30) {
                        g.scene.remove(b.group);
                        this.disposeBalloon(b);
                        b.state = 'gone';
                    }
                }
            }

            // Pop particles / confetti
            for (let i = g.particles.length - 1; i >= 0; i--) {
                const p = g.particles[i];
                p.vel.y -= (p.gravity !== undefined ? p.gravity : 9.8) * dt;
                p.mesh.position.addScaledVector(p.vel, dt);
                if (p.spin) {
                    p.mesh.rotation.x += p.spin.x * dt;
                    p.mesh.rotation.y += p.spin.y * dt;
                    p.mesh.rotation.z += p.spin.z * dt;
                }
                if (p.grow) {
                    p.mesh.scale.addScalar(p.grow * dt);
                }
                p.life -= dt;
                p.mesh.material.opacity = Math.max(0, p.life / (p.maxLife || 0.6));
                if (p.life <= 0) {
                    g.scene.remove(p.mesh);
                    p.mesh.material.dispose();
                    g.particles.splice(i, 1);
                }
            }

            // ADS zoom (FOV) and gun position
            const targetFov = this.ads ? 30 : 75;
            g.camera.fov += (targetFov - g.camera.fov) * Math.min(1, dt * 10);
            g.camera.updateProjectionMatrix();
            g.gunBase.lerp(this.ads ? g.adsPos : g.hipPos, Math.min(1, dt * 12));
            g.recoil = Math.max(0, g.recoil - dt * 6);
            g.gun.position.copy(g.gunBase);
            g.gun.position.z += g.recoil * 0.06;
            // Gun sway lags behind the camera and settles back
            const swayDecay = Math.max(0, 1 - 8 * dt);
            g.swayX = (g.swayX || 0) * swayDecay;
            g.swayY = (g.swayY || 0) * swayDecay;
            g.gun.rotation.x = g.recoil * 0.1 + g.swayY;
            g.gun.rotation.y = g.swayX;
            // Subtle idle breathing motion
            g.gun.position.y += Math.sin(t * 1.8) * (this.ads ? 0.0008 : 0.003);

            g.camera.rotation.y = g.yaw;
            g.camera.rotation.x = g.pitch;
            g.renderer.render(g.scene, g.camera);
        },

        requestLock: function() {
            this.enterFullscreen();
            const g = this._g;
            if (g && g.renderer.domElement.requestPointerLock) {
                g.renderer.domElement.requestPointerLock();
            }
        },

        // On phones the game starts in fullscreen locked to landscape
        startGame: function() {
            if (this.isTouch) {
                this.started = true;
                this.enterFullscreen();
            } else {
                this.requestLock();
            }
        },

        enterFullscreen: function() {
            const area = this.$refs.shooterArea;
            const request = area.requestFullscreen || area.webkitRequestFullscreen;
            if (request) {
                try { request.call(area); } catch (e) {}
            }
            if (this.isTouch && screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(function() {});
            }
        },

        toggleFullscreen: function() {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                const exit = document.exitFullscreen || document.webkitExitFullscreen;
                if (exit) {
                    try { exit.call(document); } catch (e) {}
                }
            } else {
                this.enterFullscreen();
            }
        },

        onFullscreenChange: function() {
            // The element gets its new size only after the transition
            setTimeout(this.onResize, 100);
        },

        toggleAds: function() {
            this.ads = !this.ads;
        },

        onPointerLockChange: function() {
            this.locked = !!(this._g && document.pointerLockElement === this._g.renderer.domElement);
            if (!this.locked) {
                this.ads = false;
            }
        },

        applyLook: function(dx, dy) {
            const g = this._g;
            const sensitivity = this.ads ? 0.0009 : 0.0022;
            g.yaw -= dx * sensitivity;
            g.pitch -= dy * sensitivity;
            g.pitch = Math.max(-1.2, Math.min(1.2, g.pitch));
            g.swayX = Math.max(-0.04, Math.min(0.04, (g.swayX || 0) + dx * 0.0004));
            g.swayY = Math.max(-0.04, Math.min(0.04, (g.swayY || 0) + dy * 0.0004));
        },

        onMouseMove: function(event) {
            if (!this.locked) return;
            this.applyLook(event.movementX, event.movementY);
        },

        onMouseDown: function(event) {
            if (!this.locked) return;
            if (event.button === 0) {
                this.shoot();
            } else if (event.button === 2) {
                this.ads = true;
            }
        },

        onMouseUp: function(event) {
            if (event.button === 2) {
                this.ads = false;
            }
        },

        onContextMenu: function(event) {
            event.preventDefault();
        },

        onTouchStart: function(event) {
            if (event.touches.length) {
                this._lastTouch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            }
        },

        onTouchMove: function(event) {
            if (!event.touches.length || !this._lastTouch) return;
            event.preventDefault();
            const touch = event.touches[0];
            this.applyLook((touch.clientX - this._lastTouch.x) * 2.5, (touch.clientY - this._lastTouch.y) * 2.5);
            this._lastTouch = { x: touch.clientX, y: touch.clientY };
        },

        onResize: function() {
            const g = this._g;
            const area = this.$refs.shooterArea;
            if (!g || !area) return;
            g.camera.aspect = area.clientWidth / area.clientHeight;
            g.camera.updateProjectionMatrix();
            g.renderer.setSize(area.clientWidth, area.clientHeight);
        },
    },

    mounted() {
        this.currentAppId = this.$route.params.currentAppId;
        this.currentApp = getItemById(apps, this.currentAppId);
        this.reloadProgress();
        this.updateScore();
        this.list = getDataList(this.currentApp.listName);
        this.isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        if (typeof THREE === 'undefined') {
            this.message = { value: 'מנוע התלת-ממד לא נטען. בדוק חיבור לאינטרנט ורענן.', error: true };
            return;
        }

        this.initScene();
        this.createNewQuestion();
        this.animate();

        const canvas = this._g.renderer.domElement;
        document.addEventListener('pointerlockchange', this.onPointerLockChange);
        document.addEventListener('fullscreenchange', this.onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mouseup', this.onMouseUp);
        canvas.addEventListener('contextmenu', this.onContextMenu);
        canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
        canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
        window.addEventListener('resize', this.onResize);
    },

    beforeDestroy() {
        if (this._g) {
            cancelAnimationFrame(this._g.raf);
            if (document.pointerLockElement === this._g.renderer.domElement && document.exitPointerLock) {
                document.exitPointerLock();
            }
            const canvas = this._g.renderer.domElement;
            canvas.removeEventListener('contextmenu', this.onContextMenu);
            canvas.removeEventListener('touchstart', this.onTouchStart);
            canvas.removeEventListener('touchmove', this.onTouchMove);
            this._g.renderer.dispose();
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
            this._g = null;
        }
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen();
        }
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        document.removeEventListener('fullscreenchange', this.onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this.onFullscreenChange);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('resize', this.onResize);
        clearTimeout(this._hitMarkerTimer);
        if (screen.orientation && screen.orientation.unlock) {
            try { screen.orientation.unlock(); } catch (e) {}
        }
        if (this._audioCtx) {
            this._audioCtx.close();
            this._audioCtx = null;
        }
    }
}));


// Obstacle themes for the treasure maze. Behind the scenes every obstacle is
// the same learning question — only the visuals change, so each chamber feels
// like a new adventure without designing levels.
// Each room type also defines how a WRONG choice plays out: the wrong door
// opens too and the player walks in, but the trap is revealed at the doorway
// and the character flees back to the chamber.
//   fail: 'block'    — a wall/obstacle is suddenly revealed, the way is blocked
//   fail: 'monster'  — a creature with glowing eyes lunges from the dark
//   fail: 'collapse' — the passage caves in (planks/rocks rain down)
//   fail: 'bounce'   — a magic flash hurls the player straight back
const MAZE_SCENARIOS = [
    { title: '🚪 שערי האבן — איזו דלת מובילה לאוצר?', door: 0x8d5a2b, frame: 0x8d8794, flame: 0xffa726, light: 0xffa14d, rune: 0xffc46b,
      fail: 'block', failColor: 0x6e6675, failMsg: 'המעבר חסום בסלעים! נסה דלת אחרת' },
    { title: '✨ השער הקסום — בחר במעבר הנכון', door: 0x6a4fbf, frame: 0xb39ddb, flame: 0xb388ff, light: 0xa37bff, rune: 0xc9a6ff,
      fail: 'bounce', failColor: 0xb388ff, failMsg: 'השער הקסום הדף אותך אחורה!' },
    { title: '🐉 מאורת הדרקון — רק דלת אחת בטוחה!', door: 0x9c2f2f, frame: 0x6d4c41, flame: 0xff7043, light: 0xff6633, rune: 0xff8a5c,
      fail: 'monster', failColor: 0xff5722, eyes: 0xffd740, failMsg: 'דרקון! ברח מהר!' },
    { title: '❄️ מבוך הקרח — מצא את השער הנכון', door: 0x3f6fb5, frame: 0xa8d4e8, flame: 0x81d4fa, light: 0x6fc3ff, rune: 0x9fdcff,
      fail: 'block', failColor: 0x9fd8f5, failMsg: 'קיר קרח חוסם את הדרך!' },
    { title: '🌿 גן הסוד — איזו דלת תוביל הלאה?', door: 0x3f6f33, frame: 0x9e8f6e, flame: 0xaed581, light: 0x9ccc65, rune: 0xc5e1a5,
      fail: 'block', failColor: 0x33581f, failMsg: 'קוצים סבוכים חוסמים את הדרך!' },
    { title: '🌉 גשר התהום — איזה גשר יחזיק?', door: 0x7a6a4f, frame: 0x5d4a36, flame: 0xffb74d, light: 0xffa14d, rune: 0xffe0b2,
      fail: 'collapse', failColor: 0x8d6e63, failMsg: 'הגשר קרס! ברחת ברגע האחרון!' },
    { title: '🕷️ מאורת העכביש — בחר מעבר זהיר', door: 0x4a3f5c, frame: 0x6e6680, flame: 0x9fa8da, light: 0x8c9eff, rune: 0xb39ddb,
      fail: 'monster', failColor: 0x76608a, eyes: 0xff1744, failMsg: 'עכביש ענק! ברח!' },
    { title: '🌋 מערת הלבה — רק דרך אחת בטוחה', door: 0x5d4037, frame: 0x4e342e, flame: 0xff8a65, light: 0xff7043, rune: 0xffab91,
      fail: 'block', failColor: 0xff5722, failMsg: 'נהר לבה חוסם את הדרך!' },
    { title: '⛏️ המכרה הנטוש — איזו מנהרה פתוחה?', door: 0x6d5843, frame: 0x55483a, flame: 0xffcc80, light: 0xffb74d, rune: 0xd7ccc8,
      fail: 'collapse', failColor: 0x5d5048, failMsg: 'המנהרה התמוטטה! ברחת בזמן!' },
    { title: '🏰 חצר הטירה — איזה שער פתוח?', door: 0x8c7048, frame: 0xa099a8, flame: 0xfff176, light: 0xffe082, rune: 0xfff59d,
      fail: 'monster', failColor: 0x90a4ae, eyes: 0x80d8ff, failMsg: 'שומר הטירה תפס אותך! ברח!' },
];

var TreasureMazeComponent = Vue.component('treasure-maze', Vue.extend({
    template: `
    <div class="container">
        <div class="row">
            <div class="shooter-area maze-area" ref="mazeArea">
                <div class="shooter-hud-top">
                    <div class="maze-scenario">{{ scenarioTitle }}</div>
                    <div class="shooter-question" v-html="exercise"></div>
                    <div class="shooter-hud-message"
                         v-bind:class="{ 'error': message.error, 'success': message.success }">{{ message.value }}</div>
                </div>
                <div class="shooter-hud-score">🪙 {{ score }}<span class="maze-gems">💎 {{ gems }}</span></div>
                <a class="shooter-fullscreen-btn" @click="toggleFullscreen"><i class="material-icons">fullscreen</i></a>
                <div class="shooter-hud-progress" v-if="progress && progress.total">
                    <div class="shooter-hud-progress-fill"
                         :style="{width: (progress.progress / progress.total * 100) + '%'}"></div>
                </div>
                <div class="shooter-overlay" v-show="isTouch && !started" @click="startGame">
                    <div>
                        <h5>הקש כדי לשחק במסך מלא</h5>
                        <p>הקש על הדלת עם התשובה הנכונה</p>
                    </div>
                </div>
                <div class="maze-fade" :style="{opacity: fade}"></div>
            </div>
        </div>
    </div>
    `,

    extends: BaseGameComponent,

    data: function() {
        return {
            list: [],
            gems: 0,
            streak: 0,
            fade: 1,
            isTouch: false,
            started: false,
            scenarioTitle: '',
        };
    },

    methods: {
        // BaseGameComponent's created() calls create() before the DOM exists;
        // the real setup happens in mounted() (same pattern as balloon_shooter).
        create: function() {},

        makeCanvasTexture: function(size, draw) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            draw(canvas.getContext('2d'), size);
            const texture = new THREE.CanvasTexture(canvas);
            texture.encoding = THREE.sRGBEncoding;
            return texture;
        },

        makeRadialTexture: function(inner, outer) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 128;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
            gradient.addColorStop(0, inner);
            gradient.addColorStop(1, outer);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 128, 128);
            return new THREE.CanvasTexture(canvas);
        },

        makeWoodTexture: function() {
            return this.makeCanvasTexture(256, (ctx, s) => {
                ctx.fillStyle = '#9a7950';
                ctx.fillRect(0, 0, s, s);
                for (let i = 0; i < 40; i++) {
                    ctx.strokeStyle = `rgba(${60 + Math.random() * 40}, ${35 + Math.random() * 25}, 15, ${0.25 + Math.random() * 0.3})`;
                    ctx.lineWidth = 1 + Math.random() * 2.5;
                    const y = Math.random() * s;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.bezierCurveTo(s * 0.3, y + (Math.random() - 0.5) * 14, s * 0.7, y + (Math.random() - 0.5) * 14, s, y);
                    ctx.stroke();
                }
            });
        },

        makeStoneTexture: function() {
            return this.makeCanvasTexture(256, (ctx, s) => {
                ctx.fillStyle = '#36323d';
                ctx.fillRect(0, 0, s, s);
                const shades = ['#55505c', '#4a4550', '#5d5866', '#48434e'];
                const rows = 6, cols = 4;
                for (let r = 0; r < rows; r++) {
                    const h = s / rows;
                    const off = (r % 2) * (s / cols / 2);
                    for (let c = -1; c <= cols; c++) {
                        const w = s / cols;
                        ctx.fillStyle = shades[(r * 3 + c + 4) % shades.length];
                        ctx.fillRect(c * w - off + 2, r * h + 2, w - 4, h - 4);
                    }
                }
            });
        },

        makeCobbleTexture: function() {
            return this.makeCanvasTexture(256, (ctx, s) => {
                ctx.fillStyle = '#26242c';
                ctx.fillRect(0, 0, s, s);
                const shades = ['#3a3741', '#433f4a', '#36333d', '#3e3a45'];
                for (let i = 0; i < 220; i++) {
                    ctx.fillStyle = shades[i % shades.length];
                    ctx.beginPath();
                    ctx.ellipse(Math.random() * s, Math.random() * s,
                                5 + Math.random() * 10, 4 + Math.random() * 8,
                                Math.random() * Math.PI, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        },

        makeLabelSprite: function(text) {
            const canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            let fontSize = 48;
            ctx.font = `bold ${fontSize}px Arial`;
            let textW = ctx.measureText(text).width;
            if (textW > 500) {
                fontSize = Math.max(22, Math.floor(fontSize * 500 / textW));
            }
            canvas.width = Math.min(560, Math.max(170, Math.ceil(textW) + 50));
            canvas.height = 96;
            ctx = canvas.getContext('2d');
            // Old parchment scroll look for the maze signs
            ctx.fillStyle = 'rgba(245, 230, 200, 0.97)';
            ctx.strokeStyle = '#5d4024';
            ctx.lineWidth = 5;
            const r = 18, w = canvas.width, h = canvas.height;
            ctx.beginPath();
            ctx.moveTo(r, 3);
            ctx.arcTo(w - 3, 3, w - 3, h - 3, r);
            ctx.arcTo(w - 3, h - 3, 3, h - 3, r);
            ctx.arcTo(3, h - 3, 3, 3, r);
            ctx.arcTo(3, 3, w - 3, 3, r);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#2e1f10';
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, w / 2, h / 2 + 2);

            const labelTexture = new THREE.CanvasTexture(canvas);
            labelTexture.encoding = THREE.sRGBEncoding;
            const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
                map: labelTexture,
                depthTest: false,
            }));
            const height = 0.8;
            sprite.scale.set(height * w / h, height, 1);
            return sprite;
        },

        initScene: function() {
            const area = this.$refs.mazeArea;
            const g = this._g = {
                particles: [],
                pickMeshes: [],
                yaw: 0, pitch: 0, lookX: 0.5, lookY: 0.5,
                mode: 'idle', walkT: 0, modeDelay: 0, walkGate: null,
                camShake: 0,
                raf: null,
                clock: new THREE.Clock(),
                raycaster: new THREE.Raycaster(),
            };

            g.scene = new THREE.Scene();
            g.scene.fog = new THREE.Fog(0x0c1024, 8, 46);

            g.camera = new THREE.PerspectiveCamera(70, area.clientWidth / area.clientHeight, 0.1, 300);
            g.camera.position.set(0, 1.6, 5);
            g.camera.rotation.order = 'YXZ';
            g.scene.add(g.camera);

            g.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
            g.renderer.setSize(area.clientWidth, area.clientHeight);
            g.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isTouch ? 1.5 : 2));
            g.renderer.outputEncoding = THREE.sRGBEncoding;
            g.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            g.renderer.toneMappingExposure = 1.1;
            area.insertBefore(g.renderer.domElement, area.firstChild);

            // Night sky dome
            const sky = new THREE.Mesh(
                new THREE.SphereGeometry(220, 32, 16),
                new THREE.ShaderMaterial({
                    side: THREE.BackSide,
                    depthWrite: false,
                    uniforms: {
                        top: { value: new THREE.Color(0x05070f) },
                        bottom: { value: new THREE.Color(0x232a52) },
                    },
                    vertexShader: 'varying vec3 vP; void main(){ vP = position;' +
                        ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
                    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP;' +
                        ' void main(){ float h = normalize(vP).y * 0.5 + 0.5;' +
                        ' gl_FragColor = vec4(mix(bottom, top, pow(max(h, 0.0), 0.6)), 1.0); }',
                })
            );
            g.scene.add(sky);

            // Stars
            const starPositions = [];
            for (let i = 0; i < 500; i++) {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI * 0.45;
                starPositions.push(
                    200 * Math.sin(phi) * Math.cos(theta),
                    200 * Math.cos(phi) + 5,
                    200 * Math.sin(phi) * Math.sin(theta)
                );
            }
            const starGeo = new THREE.BufferGeometry();
            starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
            g.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
                color: 0xcfdcff, size: 1.4, sizeAttenuation: false,
                transparent: true, opacity: 0.9,
            }));
            g.scene.add(g.stars);

            // Moon
            const moon = new THREE.Sprite(new THREE.SpriteMaterial({
                map: this.makeRadialTexture('rgba(235,240,255,1)', 'rgba(160,180,255,0)'),
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            }));
            moon.scale.set(34, 34, 1);
            moon.position.set(-55, 75, -130);
            g.scene.add(moon);

            // Lights: cold moonlight + warm torches (added per gate)
            g.scene.add(new THREE.HemisphereLight(0x32406e, 0x14100c, 0.55));
            const moonLight = new THREE.DirectionalLight(0x8fa6e8, 0.5);
            moonLight.position.set(-12, 22, 8);
            g.scene.add(moonLight);

            // Cobblestone floor
            const cobbleTex = this.makeCobbleTexture();
            cobbleTex.wrapS = cobbleTex.wrapT = THREE.RepeatWrapping;
            cobbleTex.repeat.set(14, 14);
            cobbleTex.anisotropy = g.renderer.capabilities.getMaxAnisotropy();
            const floor = new THREE.Mesh(
                new THREE.PlaneGeometry(80, 80),
                new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 1, metalness: 0 })
            );
            floor.rotation.x = -Math.PI / 2;
            g.scene.add(floor);

            // Shared resources for building chambers
            g.stoneTex = this.makeStoneTexture();
            g.stoneTex.wrapS = g.stoneTex.wrapT = THREE.RepeatWrapping;
            g.woodTex = this.makeWoodTexture();
            g.flameTex = this.makeRadialTexture('rgba(255,235,170,1)', 'rgba(255,140,30,0)');
            g.goldMat = new THREE.MeshStandardMaterial({
                color: 0xffc94d, roughness: 0.35, metalness: 0.8,
            });

            // The maze is built chamber by chamber: the current one sits at
            // the origin, and on a correct answer the next chamber is built
            // beyond the chosen gate so the camera walks straight into it
            // with no cut.
            g.chamber = this.buildChamber(0, 0);
            g.nextChamber = null;

            // Fireflies drifting through the chamber
            g.fireflyBase = [];
            const fireflyPositions = [];
            for (let i = 0; i < 40; i++) {
                const p = [(Math.random() - 0.5) * 24, 0.6 + Math.random() * 3.2, 5 - Math.random() * 10];
                g.fireflyBase.push(p);
                fireflyPositions.push(p[0], p[1], p[2]);
            }
            const fireflyGeo = new THREE.BufferGeometry();
            fireflyGeo.setAttribute('position', new THREE.Float32BufferAttribute(fireflyPositions, 3));
            g.fireflies = new THREE.Points(fireflyGeo, new THREE.PointsMaterial({
                color: 0xd6e88a, size: 0.09, transparent: true, opacity: 0.85,
                blending: THREE.AdditiveBlending, depthWrite: false,
            }));
            g.scene.add(g.fireflies);

            // Shared geometries for reward particles
            g.coinGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.022, 12);
            g.puffGeo = new THREE.SphereGeometry(0.09, 6, 6);
            g.flashGeo = new THREE.SphereGeometry(0.4, 12, 10);
            g.plankGeo = new THREE.BoxGeometry(0.55, 0.07, 0.18);
        },

        buildChamber: function(ox, oz) {
            const g = this._g;
            let scenario;
            do {
                scenario = MAZE_SCENARIOS[Math.floor(Math.random() * MAZE_SCENARIOS.length)];
            } while (MAZE_SCENARIOS.length > 1 && scenario === g.lastScenario);
            g.lastScenario = scenario;

            const group = new THREE.Group();
            group.position.set(ox, 0, oz);
            const chamber = {
                group: group, scenario: scenario,
                gates: [], flames: [], torchLights: [], disposables: [],
                doorMat: new THREE.MeshStandardMaterial({ map: g.woodTex, color: scenario.door, roughness: 0.7, metalness: 0 }),
                frameMat: new THREE.MeshStandardMaterial({ color: scenario.frame, roughness: 0.85, metalness: 0 }),
            };
            chamber.disposables.push(chamber.doorMat, chamber.frameMat);

            const addWall = (w, h, x, y, z, rotY) => {
                const tex = g.stoneTex.clone();
                tex.needsUpdate = true;
                tex.repeat.set(Math.max(1, w / 3.5), Math.max(1, h / 3.5));
                const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
                chamber.disposables.push(tex, mat);
                const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), mat);
                wall.position.set(x, y, z);
                if (rotY) wall.rotation.y = rotY;
                group.add(wall);
            };

            // Front wall with 3 gate openings at x = -4, 0, 4 (opening width 2.2, height 3)
            addWall(11, 5, -10.6, 2.5, -6);
            addWall(1.8, 5, -2, 2.5, -6);
            addWall(1.8, 5, 2, 2.5, -6);
            addWall(11, 5, 10.6, 2.5, -6);
            for (const gx of [-4, 0, 4]) {
                addWall(2.6, 2, gx, 4, -6);   // lintel above each opening
            }
            // Side walls
            addWall(14, 5, -16, 2.5, 0, Math.PI / 2);
            addWall(14, 5, 16, 2.5, 0, Math.PI / 2);
            // Back wall with a center opening — the doorway the player enters
            // through, aligned with the gate chosen in the previous chamber
            addWall(14.9, 5, -8.55, 2.5, 7);
            addWall(14.9, 5, 8.55, 2.5, 7);
            addWall(2.6, 2, 0, 4, 7);

            // Pulsing magic rune circle on the floor in front of the gates
            chamber.rune = new THREE.Mesh(
                new THREE.RingGeometry(1.5, 1.85, 48),
                new THREE.MeshBasicMaterial({
                    color: scenario.rune, transparent: true, opacity: 0.3,
                    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
                })
            );
            chamber.rune.rotation.x = -Math.PI / 2;
            chamber.rune.position.set(0, 0.02, -1);
            group.add(chamber.rune);
            chamber.disposables.push(chamber.rune.material);

            for (const gx of [-4, 0, 4]) {
                this.makeGate(chamber, gx);
            }

            g.scene.add(group);
            return chamber;
        },

        disposeChamber: function(chamber) {
            const g = this._g;
            chamber.gates.forEach(gate => {
                this.removeBlocker(gate);
                if (gate.label) {
                    gate.label.material.map.dispose();
                    gate.label.material.dispose();
                    gate.label = null;
                }
            });
            chamber.disposables.forEach(d => d.dispose());
            g.scene.remove(chamber.group);
        },

        makeGate: function(chamber, x) {
            const g = this._g;
            const group = new THREE.Group();
            group.position.set(x, 0, -6);

            // Dark corridor behind the doors, with a faint treasure glow
            const back = new THREE.Mesh(
                new THREE.PlaneGeometry(2.3, 3.2),
                new THREE.MeshBasicMaterial({ color: 0x03040a })
            );
            back.position.set(0, 1.5, -0.65);
            group.add(back);
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: g.flameTex,
                blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35,
            }));
            glow.scale.set(1.7, 1.7, 1);
            glow.position.set(0, 1.1, -0.6);
            group.add(glow);

            // Stone frame pillars + top trim
            for (const sx of [-1.25, 1.25]) {
                const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.5, 10), chamber.frameMat);
                pillar.position.set(sx, 1.75, 0.1);
                group.add(pillar);
            }
            const trim = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.35, 0.5), chamber.frameMat);
            trim.position.set(0, 3.35, 0.1);
            group.add(trim);

            // Double wooden doors hinged on the outer edges
            const rec = {
                chamber: chamber, group: group, baseX: x, openT: 0, openTarget: 0,
                shake: 0, hoverT: 0, label: null, entry: null, active: false,
                panels: [], blocker: null,
            };
            const makePanel = (hingeX, dir) => {
                const pivot = new THREE.Group();
                pivot.position.set(hingeX, 0, 0);
                const panel = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.9, 0.09), chamber.doorMat);
                panel.position.set(dir * 0.53, 1.45, 0);
                panel.userData.rec = rec;
                pivot.add(panel);
                const knob = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 8, 14), g.goldMat);
                knob.position.set(dir * 0.92, 1.42, 0.09);
                pivot.add(knob);
                group.add(pivot);
                rec.panels.push(panel);
                return pivot;
            };
            rec.pivotL = makePanel(-1.1, 1);
            rec.pivotR = makePanel(1.1, -1);

            // Torches on both sides of the gate + one warm light per gate
            for (const sx of [-1.8, 1.8]) {
                const stick = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.035, 0.045, 0.55, 8),
                    new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 })
                );
                stick.position.set(sx, 2.25, 0.35);
                stick.rotation.x = 0.5;
                group.add(stick);
                const flame = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: g.flameTex, color: chamber.scenario.flame,
                    blending: THREE.AdditiveBlending, depthWrite: false,
                }));
                flame.scale.set(0.55, 0.75, 1);
                flame.position.set(sx, 2.65, 0.5);
                group.add(flame);
                chamber.flames.push(flame);
            }
            const torchLight = new THREE.PointLight(chamber.scenario.light, 1.1, 11, 2);
            torchLight.position.set(x, 2.7, -5.2);
            chamber.group.add(torchLight);
            chamber.torchLights.push(torchLight);

            chamber.group.add(group);
            chamber.gates.push(rec);
        },

        // The trap revealed behind a wrong door, styled by the room type
        spawnBlocker: function(gate) {
            const g = this._g;
            const s = gate.chamber.scenario;
            const group = new THREE.Group();
            group.position.set(0, 0, -0.35);

            if (s.fail === 'monster') {
                const body = new THREE.Mesh(
                    new THREE.SphereGeometry(0.85, 14, 12),
                    new THREE.MeshStandardMaterial({ color: 0x15101c, roughness: 0.9 })
                );
                body.scale.set(1.2, 1.45, 0.7);
                body.position.y = 1.25;
                group.add(body);
                for (const ex of [-0.3, 0.3]) {
                    const eye = new THREE.Sprite(new THREE.SpriteMaterial({
                        map: g.flameTex, color: s.eyes,
                        blending: THREE.AdditiveBlending, depthWrite: false,
                    }));
                    eye.scale.set(0.34, 0.42, 1);
                    eye.position.set(ex, 1.75, 0.45);
                    group.add(eye);
                }
                group.userData.lunge = true;
            } else if (s.fail === 'collapse') {
                // The passage caves in: planks and rocks rain down in the doorway
                const gateWorld = new THREE.Vector3(gate.baseX, 0, -6).add(gate.chamber.group.position);
                for (let i = 0; i < 14; i++) {
                    const isPlank = i % 2 === 0;
                    const mesh = new THREE.Mesh(
                        isPlank ? g.plankGeo : g.puffGeo,
                        new THREE.MeshBasicMaterial({ color: isPlank ? s.failColor : 0x4a4038, transparent: true })
                    );
                    if (!isPlank) mesh.scale.setScalar(1.2 + Math.random() * 1.6);
                    mesh.position.set(
                        gateWorld.x + (Math.random() - 0.5) * 1.8,
                        2.6 + Math.random() * 1.2,
                        gateWorld.z - 0.2 - Math.random() * 0.6
                    );
                    g.scene.add(mesh);
                    g.particles.push({
                        mesh: mesh,
                        vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, -1 - Math.random() * 2, 0.4),
                        gravity: 9,
                        spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
                        maxLife: 1.1,
                        life: 1.1,
                    });
                }
                const pile = new THREE.Mesh(
                    new THREE.PlaneGeometry(2.2, 3),
                    new THREE.MeshStandardMaterial({ color: s.failColor, roughness: 0.95 })
                );
                pile.position.set(0, 1.5, 0);
                group.add(pile);
            } else {
                // 'block' and 'bounce': a wall suddenly revealed behind the door
                const block = new THREE.Mesh(
                    new THREE.PlaneGeometry(2.2, 3),
                    new THREE.MeshStandardMaterial({ color: s.failColor, roughness: 0.9 })
                );
                block.position.set(0, 1.5, 0);
                group.add(block);
            }

            // Colored flash at the doorway at the moment of the reveal
            const flashWorld = new THREE.Vector3(gate.baseX, 1.6, -5.6).add(gate.chamber.group.position);
            const flash = new THREE.Mesh(
                g.flashGeo,
                new THREE.MeshBasicMaterial({ color: s.failColor, transparent: true, opacity: 0.8 })
            );
            flash.position.copy(flashWorld);
            g.scene.add(flash);
            g.particles.push({ mesh: flash, vel: new THREE.Vector3(), gravity: 0, grow: 8, maxLife: 0.25, life: 0.25 });

            gate.group.add(group);
            gate.blocker = group;
        },

        removeBlocker: function(gate) {
            if (gate.blocker) {
                gate.group.remove(gate.blocker);
                gate.blocker = null;
            }
        },

        createNewQuestion: function() {
            const g = this._g;
            if (!g) return;
            const weightedRandomIndex = getWeightedRandomIndex(this.list,
                                                               this.currentAppId,
                                                               getSetItems(this.currentApp));
            this.questionIndex = weightedRandomIndex;
            this.result = this.list[weightedRandomIndex][this.currentApp.resultIndex].value;
            const questionItem = { ...this.list[weightedRandomIndex][this.currentApp.questionIndex] };
            if (this.currentApp.questionType) {
                questionItem['type'] = this.currentApp.questionType;
            }
            this.exercise = render(questionItem);
            const action = generateQuestion(this.list[weightedRandomIndex][this.currentApp.questionIndex]);
            action();

            // 3 doors, one correct — the maze concept uses 3 options, not 4
            const wrongIndexes = getRandomIndexesExcluding(this.list, this.currentApp.resultIndex, weightedRandomIndex, 2);
            const entries = this.shuffle(
                [{ text: this.result, isCorrect: true }].concat(
                    wrongIndexes.map(i => ({
                        text: this.list[i][this.currentApp.resultIndex].value,
                        isCorrect: false,
                    }))
                )
            );

            this.scenarioTitle = g.chamber.scenario.title;
            g.pickMeshes = [];
            g.chamber.gates.forEach((gate, i) => {
                gate.openT = 0;
                gate.openTarget = 0;
                gate.shake = 0;
                gate.hoverT = 0;
                gate.pivotL.rotation.y = 0;
                gate.pivotR.rotation.y = 0;
                gate.group.position.x = gate.baseX;
                if (gate.label) {
                    gate.group.remove(gate.label);
                    gate.label.material.map.dispose();
                    gate.label.material.dispose();
                    gate.label = null;
                }
                gate.entry = entries[i] || null;
                gate.active = !!gate.entry;
                if (gate.entry) {
                    gate.label = this.makeLabelSprite(gate.entry.text);
                    gate.label.position.set(0, 3.95, 0.6);
                    gate.label.userData.rec = gate;
                    gate.group.add(gate.label);
                    g.pickMeshes.push(gate.label);
                    gate.panels.forEach(p => g.pickMeshes.push(p));
                }
            });

            g.mode = 'idle';
            g.walkGate = null;
            this.message = {};
            this.ended = false;
        },

        spawnCoins: function(position) {
            const g = this._g;
            for (let i = 0; i < 26; i++) {
                const mesh = new THREE.Mesh(
                    g.coinGeo,
                    new THREE.MeshBasicMaterial({ color: i % 3 ? 0xffd54f : 0xffe082, transparent: true })
                );
                mesh.position.copy(position);
                g.scene.add(mesh);
                g.particles.push({
                    mesh: mesh,
                    vel: new THREE.Vector3((Math.random() - 0.5) * 4.5, 3 + Math.random() * 4, 1 + Math.random() * 2.5),
                    gravity: 8,
                    spin: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12),
                    maxLife: 1.6,
                    life: 1.6,
                });
            }
            const flash = new THREE.Mesh(
                g.flashGeo,
                new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.85 })
            );
            flash.position.copy(position);
            g.scene.add(flash);
            g.particles.push({ mesh: flash, vel: new THREE.Vector3(), gravity: 0, grow: 7, maxLife: 0.22, life: 0.22 });
        },

        pickGate: function(event) {
            const g = this._g;
            const rect = g.renderer.domElement.getBoundingClientRect();
            const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const ny = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            g.raycaster.setFromCamera(new THREE.Vector2(nx, ny), g.camera);
            const hits = g.raycaster.intersectObjects(g.pickMeshes, false);
            return hits.length ? hits[0].object.userData.rec : null;
        },

        onCanvasClick: function(event) {
            const g = this._g;
            if (!g || g.mode !== 'idle' || this.ended) return;
            const rec = this.pickGate(event);
            if (rec && rec.active) {
                this.choose(rec);
            }
        },

        onCanvasMouseMove: function(event) {
            const g = this._g;
            if (!g) return;
            const rect = g.renderer.domElement.getBoundingClientRect();
            g.lookX = (event.clientX - rect.left) / rect.width;
            g.lookY = (event.clientY - rect.top) / rect.height;
            if (g.mode === 'idle' && !this.ended) {
                const rec = this.pickGate(event);
                g.hovered = rec;
                g.renderer.domElement.style.cursor = rec ? 'pointer' : 'default';
            } else {
                g.hovered = null;
            }
        },

        choose: function(rec) {
            const g = this._g;
            const gatePos = new THREE.Vector3(rec.baseX, 1.5, -5.3);
            // Either way the chosen door opens and the player walks in — a
            // wrong choice only reveals itself at the doorway (per room type)
            rec.openTarget = 1;
            if (rec.entry.isCorrect) {
                this.ended = true;
                this.message = { value: this.getSuccessMsg(), success: true };
                successSound.play();
                updateWeightForKey(this.currentAppId, this.questionIndex, -1);
                this.score += 1;
                this.streak += 1;
                if (this.streak % 3 === 0) {
                    this.gems += 1;
                }
                this.spawnCoins(gatePos);
                if (this.reloadProgress()) {
                    this.saveScore();
                    // Build the next chamber beyond the chosen gate so the
                    // camera can walk straight into it without a cut
                    g.nextChamber = this.buildChamber(rec.baseX, -13.3);
                    g.mode = 'opening';
                    g.walkGate = rec;
                    g.modeDelay = 0.7;
                    g.walkT = 0;
                }
            } else {
                updateWeightForKey(this.currentAppId, this.questionIndex, 1);
                this.score = Math.max(0, this.score - 1);
                this.streak = 0;
                this.saveScore();
                g.mode = 'failWalk';
                g.walkGate = rec;
                g.walkT = 0;
                this.reloadProgress();
            }
        },

        animate: function() {
            const g = this._g;
            if (!g) return;
            g.raf = requestAnimationFrame(this.animate);
            const dt = Math.min(g.clock.getDelta(), 0.05);
            const t = g.clock.elapsedTime;

            // Torch flames flicker, the rune circles breathe, stars drift
            const chambers = g.nextChamber ? [g.chamber, g.nextChamber] : [g.chamber];
            chambers.forEach(chamber => {
                chamber.flames.forEach((flame, i) => {
                    const flicker = 1 + Math.sin(t * 11 + i * 2.1) * 0.13 + Math.sin(t * 23 + i) * 0.06;
                    flame.scale.set(0.55 * flicker, 0.75 * flicker, 1);
                });
                chamber.torchLights.forEach((light, i) => {
                    light.intensity = 1.1 + Math.sin(t * 13 + i * 1.7) * 0.22 + Math.sin(t * 29 + i) * 0.08;
                });
                chamber.rune.material.opacity = 0.22 + 0.14 * Math.sin(t * 1.6);
                chamber.rune.rotation.z = t * 0.15;
            });
            g.stars.rotation.y = t * 0.004;

            // Fireflies wander
            const fireflyPos = g.fireflies.geometry.attributes.position;
            for (let i = 0; i < g.fireflyBase.length; i++) {
                const base = g.fireflyBase[i];
                fireflyPos.setX(i, base[0] + Math.sin(t * 0.5 + i * 1.3) * 0.8);
                fireflyPos.setY(i, base[1] + Math.sin(t * 0.8 + i * 2.7) * 0.35);
            }
            fireflyPos.needsUpdate = true;

            // Gates: doors swing, wrong gates shake, hovered signs grow
            chambers.forEach(chamber => chamber.gates.forEach(gate => {
                gate.openT += (gate.openTarget - gate.openT) * Math.min(1, dt * 2.2);
                gate.pivotL.rotation.y = gate.openT * 1.85;
                gate.pivotR.rotation.y = -gate.openT * 1.85;
                if (gate.shake > 0) {
                    gate.group.position.x = gate.baseX + Math.sin(t * 55) * 0.07 * gate.shake;
                    gate.shake = Math.max(0, gate.shake - dt * 2.2);
                    if (gate.shake === 0) gate.group.position.x = gate.baseX;
                }
                const hoverTarget = (g.hovered === gate && g.mode === 'idle' && !this.ended) ? 1 : 0;
                gate.hoverT += (hoverTarget - gate.hoverT) * Math.min(1, dt * 10);
                if (gate.label) {
                    const s = 1 + gate.hoverT * 0.2;
                    const baseW = gate.label.scale.x / (gate.label.userData.s || 1);
                    gate.label.userData.s = s;
                    gate.label.scale.set(baseW * s, 0.8 * s, 1);
                }
            }));

            // Reward particles (coins / smoke / flash)
            for (let i = g.particles.length - 1; i >= 0; i--) {
                const p = g.particles[i];
                p.vel.y -= (p.gravity !== undefined ? p.gravity : 9.8) * dt;
                p.mesh.position.addScaledVector(p.vel, dt);
                if (p.spin) {
                    p.mesh.rotation.x += p.spin.x * dt;
                    p.mesh.rotation.y += p.spin.y * dt;
                    p.mesh.rotation.z += p.spin.z * dt;
                }
                if (p.grow) {
                    p.mesh.scale.addScalar(p.grow * dt);
                }
                p.life -= dt;
                p.mesh.material.opacity = Math.max(0, p.life / (p.maxLife || 0.6));
                if (p.life <= 0) {
                    g.scene.remove(p.mesh);
                    p.mesh.material.dispose();
                    g.particles.splice(i, 1);
                }
            }

            // Camera: parallax look in idle, a continuous walk into the next
            // chamber on success, and a walk-in / trap-reveal / flee-back
            // sequence on a wrong choice
            const yawToward = (x, z, speed) => {
                const targetYaw = Math.atan2(-(x - g.camera.position.x), -(z - g.camera.position.z));
                g.yaw += (targetYaw - g.yaw) * Math.min(1, dt * speed);
            };
            if (g.mode === 'idle') {
                const targetYaw = (0.5 - g.lookX) * 0.16;
                const targetPitch = (0.5 - g.lookY) * 0.08;
                g.yaw += (targetYaw - g.yaw) * Math.min(1, dt * 4);
                g.pitch += (targetPitch - g.pitch) * Math.min(1, dt * 4);
                g.camera.position.y = 1.6 + Math.sin(t * 1.3) * 0.025;
                this.fade = Math.max(0, this.fade - dt * 1.2);
            } else if (g.mode === 'opening') {
                g.modeDelay -= dt;
                if (g.modeDelay <= 0) {
                    g.mode = 'walk';
                }
            } else if (g.mode === 'walk') {
                // Walk through the open gate straight into the next chamber
                g.walkT = Math.min(1, g.walkT + dt / 2.2);
                const e = 0.5 - 0.5 * Math.cos(Math.PI * g.walkT);  // easeInOutSine
                const gate = g.walkGate;
                // x lines up with the gate early so we pass cleanly through the opening
                const ex = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, g.walkT * 1.8));
                g.camera.position.set(gate.baseX * ex, 1.6 + Math.sin(t * 6) * 0.02, 5 - 13.3 * e);
                g.pitch *= Math.max(0, 1 - dt * 3);
                yawToward(gate.baseX, -25, 5);
                if (g.walkT >= 1) {
                    // Seamless hand-off: drop the previous chamber and rebase
                    // the new one to the origin in the same frame the camera
                    // lands on its start point — nothing visibly jumps.
                    this.disposeChamber(g.chamber);
                    g.chamber = g.nextChamber;
                    g.nextChamber = null;
                    g.chamber.group.position.set(0, 0, 0);
                    g.camera.position.set(0, 1.6, 5);
                    g.yaw = 0;
                    g.pitch = 0;
                    this.createNewQuestion();
                }
            } else if (g.mode === 'failWalk') {
                // The wrong door opened too — walk in as if it were right...
                g.walkT = Math.min(1, g.walkT + dt / 1.1);
                const e = 0.5 - 0.5 * Math.cos(Math.PI * g.walkT);
                const gate = g.walkGate;
                const ex = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, g.walkT * 1.6));
                g.camera.position.set(gate.baseX * ex, 1.6, 5 - 9.6 * e);
                g.pitch *= Math.max(0, 1 - dt * 3);
                yawToward(gate.baseX, -25, 5);
                if (g.walkT >= 1) {
                    // ...and the trap is revealed at the doorway
                    const s = gate.chamber.scenario;
                    this.spawnBlocker(gate);
                    failureSound.play();
                    this.message = { value: s.failMsg, error: true };
                    g.camShake = 1;
                    g.mode = 'failEvent';
                    g.modeDelay = s.fail === 'bounce' ? 0.25 : 0.85;
                    g.walkT = 0;
                }
            } else if (g.mode === 'failEvent') {
                g.modeDelay -= dt;
                const blocker = g.walkGate.blocker;
                if (blocker && blocker.userData.lunge) {
                    // The monster lunges toward the player
                    blocker.position.z = Math.min(0.55, blocker.position.z + dt * 1.7);
                    blocker.scale.addScalar(dt * 0.4);
                }
                if (g.modeDelay <= 0) {
                    g.mode = 'failReturn';
                    g.walkT = 0;
                    g.returnFrom = g.camera.position.clone();
                    g.returnYaw = g.yaw;
                }
            } else if (g.mode === 'failReturn') {
                // The character flees back to the chamber
                g.walkT = Math.min(1, g.walkT + dt / 0.55);
                const e = 1 - Math.pow(1 - g.walkT, 2);  // fast escape, ease-out
                g.camera.position.lerpVectors(g.returnFrom, new THREE.Vector3(0, 1.6, 5), e);
                g.yaw = g.returnYaw * (1 - e);
                if (g.walkT >= 1) {
                    const gate = g.walkGate;
                    this.removeBlocker(gate);
                    gate.openTarget = 0;
                    gate.shake = 0.7;
                    g.camShake = 0;
                    g.mode = 'idle';
                }
            }

            // Trembling camera right after a trap is sprung
            if (g.camShake > 0) {
                g.camera.position.x += (Math.random() - 0.5) * 0.06 * g.camShake;
                g.camera.position.y += (Math.random() - 0.5) * 0.05 * g.camShake;
                g.camShake = Math.max(0, g.camShake - dt * 1.1);
            }

            g.camera.rotation.y = g.yaw;
            g.camera.rotation.x = g.pitch;
            g.renderer.render(g.scene, g.camera);
        },

        // On phones the game starts in fullscreen locked to landscape
        startGame: function() {
            this.started = true;
            this.enterFullscreen();
        },

        enterFullscreen: function() {
            const area = this.$refs.mazeArea;
            const request = area.requestFullscreen || area.webkitRequestFullscreen;
            if (request) {
                try { request.call(area); } catch (e) {}
            }
            if (this.isTouch && screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(function() {});
            }
        },

        toggleFullscreen: function() {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                const exit = document.exitFullscreen || document.webkitExitFullscreen;
                if (exit) {
                    try { exit.call(document); } catch (e) {}
                }
            } else {
                this.enterFullscreen();
            }
        },

        onFullscreenChange: function() {
            // The element gets its new size only after the transition
            setTimeout(this.onResize, 100);
        },

        onResize: function() {
            const g = this._g;
            const area = this.$refs.mazeArea;
            if (!g || !area) return;
            g.camera.aspect = area.clientWidth / area.clientHeight;
            g.camera.updateProjectionMatrix();
            g.renderer.setSize(area.clientWidth, area.clientHeight);
        },
    },

    mounted() {
        this.currentAppId = this.$route.params.currentAppId;
        this.currentApp = getItemById(apps, this.currentAppId);
        this.reloadProgress();
        this.updateScore();
        this.list = getDataList(this.currentApp.listName);
        this.isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        if (typeof THREE === 'undefined') {
            this.message = { value: 'מנוע התלת-ממד לא נטען. בדוק חיבור לאינטרנט ורענן.', error: true };
            return;
        }

        this.initScene();
        this.createNewQuestion();
        this.animate();

        const canvas = this._g.renderer.domElement;
        canvas.addEventListener('click', this.onCanvasClick);
        canvas.addEventListener('mousemove', this.onCanvasMouseMove);
        document.addEventListener('fullscreenchange', this.onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
        window.addEventListener('resize', this.onResize);
    },

    beforeDestroy() {
        if (this._g) {
            cancelAnimationFrame(this._g.raf);
            const canvas = this._g.renderer.domElement;
            canvas.removeEventListener('click', this.onCanvasClick);
            canvas.removeEventListener('mousemove', this.onCanvasMouseMove);
            this._g.renderer.dispose();
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
            this._g = null;
        }
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen();
        }
        document.removeEventListener('fullscreenchange', this.onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this.onFullscreenChange);
        window.removeEventListener('resize', this.onResize);
        if (screen.orientation && screen.orientation.unlock) {
            try { screen.orientation.unlock(); } catch (e) {}
        }
    }
}));


var DisplayComponent = Vue.component('display',{
    template: `
    <div class="container">
            <div class="row">
                <h3 v-html="exercise" :style="{color: theme.colors.text}"></h3>
            </div>
            <div class="row">
                <div class="center-align">
                   <a class="waves-effect waves-light btn-large result" v-on:click="next()" :style="{background: theme.colors.secondary}">{{ result }}</a>
                </div>
            </div>
    </div>`,

    data: function() { return {
        theme: getTheme(),
        score: null,
        displayNew: null,
        displayAll: null,
        currentAppId: null,
        currentApp: null,
        currentAppType: null,
        progress: null,
        displayKey: null,
        index: null,
        result: null,
        exercise: null,
        currentIndex: null,
        progress: null,
        key: null,
        value: null,
    }},

    mounted() {},
    methods: {
        getItems: function(){
            this.currentIndex = 0;
            const data = getDataList(this.currentApp.listName);
            if (this.displayNew){
                indexes = getLocalStorage(`${this.currentAppId}_new_items`, []);
                return indexes.map(index => data[index]);
            } else if (this.displayAll){
                weights = getWeightsForKey(this.currentAppId);
                return data.filter((item, index) => weights[index] >= 0)
            } else if (this.key){
                weights = getWeightsForKey(this.currentAppId);
                return data.filter((item, index) => weights[index] >= 0 && data[index][this.key].value == this.value)
            }
            return [data[this.itemId],];
        }, display: function(){
            item = this.items[this.currentIndex];
            if (this.currentAppType == 'spell'){
                questionItem = {'type': 'speech',
                                'value': item[this.currentApp.questionIndex].value}
                this.exercise = render(questionItem);
                this.result = item[this.currentApp.questionIndex].value;
            }
            else if (this.currentAppType == 'common'){
                this.exercise = item[this.currentApp.a].value;
                this.result = item[this.currentApp.b].value;
            } else {
                questionItem = { ...item[this.currentApp.questionIndex] };
                if (this.currentApp.questionType){
                    questionItem['type'] = this.currentApp.questionType;
                }
                this.exercise = render(questionItem);
                this.result = render(item[this.currentApp.resultIndex]);
            }
            action = generateQuestion(questionItem);
            action();

        }, next: function(){
            if (this.items.length > this.currentIndex + 1){
                this.currentIndex += 1;
                this.display();
                return
            }

            if (this.displayNew){
                setLocalStorage(`${this.currentAppId}_new_items`, []);
                this.$router.push('/play/' + this.currentAppType + '/' + this.currentAppId);
                return
            }
            this.$router.push('/app/' + this.currentAppId);
        },
    },

    created: function () {
        this.currentAppId = this.$route.params.currentAppId;
        this.currentApp = getItemById(apps, this.currentAppId);
        this.currentAppType = this.currentApp.appType;
        this.itemId = this.$route.params.itemId;
        this.key = this.$route.params.key;
        this.value = this.$route.params.value;
        this.displayAll = this.$route.path.startsWith('/display/all');
        this.displayNew = this.$route.path.startsWith('/display/news');
        this.items = this.getItems();
        if (!this.items || this.items.length === 0) {
            if (this.displayNew) {
                setLocalStorage(`${this.currentAppId}_new_items`, []);
                this.$router.push('/play/' + this.currentAppType + '/' + this.currentAppId);
                return;
            }
            this.$router.push('/app/' + this.currentAppId);
            return;
        }
        this.display();

    },
})


// Speech-to-Text Game Component (Say the letter name in English)
// Minimal help flow: "I don't know" button only.
// Integrates with your BaseGameComponent (score/progress/sounds/navigation).
var SpeechToTextComponent = Vue.component('s2t', Vue.extend({
  template: `
  <div class="container">
    <div class="row">
      <h3 v-html="title" :style="{color: theme.colors.text}"></h3>
    </div>

    <div class="row">
      <h1 class="center-align"
          :style="{color: theme.colors.text, fontSize: '8rem', margin: '20px 0'}">
        {{ displayLetter }}
      </h1>
    </div>

    <div class="row center-align">
      <a class="waves-effect waves-light btn-large"
         :style="{background: theme.colors.secondary, marginRight:'8px'}"
         @click="startListening"
         :disabled="!canListen || isListening">
        <i class="material-icons left">mic</i>
        {{ isListening ? 'מקשיב...' : 'אמור את שם האות' }}
      </a>

      <a class="waves-effect waves-light btn-large"
         :style="{background: theme.colors.tertiary}"
         @click="iDontKnow">
        לא יודע/ת
      </a>
    </div>

    <div class="row center-align" v-if="lastHeard">
      <h5 :style="{color: theme.colors.text}">
        Recognized: “{{ lastHeard }}” → {{ lastLetter || '—' }}
      </h5>
    </div>

    <div class="row" dir="rtl">
      <h2 v-bind:class="{ 'error': message.error, 'success': message.success }">
        {{ message.value }}
      </h2>
    </div>

    <div class="row"><h3 :style="{color: theme.colors.text}">{{ score }}</h3></div>
    <progress-bar :title="'שלב נוכחי'" :progress="progress" :theme="theme"></progress-bar>
  </div>
  `,

  // Reuse scoring/progress/sounds/navigation from BaseGameComponent
  extends: BaseGameComponent,

  data: function () {
    return {
      title: '',
      list: [],
      currentIndex: null,      // index in DATA list
      displayLetter: '',       // big letter shown on screen (e.g., "A")
      expectedLetter: '',      // canonical uppercase letter for messages (e.g., "A")
      expectedSpoken: [],      // array of accepted spoken variants (lowercase)
      rec: null,               // SpeechRecognition instance
      canListen: false,        // browser supports Web Speech?
      isListening: false,      // currently listening?
      lastHeard: '',           // raw transcript shown to user
      lastLetter: '',          // parsed variant that matched (if any)
    };
  },

  methods: {
    // Normalize getWeightedRandomIndex() which may return a single index or [index]
    pickWeightedIndex(list, key, setItems) {
      const v = getWeightedRandomIndex(list, key, setItems);
      return Array.isArray(v) ? v[0] : v;
    },

    // Extract accepted spoken variants from the data item; fallback to the letter itself
    getSpokenVariants(item) {
      if (item.spoken && Array.isArray(item.spoken.value)) {
        return item.spoken.value.map(s => String(s).toLowerCase().trim()).filter(Boolean);
      }
      const v = (item.englishUpperCase && item.englishUpperCase.value) || '';
      return [String(v).toLowerCase()];
    },

    // Create/initialize (or reuse) a SpeechRecognition instance and wire events
    ensureRecognizer() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return null;

      if (!this.rec) {
        this.rec = new SR();
        this.rec.lang = 'en-US';       // English letter names
        this.rec.interimResults = false;
        this.rec.maxAlternatives = 3;  // often the right word is not the top alternative
        this.rec.continuous = false;   // push-to-talk UX

        this.rec.onstart = () => { this.isListening = true; };
        this.rec.onend   = () => { this.isListening = false; };

        this.rec.onerror = () => {
          this.isListening = false;
          this.message = { value: 'Microphone/permission error. Try again.', error: true };
        };

        this.rec.onresult = (event) => {
          // Gather alternatives; sometimes the correct one is not index 0
          const alts = [];
          for (let i = 0; i < event.results[0].length; i++) {
            alts.push(event.results[0][i].transcript);
          }
          this.lastHeard = alts[0] || '';

          // Normalize input to improve matching robustness
          const norm = (t) => String(t).toLowerCase()
            .replace(/[^a-z\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          // Coalesce "double-you" → "double u"
          const normalizeW = (t) => t.replace(/\bdouble[-\s]?you\b/g, 'double u');

          let matched = null;

          outer: for (const raw of alts) {
            const t = normalizeW(norm(raw));

            // Try exact or contained word match (e.g., "the letter c")
            for (const v of this.expectedSpoken) {
              if (t === v || (' ' + t + ' ').includes(' ' + v + ' ')) {
                matched = v;
                break outer;
              }
            }

            // Special-case pattern "letter X"
            const m = t.match(/letter\s+([a-z])\b/);
            if (m && m[1] === this.expectedLetter.toLowerCase()) {
              matched = this.expectedLetter.toLowerCase();
              break;
            }
          }

          this.lastLetter = matched;

          // Handle failure to recognize a correct letter name
          if (!matched) {
            try { failureSound.play(); } catch (e) {}
            this.score = Math.max(0, this.score - 1);
            this.saveScore();
            updateWeightForKey(this.currentAppId, this.currentIndex, 1);
            this.message = { value: 'No letter name recognized. Try again.', error: true };
            this.reloadProgress();
            return;
          }

          // Success path
          this.ended = true;
          this.message = { value: this.getSuccessMsg(), success: true };
          try { successSound.play(); } catch (e) {}
          updateWeightForKey(this.currentAppId, this.currentIndex, -1);
          this.score += 1;
          if (this.reloadProgress()) {
            this.saveScore();
            setTimeout(this.create, 800);
          }
        };
      }
      return this.rec;
    },

    // Start a new round: choose a weighted item, show uppercase letter, cache spoken variants
    create() {
      this.list = getDataList(this.currentApp.listName);
      const idx  = this.pickWeightedIndex(this.list, this.currentAppId, getSetItems(this.currentApp));
      const item = this.list[idx];

      this.currentIndex   = idx;
      this.displayLetter  = item[this.currentApp.resultIndex].value; // typically englishUpperCase
      this.expectedLetter = String(this.displayLetter).toUpperCase();
      this.expectedSpoken = this.getSpokenVariants(item);

      this.title = this.currentApp.title || 'Say the letter name in English';

      if (this.reloadProgress()) {
        this.$forceUpdate();
        setTimeout(() => { this.ended = false; }, 200);
      }
    },

    // Start recognition (push-to-talk)
    startListening() {
      const rec = this.ensureRecognizer();
      if (!rec) {
        this.message = { value: 'Speech recognition is not supported in this browser.', error: true };
        return;
      }
      this.lastHeard = '';
      this.lastLetter = '';
      try { rec.start(); } catch (e) { /* ignore if already started */ }
    },

    // "I don't know" flow: reveal, speak, apply gentle penalty, move on
    iDontKnow() {
      const answerSpoken = (this.expectedSpoken[0] || this.expectedLetter).toString();
      this.message = { value: `התשובה: ${this.expectedLetter} (${answerSpoken})`, success: false, error: true };

      try { failureSound.play(); } catch (e) {}

      // Gentle penalty and weight increase so the item returns soon
      updateWeightForKey(this.currentAppId, this.currentIndex, +1);
      this.score = Math.max(0, this.score - 1);
      this.saveScore();

      // Auditory learning moment
      text_to_speech(answerSpoken);

      // Continue to next question
      if (this.reloadProgress()) {
        setTimeout(this.create, 800);
      }
    },
  },

  mounted() {
    // Standard BaseGame flow you already use across components
    this.currentAppId = this.$route.params.currentAppId;
    this.currentApp   = getItemById(apps, this.currentAppId);
    this.reloadProgress();
    this.updateScore();

    // Feature-detect Web Speech API
    this.canListen = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!this.canListen) {
      this.message = { value: 'Speech recognition is not supported here (try Chrome/Android).', error: true };
    }

    this.create();
  },

  beforeDestroy() {
    // Stop recognition if leaving while listening
    if (this.rec && this.isListening) {
      try { this.rec.stop(); } catch (e) {}
    }
  }
}));


var AppComponent = Vue.component('app',{
    template: `<div>

         <div class="container">
        <div class="row">
        <router-link :to="'/play/' + currentAppType + '/' + currentAppId" class="waves-effect waves-light btn-large result lighten-1" style="width: 100%; margin-bottom: 20px;" :style="{background: theme.colors.secondary}">
          שחק
        </router-link>
        <router-link :to="'/display/all/' + currentAppId" class="waves-effect waves-light btn-large result lighten-1" style="width: 100%; margin-bottom: 20px;" :style="{background: theme.colors.secondary}">
          הצג הכל
        </router-link>
        </div>
        <div class="row">
        <div v-for="(item, index) in items" :key="index" class="col s12 m6 l4">
                    <div class="card">
                        <div class="card-content">
                            <span v-if="item.unlocked" class="card-title">
                            <router-link :to="'/display/key/' + currentAppId + '/' + displayKey + '/' + item.value">
                                    {{ item.value }}
                            </router-link>
                            </span>
                            <span v-else class="card-title">
                                <i class="material-icons">lock</i>
                            </span>
                            <div class="attempt-history">
                              <span
                                v-for="(attempt, dotIndex) in getRecentAttempts(item.index)"
                                :key="dotIndex"
                                :class="['attempt-dot', dotClass(attempt)]"
                              ></span>
                            </div>
                        </div>
                    </div>
                </div>
        </div>
        <div class="row"><h3 :style="{color: theme.colors.text}">{{ score }}</h3></div>
        <progress-bar :title="'שלב נוכחי'" :progress="progress" :theme="theme"></progress-bar>
        </div>
    </div></div>`,

    data: function() { return {
        theme: getTheme(),
        score: null,
        currentAppId: null,
        currentAppType: null,
        currentApp: null,
        progress: null,
        weights: null,
        attemptHistory: {},
        data: null,
        displayKey: null
    }},

    methods: {
        displayItem: function(item){
            return item[this.displayKey].value;
        },
        getRecentAttempts: function(itemIndex){
            const attempts = this.attemptHistory[itemIndex] || [];
            const recent = attempts.slice(-5);
            while (recent.length < 5){
                recent.unshift(null);
            }
            return recent;
        },
        dotClass: function(attempt){
            if (attempt === null){
                return 'attempt-dot-empty';
            }
            return attempt ? 'attempt-dot-success' : 'attempt-dot-failure';
        }
    },

    created: function () {
        this.currentAppId = this.$route.params.currentAppId
        this.currentApp = getItemById(apps, this.currentAppId);
        this.currentAppType = this.currentApp.appType
        this.score = getScore(this.currentAppId);
        this.progress = getProgress(this.currentAppId, 1);
        this.data = DATA[this.currentApp.listName];
        displayNames = ["id", "name", "english_name", "englishUpperCase", "letter", "question", "hebrew", "english", "answer"];
        for (let i = 0; i < displayNames.length; i++) {
            if(this.data[0].hasOwnProperty(displayNames[i])){
                this.displayKey = displayNames[i];
                break;
            }
        }
        if (!this.displayKey) {
            const dataKeys = Object.keys(this.data[0] || {});
            this.displayKey = dataKeys.length ? dataKeys[0] : null;
        }

        this.weights = getWeightsForKey(this.currentAppId, getSetItems(this.currentApp), getDataList(this.currentApp.listName));
        this.attemptHistory = getAttemptHistory(this.currentAppId);
        const seenValues = new Set();
        this.items = [];
        this.data.forEach((item, index) => {
            const value = item[this.displayKey].value;
            if (seenValues.has(value)){
                return;
            }
            seenValues.add(value);
            this.items.push({
                value: value,
                unlocked: this.weights[index] >= 0,
                index: index,
            });
        });
    },
})


var MenuComponent = Vue.component('menu',{
    template: `
   <div>
   <div container>
    <div class="row">
      <div v-for="(app, index) in menu.items" :key="index" class="col s8 offset-s2">
        <!-- Each app as a button -->
        <router-link :to="getLink(app, index)" class="waves-effect waves-light btn-large result lighten-1" style="width: 100%; margin-bottom: 20px;" :style="{background: theme.colors.secondary}">
          {{ app.name }}
        </router-link>
      </div>
    </div>
   </div>

    </div>`,
    data: function(){
        return {
         menu: null,
         theme: getTheme(),
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
          <div class="col s8 offset-s2" :style="{color: theme.colors.secondary}">
            <h4>{{ name }}</h4>
          </div>

          <!-- Cloud Sync Section -->
          <div class="col s8 offset-s2" style="margin-bottom: 20px;">
            <div class="card">
              <div class="card-content">
                <span class="card-title" :style="{color: theme.colors.text}">
                  <i class="material-icons" style="vertical-align: middle;">cloud</i>
                  סנכרון ענן
                </span>
                <div v-if="!cloudConnected">
                  <p :style="{color: theme.colors.text}">סנכרן את הנתונים שלך בין מכשירים עם חשבון Google</p>
                  <a class="waves-effect waves-light btn" @click="cloudSignIn" :style="{background: theme.colors.secondary}" style="margin-top: 10px;">
                    <i class="material-icons left">login</i>
                    התחבר עם Google
                  </a>
                </div>
                <div v-else>
                  <p :style="{color: theme.colors.text}">
                    <i class="material-icons tiny" style="color: #4caf50; vertical-align: middle;">check_circle</i>
                    מחובר: {{ cloudEmail }}
                  </p>
                  <p :style="{color: theme.colors.text}" style="font-size: 0.85em;">
                    {{ cloudStatus }}
                  </p>
                  <div style="margin-top: 10px;">
                    <a class="waves-effect waves-light btn" @click="cloudSyncNow" :style="{background: theme.colors.secondary}" style="margin-left: 8px;">
                      <i class="material-icons left">sync</i>
                      סנכרן עכשיו
                    </a>
                    <a class="waves-effect waves-light btn red lighten-1" @click="cloudSignOut" style="margin-left: 8px;">
                      <i class="material-icons left">logout</i>
                      נתק
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="input-field col s8 offset-s2">
            <select id="useMode" @change="handleModeChange" v-model="selectedMode">
              <option v-for="mode in modes" :value="mode.key" :key="mode.key">{{ mode.description }}</option>
            </select>
            <label for="selectUser">בחר מצב משחק</label>
          </div>
          <div class="input-field col s8 offset-s2">
            <select id="selectedTheme" @change="handleThemeChanged" v-model="selectedTheme">
              <option v-for="(theme, key) in themes" :key="key" :value="key" >{{ theme.name }}</option>
            </select>
            <label for="selectedTheme">בחר נושא</label>
          </div>

          <div class="row">
          <div class="input-field col s8 offset-s2">
            <select id="hebrewVoiceSelect" v-model="selectedHebrewVoice" @change="handleHebrewVoiceChange">
              <option value="">בחר קול עברי</option>
              <option v-for="voice in hebrewVoices" :key="voice.voiceURI" :value="voice.voiceURI">
                {{ voice.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="row">

          <div class="input-field col s8 offset-s2">
            <select id="englishVoiceSelect" v-model="selectedEnglishVoice" @change="handleEnglishVoiceChange">
              <option value="">Choose English voice</option>
              <option v-for="voice in englishVoices" :key="voice.voiceURI" :value="voice.voiceURI">
                {{ voice.name }}
              </option>
            </select>
          </div>
        </div>


          <div class="col s8 offset-s2">

            <div v-for="(app, index) in apps" :key="index" class="card">
              <div class="card-content">
                <span class="card-title"><router-link :to="'/app/' + app.id" style="width: 100%; margin-bottom: 20px;">{{ app.name }}</router-link></span>
                <p>נקודות: {{ app.score }}</p>
                <p v-if="app.successRate !== null" :style="{color: theme.colors.text}">הצלחה: {{ app.successRate }}% ({{ app.totalAttempts }} ניסיונות)</p>
                <progress-bar :title="'התקדמות'" :progress="app.progress" :theme="theme"></progress-bar>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
        <div class="waves-effect waves-light btn-large result lighten-1 col s8 offset-s2" :style="{background: theme.colors.secondary}">
          <a @click="userLogout">התנתק</a>
        </div>
        </div>
      </div>
    </div>
  `,
  data: function() {
    return {
        name: '',
        apps: [],
        modes: [{"key": "learning", "description": "מצב למידה"},
                {"key": "practicing", "description": "מצב תרגול"}],
        selectedMode: null,
        selectedTheme: null,
        themes: null,
        theme: getTheme(),
        hebrewVoices: [],
        englishVoices: [],
        selectedHebrewVoice: '',
        selectedEnglishVoice: '',
        cloudConnected: false,
        cloudEmail: '',
        cloudStatus: '',
    }
  },

  created: function() {
    this.themes = themeOptions;
    this.name = getUser();
    this.loadUserApps();
    this.loadVoices();
    this.updateCloudState();

    // Listen for Firebase auth changes
    var self = this;
    window.addEventListener('firebase-auth-changed', function() {
        self.updateCloudState();
        // Reload user apps after sync
        self.loadUserApps();
    });
  },
  methods: {
    loadUserApps: function() {
      var userApps = [];
      var appList = getLocalStorage('appList', []);
      appList.forEach(function(appId) {
        var item = getItemById(apps, appId);
        if (item) {
          var history = getAttemptHistory(appId);
          var allAttempts = Object.values(history).reduce(function(acc, arr) { return acc.concat(arr); }, []);
          var successRate = allAttempts.length > 0
            ? Math.round((allAttempts.filter(Boolean).length / allAttempts.length) * 100)
            : null;
          userApps.push({
            id: appId,
            name: item.name,
            score: getScore(appId),
            progress: getProgress(appId, 1),
            successRate: successRate,
            totalAttempts: allAttempts.length
          });
        }
      });
      this.apps = userApps;
    },
    updateCloudState: function() {
      if (typeof isFirebaseConnected === 'function' && isFirebaseConnected()) {
        var user = getFirebaseUser();
        this.cloudConnected = true;
        this.cloudEmail = user ? user.email : '';
        this.cloudStatus = 'מסונכרן';
      } else {
        this.cloudConnected = false;
        this.cloudEmail = '';
        this.cloudStatus = '';
      }
    },
    cloudSignIn: function() {
      var self = this;
      if (typeof firebaseSignIn !== 'function') {
        alert('Firebase לא מוגדר. יש להגדיר את Firebase config בקובץ firebase.js');
        return;
      }
      self.cloudStatus = 'מתחבר...';
      firebaseSignIn().then(function(user) {
        self.cloudConnected = true;
        self.cloudEmail = user.email;
        self.cloudStatus = 'מסנכרן...';
        return syncFromCloud();
      }).then(function() {
        self.cloudStatus = 'מסונכרן';
        self.loadUserApps();
        self.$forceUpdate();
      }).catch(function(err) {
        console.warn('Cloud sign-in failed:', err);
        self.cloudStatus = 'ההתחברות נכשלה';
        self.updateCloudState();
      });
    },
    cloudSignOut: function() {
      var self = this;
      if (typeof firebaseSignOut !== 'function') return;
      firebaseSignOut().then(function() {
        self.cloudConnected = false;
        self.cloudEmail = '';
        self.cloudStatus = '';
      });
    },
    cloudSyncNow: function() {
      var self = this;
      if (typeof syncToCloud !== 'function') return;
      self.cloudStatus = 'מסנכרן...';
      syncFromCloud().then(function() {
        self.cloudStatus = 'סונכרן בהצלחה!';
        self.loadUserApps();
        setTimeout(function() {
          self.cloudStatus = 'מסונכרן';
        }, 2000);
      }).catch(function() {
        self.cloudStatus = 'הסנכרון נכשל';
      });
    },
    handleModeChange: function(){
        setActivityMode(this.selectedMode);
    },
    userLogout: function(){
           sessionStorage.removeItem('username');
           this.username = null;
           this.$router.push('/login');
    },
    handleThemeChanged: function(){
        setTheme(this.selectedTheme);
        this.$emit('theme-changed', this.selectedTheme);
        this.theme = getTheme();
    },
    loadVoices: function() {
      let synth = window.speechSynthesis;
      let voices = synth.getVoices();
      this.hebrewVoices = voices.filter(voice => voice.lang.startsWith('he'));
      this.englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
      console.log(this.hebrewVoices)
      if (voices.length === 0) {
        setTimeout(this.loadVoices, 10);
      } else {
        console.log('Hebrew voices:', this.hebrewVoices);
        console.log('English voices:', this.englishVoices);

        // Initialize select elements
        this.$nextTick(() => {
          M.FormSelect.init(document.querySelectorAll('select'));
        });
      }
    },
    handleHebrewVoiceChange: function() {
      if (!this.selectedHebrewVoice) return;
      setVoice('he', this.selectedHebrewVoice);
      this.speakWord('he');
    },
    handleEnglishVoiceChange: function() {
      if (!this.selectedEnglishVoice) return;
      setVoice('en', this.selectedEnglishVoice);
      this.speakWord('en');
    },
    speakWord: function(lang) {
      let voice, text;
      if (lang === 'he') {
        voice = this.hebrewVoices.find(v => v.voiceURI === this.selectedHebrewVoice);
        console.log(this.hebrewVoices)
        text = "שלום";
      } else {
        voice = this.englishVoices.find(v => v.voiceURI === this.selectedEnglishVoice);
        text = "Hello";
      }

      let utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    },
  },
  mounted() {
      // Initialize the select element when the component is mounted
      this.$nextTick(() => {
        M.FormSelect.init(document.querySelectorAll('select'));
      });
     if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = this.loadVoices;
    }
    }
});


const SignUp = {
  template: `
    <div>
      <div class="row">
        <div class="col s4 offset-s4">
        הרשמה
        <div class="input-field">
          <label for="username" :style="{ color: theme.colors.label }">שם משתמש:</label>
          <input type="text" id="username" v-model="username">
        </div>
        </div>
      </div>

      <div class="row">
        <div class="col s4 offset-s4">
          <a class="waves-effect waves-light btn-large result blue-grey lighten-1" @click="SignUp"  style="width: 100%; margin-bottom: 20px;">הרשם</a>
        </div>
        </div>
    </div>
  `,
  data() {
    return {
      username: '',
      theme: getTheme(),
    };
  },
  methods: {
    SignUp() {
      if (this.username) {
        sessionStorage.setItem('username', this.username);
        users = JSON.parse(localStorage.getItem('users')) || [];
        users.push(this.username);
        DATA['NAME'] = getUniqueElements(this.username);
        localStorage.setItem('users', JSON.stringify(removeDuplicates(users)));
        // Sync users list to cloud if connected
        if (typeof firebaseSyncUsers === 'function') {
            firebaseSyncUsers();
        }
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
        <select id="selectUser" v-model="selectedUser" class="browser-default" :disabled="!users">
          <option v-for="user in users" :key="user" >{{ user }}</option>
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
      users: null,
      theme: getTheme()

    };
  },
    created: function() {
    this.users = removeDuplicates(JSON.parse(localStorage.getItem('users'))) || [];
    if (this.users.length === 0) {
      this.$router.push('/signUp');
    }
    theme = getTheme();
  },
  methods: {
    login() {
      if (this.selectedUser) {
        sessionStorage.setItem('username', this.selectedUser);
        DATA['NAME'] = getUniqueElements(this.selectedUser);
        this.$forceUpdate();
        this.$router.push('/');
        this.$emit('theme-changed', this.selectedTheme);
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
    {path: '/play/mcq/:currentAppId', component: MCQComponent, props: true },
    {path: '/play/spell/:currentAppId', component: SpellComponent, props: true },
    {path: '/play/common/:currentAppId', component: CommonComponent, props: true },
    {path: '/play/draw_letter/:currentAppId', component: DrawLetterComponent, props: true },
    {path: '/play/falling_answers/:currentAppId', component: FallingAnswersComponent, props: true },
    {path: '/play/balloon_shooter/:currentAppId', component: BalloonShooterComponent, props: true },
    {path: '/play/treasure_maze/:currentAppId', component: TreasureMazeComponent, props: true },
    {path: '/display/news/:currentAppId', component: DisplayComponent, props: true },
    {path: '/display/all/:currentAppId', component: DisplayComponent, props: true },
    {path: '/display/item/:currentAppId/:itemId', component: DisplayComponent, props: true },
    {path: '/display/key/:currentAppId/:key/:value', component: DisplayComponent, props: true },
    { path: '/play/s2t/:currentAppId', component: SpeechToTextComponent, props: true },
    {path: '/signUp', component: SignUp},
    {path: '/login', component: Login },
]

const router = new VueRouter({
    routes
})
function sendMetric(path){
gtag('event', 'page_view', {
  'page_location': path,
  'page_title': document.title
});
}


router.beforeEach((to, from, next) => {
  const username = getUser();
  if (this.app){
    this.app.$root.username = username
  }
  if (to.path === '/signUp'){
      sendMetric(to.path);
      next();
  } else if (!username && to.path !== '/login') {
    sendMetric('/login');
    next('/login');
  } else if (username && to.path === '/login') {
    sendMetric('/');
    next('/');
  } else {
    sendMetric(to.path);
    next();
  }
});


var app = new Vue({
    router,
    data() {
        return {
          username: getUser(),
          theme: getTheme(),
        };
      },

    methods: {
        updateTheme(){
           this.theme = getTheme();
           this.changeGlobalStyle();
        }, addGlobalStyle() {
          const style = document.createElement('style');
          style.id = 'dynamic-global-style';
          style.innerHTML = `
                  body {
                    background-color: #F5F5F5; /* Hex color code */
                  }

                .dropdown-content li > a, .dropdown-content li > span {
                  color: black !important;
                  background: white !important;
                }

                .select-wrapper input.select-dropdown {
                  color: black !important;
                  background: white !important;
                  padding-right: 10px;
                }
          `;
          document.head.appendChild(style);
        },
        changeGlobalStyle() {
          const style = document.getElementById('dynamic-global-style');
            style.innerHTML = `
               body {
                  background-color: ${this.theme.colors.background}; /* Hex color code */
                }

                .dropdown-content li > a, .dropdown-content li > span {
                  color: ${this.theme.colors.text} !important;
                  background: ${this.theme.colors.tertiary} !important;
                  text-align: right; /* Align text to the right */
                }

                .select-wrapper input.select-dropdown {
                  color: ${this.theme.colors.text} !important;
                  background: ${this.theme.colors.background} !important;
                  text-align: right; /* Align text to the right */

                }


            `;
        }
    },
    created: {
         username: function(){
            return getUser();
         }
    },
    mounted() {
        if (this.username){
            DATA['NAME'] = getUniqueElements(this.username);
        }
        version = localStorage.getItem('en_version', 0.1);
        if (!version){
            localStorage.clear();
        }
        this.addGlobalStyle();
        localStorage.setItem('en_version', 0.1)
       document.getElementById('loading-screen').classList.add('hidden');
    }
}).$mount('#app')

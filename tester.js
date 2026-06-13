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
                <div class="shooter-hud-ammo" v-bind:class="{ reloading: reloading, empty: ammoInMag === 0 }">
                    <span class="shooter-ammo-current">{{ ammoInMag }}</span>
                    <span class="shooter-ammo-separator">/</span>
                    <span class="shooter-ammo-mag">{{ magazineSize }}</span>
                    <span class="shooter-ammo-reserve">∞</span>
                    <span class="shooter-ammo-state">{{ reloading ? 'LOADING' : magazineState }}</span>
                </div>
                <div class="shooter-hud-gun" v-if="gunCount > 1" @click="switchGun">🔫 {{ gunName }}<span class="shooter-gun-hint" v-if="!isTouch">G — החלף</span></div>
                <a class="shooter-fullscreen-btn" @click="toggleFullscreen"><i class="material-icons">fullscreen</i></a>
                <div class="shooter-hud-progress" v-if="progress && progress.total">
                    <div class="shooter-hud-progress-fill"
                         :style="{width: (progress.progress / progress.total * 100) + '%'}"></div>
                </div>
                <div class="shooter-crosshair" v-show="!scoped"></div>
                <div class="shooter-scope" v-show="scoped"></div>
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
                    <a class="btn-large shooter-touch-btn green darken-1" v-if="gunCount > 1" @touchstart.prevent="switchGun">🔁</a>
                    <a class="btn-large shooter-touch-btn amber darken-2" @touchstart.prevent="reloadMagazine">R</a>
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
            // scoped = the ADS raise + zoom animation has finished. For weapons with
            // a scope we then hide the gun and show a full "through the scope" overlay.
            scoped: false,
            gunHasScope: false,
            isTouch: false,
            started: false,
            hitMarker: false,
            magazineSize: 8,
            ammoInMag: 8,
            reloading: false,
            magazineState: 'READY',
            gunName: 'רובה קלאסי',
            gunCount: 1,
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

        makeBalloonTexture: function(color) {
            return this.makeCanvasTexture(256, (ctx, s) => {
                const base = new THREE.Color(color);
                const light = base.clone().lerp(new THREE.Color(0xffffff), 0.45).getStyle();
                const dark = base.clone().lerp(new THREE.Color(0x0b1020), 0.35).getStyle();
                const grad = ctx.createRadialGradient(s * 0.34, s * 0.28, s * 0.03, s * 0.55, s * 0.58, s * 0.72);
                grad.addColorStop(0, light);
                grad.addColorStop(0.28, base.getStyle());
                grad.addColorStop(1, dark);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, s, s);
                ctx.fillStyle = 'rgba(255,255,255,0.55)';
                ctx.beginPath();
                ctx.ellipse(s * 0.34, s * 0.29, s * 0.12, s * 0.2, -0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath();
                ctx.ellipse(s * 0.43, s * 0.43, s * 0.04, s * 0.08, -0.5, 0, Math.PI * 2);
                ctx.fill();
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

        makePrizeCrate: function(x, z, scale) {
            const g = this._g;
            const crate = new THREE.Group();
            const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.75), g.woodMat);
            box.position.y = 0.4;
            box.castShadow = true;
            box.receiveShadow = true;
            crate.add(box);
            const bandMat = new THREE.MeshStandardMaterial({ color: 0x2d3a3f, roughness: 0.55, metalness: 0.15 });
            for (const by of [0.24, 0.56]) {
                const band = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.05, 0.8), bandMat);
                band.position.y = by;
                crate.add(band);
            }
            crate.position.set(x, 0, z);
            crate.rotation.y = (Math.random() - 0.5) * 0.45;
            crate.scale.setScalar(scale);
            g.scene.add(crate);
            if (g.crateAnchors) {
                g.crateAnchors.push({
                    fallback: crate,
                    position: crate.position.clone(),
                    rotation: crate.rotation.clone(),
                    scale: scale,
                });
            }
            return crate;
        },

        normalizeLoadedModel: function(root, targetSize) {
            const box = new THREE.Box3().setFromObject(root);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);
            const maxAxis = Math.max(size.x, size.y, size.z) || 1;
            const wrapper = new THREE.Group();
            root.position.sub(center);
            root.scale.multiplyScalar(targetSize / maxAxis);
            wrapper.add(root);
            return wrapper;
        },

        prepareLoadedModel: function(root) {
            root.traverse(obj => {
                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                    if (obj.material) {
                        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                        materials.forEach(mat => {
                            mat.side = THREE.FrontSide;
                            mat.needsUpdate = true;
                        });
                    }
                }
            });
        },

        cloneLoadedModel: function(model) {
            const clone = model.clone(true);
            this.prepareLoadedModel(clone);
            return clone;
        },

        applyGun: function(index) {
            const g = this._g;
            if (!g || !g.gunOptions.length) return;
            const n = g.gunOptions.length;
            g.gunIndex = ((index % n) + n) % n;
            const active = g.gunOptions[g.gunIndex];
            g.proceduralGunParts.forEach(part => { part.visible = !active.mesh; });
            g.gunOptions.forEach(opt => { if (opt.mesh) opt.mesh.visible = (opt === active); });
            if (g.flash) {
                g.flash.position.copy(active.flashPos);
                g.flash.scale.set(active.flashScale, active.flashScale, 1);
            }
            this.gunName = active.label;
            this.gunCount = n;
            this.gunHasScope = !!active.scope;
        },

        switchGun: function() {
            const g = this._g;
            if (!g || g.gunOptions.length < 2) return;
            g.gunManual = true;
            this.applyGun(g.gunIndex + 1);
        },

        loadShooterAssets: function() {
            const g = this._g;
            if (!g || typeof THREE.GLTFLoader === 'undefined') return;

            const loader = new THREE.GLTFLoader();
            const base64ToArrayBuffer = data => {
                const binary = atob(data);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return bytes.buffer;
            };
            const load = (key, url, onReady, onError) => {
                if (window.SHOOTER_MODEL_DATA && window.SHOOTER_MODEL_DATA[key]) {
                    loader.parse(base64ToArrayBuffer(window.SHOOTER_MODEL_DATA[key]), '', gltf => {
                        const model = gltf.scene;
                        this.prepareLoadedModel(model);
                        g.assets[key] = model;
                        onReady(model);
                    }, () => {
                        if (onError) onError();
                    });
                    return;
                }
                loader.load(url, gltf => {
                    const model = gltf.scene;
                    this.prepareLoadedModel(model);
                    g.assets[key] = model;
                    onReady(model);
                }, undefined, () => {
                    if (onError) onError();
                });
            };

            const registerGun = (model, name, label, cfg) => {
                if (!this._g || !g.gun) return;
                cfg = cfg || {};
                const imported = this.normalizeLoadedModel(this.cloneLoadedModel(model), cfg.size || 0.9);
                imported.name = name;
                // Quaternius Ultimate Guns Pack: the barrel lies along the model's
                // X axis. Yaw +90° aims the muzzle forward (-Z, toward the targets)
                // with the gun upright — matching the procedural rifle's pose.
                imported.rotation.set(0.05, Math.PI / 2, 0);

                // normalizeLoadedModel centres each model on its bounding box, so its
                // origin is the bbox centre. Each gun has a different shape, so every
                // one gets a hand-tuned size + position (the bbox centre lands at
                // cfg.pos) that frames it big in the lower-right with the stock cropped
                // off-screen, like an FPS view model.
                const pos = cfg.pos || [0, -0.04, -0.34];
                imported.position.set(pos[0], pos[1], pos[2]);
                imported.visible = false;
                // Muzzle-flash anchor: front of the barrel, computed in gun-group
                // space before the model is parented to the camera-mounted gun group.
                imported.updateMatrixWorld(true);
                const box = new THREE.Box3().setFromObject(imported);
                g.gun.add(imported);
                g.gunOptions.push({
                    name: name,
                    label: label,
                    mesh: imported,
                    flashPos: new THREE.Vector3(0, (box.min.y + box.max.y) / 2 + 0.02, box.min.z - 0.04),
                    flashScale: 0.38,
                    // Scoped guns get a through-scope view. Iron-sight guns instead
                    // aim "between the sights": the model's bbox centre (= pos) is
                    // re-centred on the reticle (x→0) and dropped slightly so the gun
                    // sits low while the barrel/sights lead up to the centre.
                    scope: !!cfg.scope,
                    adsPos: new THREE.Vector3(...(cfg.adsPos || [-pos[0], -pos[1] - 0.10, -0.32])),
                });
                this.gunCount = g.gunOptions.length;
                // Auto-equip the first imported gun (nicer than the procedural
                // placeholder) unless the player has already picked one.
                if (!g.gunManual && g.gunOptions.length === 2) {
                    this.applyGun(g.gunOptions.length - 1);
                }
            };

            // Per-gun size + [x, y, z] position (the model's bbox centre lands at
            // pos). Each weapon has a different shape, so each gets its own hip pose,
            // framed big in the lower-right with the stock cropped like an FPS game.
            load('newPistol', 'assets/models/shooter/new-pistol.glb',
                model => registerGun(model, 'ImportedPistol', 'אקדח', { size: 0.75, pos: [0, 0.083, -0.833] }));
            load('assaultRifle', 'assets/models/shooter/assault-rifle.glb',
                model => registerGun(model, 'ImportedAssaultRifle', 'רובה סער', { size: 1.35, pos: [0, 0.082, -1.155] }));
            load('bullpup', 'assets/models/shooter/bullpup.glb',
                model => registerGun(model, 'ImportedBullpup', 'רובה בולפאפ', { size: 1.275, pos: [0, 0.187, -0.356] }));
            load('sniperRifle', 'assets/models/shooter/sniper-rifle.glb',
                model => registerGun(model, 'ImportedSniperRifle', 'רובה צלפים', { size: 1.4, pos: [0, -0.044, -1.023], scope: true, adsPos: [0, -0.062, -0.3] }));

            load('target', 'assets/models/shooter/target.glb', model => {
                if (!this._g) return;
                g.targetAnchors.forEach(anchor => {
                    const target = this.normalizeLoadedModel(this.cloneLoadedModel(model), 2.25);
                    target.position.copy(anchor.position);
                    target.rotation.copy(anchor.rotation);
                    g.scene.add(target);
                    anchor.fallback.visible = false;
                });
            });

            load('crate', 'assets/models/shooter/crate.glb', model => {
                if (!this._g) return;
                g.crateAnchors.forEach(anchor => {
                    const crate = this.normalizeLoadedModel(this.cloneLoadedModel(model), anchor.scale * 1.35);
                    crate.position.copy(anchor.position);
                    crate.rotation.copy(anchor.rotation);
                    g.scene.add(crate);
                    anchor.fallback.visible = false;
                });
            });
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
                assets: {},
                targetAnchors: [],
                crateAnchors: [],
                proceduralGunParts: [],
                gunOptions: [],
                gunIndex: 0,
                gunManual: false,
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
            const wallBottom = new THREE.Mesh(new THREE.BoxGeometry(30.6, 0.4, 0.5), woodMat);
            wallBottom.position.set(0, 0.25, -14.8);
            wallBottom.castShadow = true;
            wallBottom.receiveShadow = true;
            g.scene.add(wallBottom);
            for (const sx of [-14.5, 14.5]) {
                const sidePost = new THREE.Mesh(new THREE.BoxGeometry(0.55, 6.6, 0.55), woodMat);
                sidePost.position.set(sx, 3.15, -14.75);
                sidePost.castShadow = true;
                g.scene.add(sidePost);
            }
            const targetTex = this.makeTargetTexture();
            for (const tx of [-10, 0, 10]) {
                const target = new THREE.Mesh(
                    new THREE.CircleGeometry(1.1, 32),
                    new THREE.MeshStandardMaterial({ map: targetTex, roughness: 0.9 })
                );
                target.position.set(tx, 4.6, -14.8);
                g.scene.add(target);
                g.targetAnchors.push({
                    fallback: target,
                    position: target.position.clone(),
                    rotation: target.rotation.clone(),
                });
            }

            // String lights along the top of the wall
            const bulbGeo = new THREE.SphereGeometry(0.09, 8, 8);
            const bulbColors = [0xffd54f, 0xff8a65, 0x81d4fa, 0xaed581];
            for (let i = 0; i < 17; i++) {
                const color = bulbColors[i % bulbColors.length];
                const bulb = new THREE.Mesh(
                    bulbGeo,
                    new THREE.MeshBasicMaterial({ color: color })
                );
                bulb.position.set(-14 + i * 1.75, 5.85 - Math.abs(Math.sin(i * 0.9)) * 0.18, -14.7);
                g.scene.add(bulb);
                if (g.quality === 2 && i % 4 === 0) {
                    const light = new THREE.PointLight(color, 0.35, 6);
                    light.position.copy(bulb.position);
                    g.scene.add(light);
                }
            }

            // Foreground booth dressing helps the range feel like a real game scene.
            for (const crate of [[-3.25, -3.05, 0.75], [3.05, -3.18, 0.65], [-4.55, -5.1, 0.55], [4.7, -5.35, 0.6]]) {
                this.makePrizeCrate(crate[0], crate[1], crate[2]);
            }
            const railMat = new THREE.MeshStandardMaterial({ color: 0x253238, roughness: 0.7, metalness: 0.25 });
            for (const rx of [-4.2, 4.2]) {
                const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 6), railMat);
                rail.position.set(rx, 1.0, -6.2);
                rail.castShadow = true;
                g.scene.add(rail);
                for (const rz of [-3.7, -6.2, -8.7]) {
                    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.95, 8), railMat);
                    post.position.set(rx, 0.48, rz);
                    post.castShadow = true;
                    g.scene.add(post);
                }
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
            g.proceduralGunParts.push(body);
            const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.26), gunWood);
            handguard.position.set(0, -0.022, -0.5);
            gun.add(handguard);
            g.proceduralGunParts.push(handguard);
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 12), darkMetal);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.015, -0.62);
            gun.add(barrel);
            g.proceduralGunParts.push(barrel);
            const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12), darkMetal);
            muzzle.rotation.x = Math.PI / 2;
            muzzle.position.set(0, 0.015, -0.78);
            gun.add(muzzle);
            g.proceduralGunParts.push(muzzle);
            const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.03, 0.01), darkMetal);
            frontSight.position.set(0, 0.04, -0.74);
            gun.add(frontSight);
            g.proceduralGunParts.push(frontSight);
            const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.07), darkMetal);
            magazine.position.set(0, -0.09, -0.3);
            magazine.rotation.x = 0.25;
            gun.add(magazine);
            g.proceduralGunParts.push(magazine);
            const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.05), metal);
            trigger.position.set(0, -0.06, -0.12);
            gun.add(trigger);
            g.proceduralGunParts.push(trigger);
            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.22), gunWood);
            stock.position.set(0, -0.035, 0.08);
            gun.add(stock);
            g.proceduralGunParts.push(stock);
            const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 14), darkMetal);
            scopeTube.rotation.x = Math.PI / 2;
            scopeTube.position.set(0, 0.062, -0.2);
            gun.add(scopeTube);
            g.proceduralGunParts.push(scopeTube);
            const scopeLens = new THREE.Mesh(
                new THREE.CircleGeometry(0.019, 14),
                new THREE.MeshStandardMaterial({ color: 0x66ccff, roughness: 0.05, metalness: 0.6 })
            );
            scopeLens.position.set(0, 0.062, -0.281);
            gun.add(scopeLens);
            g.proceduralGunParts.push(scopeLens);
            for (const mz of [-0.13, -0.27]) {
                const mount = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.02), darkMetal);
                mount.position.set(0, 0.045, mz);
                gun.add(mount);
                g.proceduralGunParts.push(mount);
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

            // The procedural rifle is the first selectable gun; imported GLB
            // models register themselves as extra options once they load.
            g.gunOptions.push({
                name: 'classic',
                label: 'רובה קלאסי',
                mesh: null,
                flashPos: new THREE.Vector3(0, 0.015, -0.84),
                flashScale: 0.3,
                // Has a scope: ADS centres it, then we switch to a through-scope view.
                scope: true,
                adsPos: new THREE.Vector3(0, -0.062, -0.3),
            });
            this.applyGun(0);

            // Shared geometries: fewer allocations and less GC on weak devices
            const detail = g.quality === 2 ? [32, 24] : [20, 14];
            g.balloonGeo = new THREE.SphereGeometry(0.85, detail[0], detail[1]);
            g.knotGeo = new THREE.ConeGeometry(0.12, 0.18, 10);
            g.shredGeo = new THREE.SphereGeometry(0.06, 6, 6);
            g.popFlashGeo = new THREE.SphereGeometry(0.4, 12, 10);
            g.confettiGeo = new THREE.BoxGeometry(0.09, 0.09, 0.012);
            g.shadowGeo = new THREE.CircleGeometry(0.7, 24);
            g.shadowMat = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.18,
                depthWrite: false,
            });

            this.applyQuality();
            this.loadShooterAssets();
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
                        map: this.makeBalloonTexture(color),
                        roughness: 0.3,
                        metalness: 0,
                        clearcoat: 1,
                        clearcoatRoughness: 0.12,
                    })
                    : new THREE.MeshPhongMaterial({ color: color, map: this.makeBalloonTexture(color), shininess: 90 });
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

            const shadow = new THREE.Mesh(g.shadowGeo, g.shadowMat.clone());
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.set(x, 0.012, z);
            g.scene.add(shadow);

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
                group: group, sphere: sphere, sprite: sprite, string: string, post: post, shadow: shadow,
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
            if (rec.shadow) rec.shadow.material.dispose();
        },

        clearBalloons: function() {
            const g = this._g;
            g.balloons.forEach(b => {
                g.scene.remove(b.group);
                g.scene.remove(b.post);
                if (b.shadow) g.scene.remove(b.shadow);
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

        playEmptySound: function() {
            try {
                if (!this._audioCtx) {
                    this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = this._audioCtx;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(180, ctx.currentTime);
                gain.gain.setValueAtTime(0.18, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.08);
            } catch (e) {}
        },

        updateMagazineState: function() {
            if (this.reloading) {
                this.magazineState = 'LOAD';
            } else if (this.ammoInMag === 0) {
                this.magazineState = 'EMPTY';
            } else if (this.ammoInMag <= 2) {
                this.magazineState = 'LOW';
            } else {
                this.magazineState = 'READY';
            }
        },

        reloadMagazine: function() {
            // Magazine reload only — reserve ammo is unlimited, so a reload
            // always tops the magazine back up to its full size.
            if (this.reloading || this.ammoInMag === this.magazineSize) return;
            this.reloading = true;
            this.ads = false;
            this.updateMagazineState();
            const g = this._g;
            if (g) {
                g.reloadKick = 1;
            }
            clearTimeout(this._reloadTimer);
            this._reloadTimer = setTimeout(() => {
                this.ammoInMag = this.magazineSize;
                this.reloading = false;
                this.updateMagazineState();
            }, 900);
        },

        shoot: function() {
            const g = this._g;
            if (!g) return;
            if (!this.isTouch && !this.locked) return;
            if (this.reloading) return;
            if (this.ammoInMag <= 0) {
                this.playEmptySound();
                this.updateMagazineState();
                this.reloadMagazine();
                return;
            }

            this.ammoInMag -= 1;
            this.updateMagazineState();
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
            if (rec.shadow) this._g.scene.remove(rec.shadow);
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
                    if (b.shadow) {
                        const heightFactor = Math.max(0.28, 1 - (b.group.position.y - b.groundY) / 5.5);
                        b.shadow.scale.setScalar((0.45 + heightFactor * 0.55) * b.group.scale.x);
                        b.shadow.material.opacity = 0.08 + heightFactor * 0.13;
                    }
                } else if (b.state === 'flying') {
                    b.vel.y += 2 * dt;
                    b.group.position.addScaledVector(b.vel, dt);
                    if (b.shadow) b.shadow.material.opacity = Math.max(0, b.shadow.material.opacity - dt * 0.5);
                    if (b.group.position.y > 30) {
                        g.scene.remove(b.group);
                        if (b.shadow) g.scene.remove(b.shadow);
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
            const activeGun = g.gunOptions[g.gunIndex];
            const adsPos = (activeGun && activeGun.adsPos) || g.adsPos;
            const targetFov = this.ads ? 30 : 75;
            g.camera.fov += (targetFov - g.camera.fov) * Math.min(1, dt * 10);
            g.camera.updateProjectionMatrix();
            g.gunBase.lerp(this.ads ? adsPos : g.hipPos, Math.min(1, dt * 12));
            // Once the raise + zoom animation has settled, a scoped weapon switches
            // to a clean "through the scope" view: hide the gun and show the scope
            // overlay so the 3D scope model never obscures the picture.
            const raiseDone = this.ads &&
                g.gunBase.distanceToSquared(adsPos) < 0.0004 &&
                Math.abs(g.camera.fov - targetFov) < 1.5;
            this.scoped = !!(raiseDone && this.gunHasScope);
            g.gun.visible = !this.scoped;
            g.recoil = Math.max(0, g.recoil - dt * 6);
            g.reloadKick = Math.max(0, (g.reloadKick || 0) - dt * 1.8);
            g.gun.position.copy(g.gunBase);
            g.gun.position.z += g.recoil * 0.06;
            g.gun.position.y -= (g.reloadKick || 0) * 0.09;
            g.gun.position.x += (g.reloadKick || 0) * 0.03;
            // Gun sway lags behind the camera and settles back
            const swayDecay = Math.max(0, 1 - 8 * dt);
            g.swayX = (g.swayX || 0) * swayDecay;
            g.swayY = (g.swayY || 0) * swayDecay;
            g.gun.rotation.x = g.recoil * 0.1 + g.swayY - (g.reloadKick || 0) * 0.32;
            g.gun.rotation.y = g.swayX + (g.reloadKick || 0) * 0.12;
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

        onKeyDown: function(event) {
            if (!event.key) return;
            const key = event.key.toLowerCase();
            if (key === 'r') {
                this.reloadMagazine();
            } else if (key === 'g') {
                this.switchGun();
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
        document.addEventListener('keydown', this.onKeyDown);
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
        document.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('resize', this.onResize);
        clearTimeout(this._hitMarkerTimer);
        clearTimeout(this._reloadTimer);
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
// Room types. `layout` picks the chamber structure:
//   'doors'   — 3 gates with wooden doors; behind a wrong door there is a
//               real dead-end room: the player walks in, the trap is revealed
//               inside, and the character flees back.
//   'bridges' — a chasm crossed by 3 bridges; a wrong bridge collapses
//               mid-crossing and the character escapes back.
//   'stones'  — a river crossed by 3 paths of stepping stones; the wrong
//               path sinks underfoot.
//   'chests'  — a small treasure room with 3 chests and one exit door; the
//               right answer opens the real chest, a fake one belches smoke.
//   'keys'    — 3 keys on pedestals and one locked door; the chosen key
//               flies to the lock, and only the right one opens it.
// `fail` styles the dead-end room of 'doors' layouts:
//   'block'    — the room is blocked by rubble/ice/thorns
//   'monster'  — a creature with glowing eyes lunges at the player
//   'collapse' — the room caves in (beams and rocks rain down)
//   'bounce'   — a magic circle hurls the player straight back
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
    { title: '🌉 גשר התהום — איזה גשר יחזיק?', layout: 'bridges', pit: 'dark', door: 0x7a6a4f, frame: 0x5d4a36, flame: 0xffb74d, light: 0xffa14d, rune: 0xffe0b2,
      fail: 'collapse', failColor: 0x8d6e63, failMsg: 'הגשר קרס! ברחת ברגע האחרון!' },
    { title: '🕷️ מאורת העכביש — בחר מעבר זהיר', door: 0x4a3f5c, frame: 0x6e6680, flame: 0x9fa8da, light: 0x8c9eff, rune: 0xb39ddb,
      fail: 'monster', failColor: 0x76608a, eyes: 0xff1744, failMsg: 'עכביש ענק! ברח!' },
    { title: '🌋 נהר הלבה — איזה גשר בטוח?', layout: 'bridges', pit: 'lava', door: 0x5d4037, frame: 0x4e342e, flame: 0xff8a65, light: 0xff7043, rune: 0xffab91,
      fail: 'collapse', failColor: 0x8d6e63, failMsg: 'הגשר קרס לתוך הלבה! ברחת ברגע האחרון!' },
    { title: '⛏️ המכרה הנטוש — איזו מנהרה פתוחה?', door: 0x6d5843, frame: 0x55483a, flame: 0xffcc80, light: 0xffb74d, rune: 0xd7ccc8,
      fail: 'collapse', failColor: 0x5d5048, failMsg: 'המנהרה התמוטטה! ברחת בזמן!' },
    { title: '🏰 חצר הטירה — איזה שער פתוח?', door: 0x8c7048, frame: 0xa099a8, flame: 0xfff176, light: 0xffe082, rune: 0xfff59d,
      fail: 'monster', failColor: 0x90a4ae, eyes: 0x80d8ff, failMsg: 'שומר הטירה תפס אותך! ברח!' },
    { title: '🪨 נהר אבני הדריכה — איזה שביל בטוח?', layout: 'stones', pit: 'water', door: 0x8a8578, frame: 0x78838f, flame: 0x90caf9, light: 0x86b8e8, rune: 0xb3d6f2,
      fail: 'collapse', failColor: 0x9aa6b0, failMsg: 'האבנים שקעו במים! ברחת בזמן!' },
    { title: '💰 חדר האוצר — איזו תיבה אמיתית?', layout: 'chests', door: 0x7a5a2e, frame: 0x9c8c6e, flame: 0xffd54f, light: 0xffca5e, rune: 0xffe082,
      fail: 'smoke', failColor: 0x4a3d52, failMsg: 'תיבה מזויפת! ענן עשן שחור!' },
    { title: '🗝️ חדר המפתחות — איזה מפתח פותח את הדלת?', layout: 'keys', door: 0x6b4f86, frame: 0x8a7f9c, flame: 0xce93d8, light: 0xb68fd6, rune: 0xd1b3e8,
      fail: 'shatter', failColor: 0xffd740, failMsg: 'המפתח הלא נכון נשבר במנעול!' },
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

            // Shared geometries for bridges and reward particles
            g.coinGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.022, 12);
            g.puffGeo = new THREE.SphereGeometry(0.09, 6, 6);
            g.flashGeo = new THREE.SphereGeometry(0.4, 12, 10);
            g.plankGeo = new THREE.BoxGeometry(0.55, 0.07, 0.18);
            g.bridgePlankGeo = new THREE.BoxGeometry(1.7, 0.08, 0.42);
            g.stoneStepGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.22, 9);
            g.trapRooms = [];

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
                gates: [], flames: [], torchLights: [], disposables: [], exit: null,
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

            const selector = scenario.layout === 'chests' || scenario.layout === 'keys';
            if (selector) {
                // Chest/key rooms have a single exit doorway in the middle
                addWall(14.9, 5, -8.55, 2.5, -6);
                addWall(14.9, 5, 8.55, 2.5, -6);
                addWall(2.6, 2, 0, 4, -6);
            } else {
                // Front wall with 3 gate openings at x = -4, 0, 4 (opening width 2.2, height 3)
                addWall(11, 5, -10.6, 2.5, -6);
                addWall(1.8, 5, -2, 2.5, -6);
                addWall(1.8, 5, 2, 2.5, -6);
                addWall(11, 5, 10.6, 2.5, -6);
                for (const gx of [-4, 0, 4]) {
                    addWall(2.6, 2, gx, 4, -6);   // lintel above each opening
                }
            }
            // Side walls
            addWall(14, 5, -16, 2.5, 0, Math.PI / 2);
            addWall(14, 5, 16, 2.5, 0, Math.PI / 2);
            // Back wall with a center opening — the doorway the player enters
            // through, aligned with the gate chosen in the previous chamber
            addWall(14.9, 5, -8.55, 2.5, 7);
            addWall(14.9, 5, 8.55, 2.5, 7);
            addWall(2.6, 2, 0, 4, 7);

            // Pulsing magic rune circle on the floor (in front of the chasm
            // when the room is bridge-based)
            chamber.rune = new THREE.Mesh(
                new THREE.RingGeometry(1.5, 1.85, 48),
                new THREE.MeshBasicMaterial({
                    color: scenario.rune, transparent: true, opacity: 0.3,
                    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
                })
            );
            chamber.rune.rotation.x = -Math.PI / 2;
            chamber.rune.position.set(0, 0.02, this.isCrossing(scenario) ? 1.8 : -1);
            group.add(chamber.rune);
            chamber.disposables.push(chamber.rune.material);

            // Crossing rooms get a chasm / lava river / water across the floor
            if (this.isCrossing(scenario)) {
                const pitColors = { lava: 0xff5a1f, water: 0x1c4f7e, dark: 0x04050a };
                const pit = new THREE.Mesh(
                    new THREE.PlaneGeometry(31, 4.2),
                    new THREE.MeshBasicMaterial({ color: pitColors[scenario.pit] || pitColors.dark })
                );
                pit.rotation.x = -Math.PI / 2;
                pit.position.set(0, 0.04, -3.2);
                group.add(pit);
                chamber.disposables.push(pit.material);
                if (scenario.pit === 'lava') {
                    const lavaLight = new THREE.PointLight(0xff6a2a, 1.1, 16, 2);
                    lavaLight.position.set(0, 1, -3.2);
                    group.add(lavaLight);
                    chamber.torchLights.push(lavaLight);
                }
            }

            if (scenario.layout === 'chests') {
                chamber.exit = this.makeGate(chamber, 0, true);
                for (const gx of [-4, 0, 4]) {
                    this.makeChest(chamber, gx);
                }
            } else if (scenario.layout === 'keys') {
                chamber.exit = this.makeGate(chamber, 0, true);
                // A golden lock on the exit door
                const lock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.12), g.goldMat);
                lock.position.set(0, 1.7, 0.12);
                chamber.exit.group.add(lock);
                for (const gx of [-4, 0, 4]) {
                    this.makeKeyStand(chamber, gx);
                }
            } else {
                for (const gx of [-4, 0, 4]) {
                    this.makeGate(chamber, gx);
                }
            }

            g.scene.add(group);
            return chamber;
        },

        disposeChamber: function(chamber) {
            const g = this._g;
            chamber.gates.forEach(gate => {
                if (gate.label) {
                    gate.label.material.map.dispose();
                    gate.label.material.dispose();
                    gate.label = null;
                }
            });
            chamber.disposables.forEach(d => d.dispose());
            g.scene.remove(chamber.group);
        },

        isCrossing: function(scenario) {
            return scenario.layout === 'bridges' || scenario.layout === 'stones';
        },

        // asExit builds a plain doors-gate that is not a choice (the single
        // exit of chest/key rooms); it is returned instead of joining gates
        makeGate: function(chamber, x, asExit) {
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

            const rec = {
                chamber: chamber, group: group, baseX: x, openT: 0, openTarget: 0,
                shake: 0, hoverT: 0, label: null, entry: null, active: false,
                panels: [], back: back, glow: glow, pivotL: null, pivotR: null,
                bridge: null, planks: [],
                // where the answer sign hangs: above the door, or floating at
                // the near end of the bridge
                labelPos: this.isCrossing(chamber.scenario) ? [0, 2.3, 4.9] : [0, 3.95, 0.6],
            };

            if (!asExit && this.isCrossing(chamber.scenario)) {
                // Open archway across the chasm — the crossing is the choice
                this.makeCrossing(chamber, rec);
            } else {
                // Double wooden doors hinged on the outer edges
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
            }

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
            if (asExit) {
                return rec;
            }
            chamber.gates.push(rec);
        },

        // A rope bridge or a path of stepping stones crossing toward the archway
        makeCrossing: function(chamber, rec) {
            const g = this._g;
            const bridge = new THREE.Group();
            rec.planks = [];
            if (chamber.scenario.layout === 'stones') {
                for (let i = 0; i < 5; i++) {
                    const stone = new THREE.Mesh(g.stoneStepGeo, chamber.frameMat);
                    stone.position.set(
                        (Math.random() - 0.5) * 0.3,
                        0.1,
                        0.9 + i * 0.95
                    );
                    stone.rotation.y = Math.random() * Math.PI;
                    stone.userData.rec = rec;
                    bridge.add(stone);
                    rec.planks.push(stone);
                }
            } else {
                for (let i = 0; i < 9; i++) {
                    const plank = new THREE.Mesh(g.bridgePlankGeo, chamber.doorMat);
                    plank.position.set(
                        (Math.random() - 0.5) * 0.06,
                        0.16 + Math.sin((i / 8) * Math.PI) * 0.22,
                        0.8 + i * 0.5
                    );
                    plank.rotation.y = (Math.random() - 0.5) * 0.05;
                    plank.userData.rec = rec;
                    bridge.add(plank);
                    rec.planks.push(plank);
                }
                for (const sx of [-0.85, 0.85]) {
                    const rope = new THREE.Mesh(
                        new THREE.BoxGeometry(0.05, 0.05, 4.4),
                        new THREE.MeshStandardMaterial({ color: 0x3e2f23, roughness: 1 })
                    );
                    rope.position.set(sx, 0.85, 2.8);
                    bridge.add(rope);
                    for (const pz of [0.7, 4.9]) {
                        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 8), chamber.frameMat);
                        post.position.set(sx, 0.45, pz);
                        bridge.add(post);
                    }
                }
            }
            rec.bridge = bridge;
            rec.panels = rec.planks;
            rec.group.add(bridge);
        },

        // The wrong crossing gives way: planks drop into the pit / stones sink
        collapseCrossing: function(rec) {
            const g = this._g;
            const stones = rec.chamber.scenario.layout === 'stones';
            const world = new THREE.Vector3();
            rec.planks.forEach(plank => {
                plank.getWorldPosition(world);
                const mesh = new THREE.Mesh(
                    stones ? g.stoneStepGeo : g.bridgePlankGeo,
                    new THREE.MeshBasicMaterial({ color: stones ? 0x8a96a0 : 0x6d5132, transparent: true })
                );
                mesh.position.copy(world);
                g.scene.add(mesh);
                g.particles.push({
                    mesh: mesh,
                    vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, stones ? -1.5 : -0.5 - Math.random() * 1.5, (Math.random() - 0.5) * 0.8),
                    gravity: stones ? 4 : 7,
                    spin: stones ? null : new THREE.Vector3(Math.random() * 7, Math.random() * 7, Math.random() * 7),
                    maxLife: stones ? 0.7 : 1.0,
                    life: stones ? 0.7 : 1.0,
                });
                if (stones) {
                    // Splash where each stone goes under
                    for (let i = 0; i < 3; i++) {
                        const drop = new THREE.Mesh(
                            g.puffGeo,
                            new THREE.MeshBasicMaterial({ color: 0x9fd4f5, transparent: true })
                        );
                        drop.scale.setScalar(0.9 + Math.random());
                        drop.position.copy(world);
                        g.scene.add(drop);
                        g.particles.push({
                            mesh: drop,
                            vel: new THREE.Vector3((Math.random() - 0.5) * 2.5, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2),
                            gravity: 8,
                            maxLife: 0.6,
                            life: 0.6,
                        });
                    }
                }
            });
            rec.group.remove(rec.bridge);
            rec.bridge = null;
            rec.planks = [];
            rec.panels = [];
        },

        // A treasure chest standing in the room — one of the three choices
        makeChest: function(chamber, x) {
            const g = this._g;
            const group = new THREE.Group();
            group.position.set(x, 0, -3);
            const rec = {
                chamber: chamber, group: group, baseX: x, type: 'chest',
                openT: 0, openTarget: 0, lidT: 0, lidTarget: 0, shake: 0, hoverT: 0,
                label: null, entry: null, active: false, panels: [],
                back: null, glow: null, pivotL: null, pivotR: null, bridge: null, planks: [],
                labelPos: [0, 2.0, 0],
            };
            const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.62, 0.7), chamber.doorMat);
            base.position.y = 0.31;
            base.userData.rec = rec;
            group.add(base);
            rec.panels.push(base);
            const lidPivot = new THREE.Group();
            lidPivot.position.set(0, 0.62, -0.35);
            const lid = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.2, 0.74), chamber.doorMat);
            lid.position.set(0, 0.1, 0.35);
            lid.userData.rec = rec;
            lidPivot.add(lid);
            group.add(lidPivot);
            rec.panels.push(lid);
            rec.lidPivot = lidPivot;
            const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.06), g.goldMat);
            lock.position.set(0, 0.55, 0.36);
            group.add(lock);
            const band = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.08, 0.74), g.goldMat);
            band.position.y = 0.25;
            group.add(band);
            // Inner golden glow revealed when the real chest opens
            rec.innerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: g.flameTex, color: 0xffd54f,
                blending: THREE.AdditiveBlending, depthWrite: false,
            }));
            rec.innerGlow.scale.set(1.5, 1.5, 1);
            rec.innerGlow.position.set(0, 0.85, 0);
            rec.innerGlow.visible = false;
            group.add(rec.innerGlow);
            chamber.group.add(group);
            chamber.gates.push(rec);
        },

        // A golden key floating above a pedestal — one of the three choices
        makeKeyStand: function(chamber, x) {
            const g = this._g;
            const group = new THREE.Group();
            group.position.set(x, 0, -2);
            const rec = {
                chamber: chamber, group: group, baseX: x, type: 'key',
                openT: 0, openTarget: 0, shake: 0, hoverT: 0, flying: false,
                label: null, entry: null, active: false, panels: [],
                back: null, glow: null, pivotL: null, pivotR: null, bridge: null, planks: [],
                labelPos: [0, 2.5, 0],
            };
            const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.05, 10), chamber.frameMat);
            pedestal.position.y = 0.52;
            group.add(pedestal);
            const key = new THREE.Group();
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 8, 16), g.goldMat);
            ring.userData.rec = rec;
            key.add(ring);
            const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), g.goldMat);
            shaft.position.y = -0.28;
            shaft.userData.rec = rec;
            key.add(shaft);
            for (const ty of [-0.4, -0.31]) {
                const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.05), g.goldMat);
                tooth.position.set(0.07, ty, 0);
                tooth.userData.rec = rec;
                key.add(tooth);
            }
            key.position.set(0, 1.6, 0);
            group.add(key);
            rec.key = key;
            rec.keyHome = key.position.clone();
            rec.panels = key.children.slice();
            chamber.group.add(group);
            chamber.gates.push(rec);
        },

        makeMonster: function(s) {
            const g = this._g;
            const monster = new THREE.Group();
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.95, 14, 12),
                new THREE.MeshStandardMaterial({ color: 0x140f1b, roughness: 0.9 })
            );
            body.scale.set(1.25, 1.5, 0.8);
            body.position.y = 1.35;
            monster.add(body);
            for (const ex of [-0.34, 0.34]) {
                const eye = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: g.flameTex, color: s.eyes,
                    blending: THREE.AdditiveBlending, depthWrite: false,
                }));
                eye.scale.set(0.4, 0.5, 1);
                eye.position.set(ex, 1.95, 0.6);
                monster.add(eye);
            }
            return monster;
        },

        // A real dead-end room built behind a wrong door, in the same slot
        // the next chamber would occupy — the player genuinely walks into it
        buildTrapRoom: function(gate) {
            const g = this._g;
            const s = gate.chamber.scenario;
            const group = new THREE.Group();
            group.position.set(gate.baseX, 0, -13.3);
            const room = { group: group, disposables: [], monster: null, rubble: null, lunge: false };

            const addWall = (w, h, x, y, z, rotY) => {
                const tex = g.stoneTex.clone();
                tex.needsUpdate = true;
                tex.repeat.set(Math.max(1, w / 3.5), Math.max(1, h / 3.5));
                const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
                room.disposables.push(tex, mat);
                const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), mat);
                wall.position.set(x, y, z);
                if (rotY) wall.rotation.y = rotY;
                group.add(wall);
            };

            // A narrow dead-end corridor (so traps behind adjacent doors
            // can stand side by side without overlapping)
            addWall(0.6, 5, -1.4, 2.5, 7);
            addWall(0.6, 5, 1.4, 2.5, 7);
            addWall(2.6, 2, 0, 4, 7);
            addWall(4.0, 5, 0, 2.5, 2.6);
            addWall(4.4, 5, -1.7, 2.5, 4.8, Math.PI / 2);
            addWall(4.4, 5, 1.7, 2.5, 4.8, Math.PI / 2);
            const lamp = new THREE.PointLight(s.light, 0.9, 10, 2);
            lamp.position.set(0, 2.6, 4.8);
            group.add(lamp);

            if (s.fail === 'monster') {
                room.monster = this.makeMonster(s);
                room.monster.position.set(0, 0, 3.8);
                group.add(room.monster);
            } else if (s.fail === 'block' || s.fail === 'collapse') {
                // A rubble pile blocking the room — already there for 'block',
                // appears with the cave-in for 'collapse'
                room.rubble = new THREE.Group();
                const mat = new THREE.MeshStandardMaterial({ color: s.failColor, roughness: 0.95 });
                room.disposables.push(mat);
                for (let i = 0; i < 10; i++) {
                    const rock = new THREE.Mesh(new THREE.SphereGeometry(0.4 + Math.random() * 0.45, 7, 6), mat);
                    rock.position.set((Math.random() - 0.5) * 2.4, 0.3 + Math.random() * 1.5, 3.4 + Math.random());
                    rock.scale.y = 0.7 + Math.random() * 0.4;
                    room.rubble.add(rock);
                }
                room.rubble.visible = s.fail === 'block';
                group.add(room.rubble);
            } else if (s.fail === 'bounce') {
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(1.0, 1.3, 40),
                    new THREE.MeshBasicMaterial({
                        color: s.failColor, transparent: true, opacity: 0.5,
                        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
                    })
                );
                ring.rotation.x = -Math.PI / 2;
                ring.position.set(0, 0.04, 4.4);
                group.add(ring);
            }

            g.scene.add(group);
            g.trapRooms.push(room);
            return room;
        },

        disposeTrapRooms: function() {
            const g = this._g;
            g.trapRooms.forEach(room => {
                room.disposables.forEach(d => d.dispose());
                g.scene.remove(room.group);
            });
            g.trapRooms = [];
        },

        // Remove leftover dead-end rooms before walking on — they occupy the
        // slots where the next chamber is about to be built
        clearTraps: function(chamber) {
            chamber.gates.forEach(gate => {
                if (gate.trapRoom) {
                    gate.trapRoom = null;
                    if (gate.back) gate.back.visible = true;
                }
            });
            this.disposeTrapRooms();
        },

        // The moment the trap springs, styled by the room type
        triggerTrap: function(gate) {
            const g = this._g;
            const s = gate.chamber.scenario;
            failureSound.play();
            this.message = { value: s.failMsg, error: true };
            g.camShake = 1;

            if (this.isCrossing(s)) {
                this.collapseCrossing(gate);
            } else if (s.fail === 'monster') {
                gate.trapRoom.lunge = true;
            } else if (s.fail === 'collapse') {
                gate.trapRoom.rubble.visible = true;
                // Beams and rocks rain down inside the room
                for (let i = 0; i < 14; i++) {
                    const isBeam = i % 2 === 0;
                    const mesh = new THREE.Mesh(
                        isBeam ? g.plankGeo : g.puffGeo,
                        new THREE.MeshBasicMaterial({ color: isBeam ? s.failColor : 0x4a4038, transparent: true })
                    );
                    if (!isBeam) mesh.scale.setScalar(1.4 + Math.random() * 1.8);
                    mesh.position.set(
                        gate.baseX + (Math.random() - 0.5) * 3,
                        3 + Math.random() * 1.5,
                        -9.6 + (Math.random() - 0.5) * 2
                    );
                    g.scene.add(mesh);
                    g.particles.push({
                        mesh: mesh,
                        vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, -1 - Math.random() * 2, 0),
                        gravity: 9,
                        spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
                        maxLife: 1.1,
                        life: 1.1,
                    });
                }
            } else if (s.fail === 'block') {
                // A burst of dust by the rubble
                for (let i = 0; i < 8; i++) {
                    const mesh = new THREE.Mesh(
                        g.puffGeo,
                        new THREE.MeshBasicMaterial({ color: 0x5c5248, transparent: true })
                    );
                    mesh.scale.setScalar(1.5 + Math.random() * 2);
                    mesh.position.set(gate.baseX + (Math.random() - 0.5) * 3, 0.5 + Math.random() * 1.5, -9.3);
                    g.scene.add(mesh);
                    g.particles.push({
                        mesh: mesh,
                        vel: new THREE.Vector3((Math.random() - 0.5) * 2, 0.5 + Math.random(), 0.5),
                        gravity: 0.8,
                        maxLife: 0.8,
                        life: 0.8,
                    });
                }
            }

            // Colored flash right in front of the camera
            const flash = new THREE.Mesh(
                g.flashGeo,
                new THREE.MeshBasicMaterial({ color: s.failColor, transparent: true, opacity: 0.8 })
            );
            flash.position.set(g.camera.position.x, 1.6, g.camera.position.z - 1.5);
            g.scene.add(flash);
            g.particles.push({ mesh: flash, vel: new THREE.Vector3(), gravity: 0, grow: 9, maxLife: 0.25, life: 0.25 });
        },

        refreshPickMeshes: function() {
            const g = this._g;
            g.pickMeshes = [];
            g.chamber.gates.forEach(gate => {
                if (!gate.active) return;
                if (gate.label) g.pickMeshes.push(gate.label);
                gate.panels.forEach(p => g.pickMeshes.push(p));
            });
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
            g.chamber.gates.forEach((gate, i) => {
                gate.openT = 0;
                gate.openTarget = 0;
                gate.shake = 0;
                gate.hoverT = 0;
                if (gate.pivotL) {
                    gate.pivotL.rotation.y = 0;
                    gate.pivotR.rotation.y = 0;
                }
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
                    gate.label.position.set(gate.labelPos[0], gate.labelPos[1], gate.labelPos[2]);
                    gate.label.userData.rec = gate;
                    gate.group.add(gate.label);
                }
            });
            this.refreshPickMeshes();

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
            const s = rec.chamber.scenario;
            if (s.layout === 'chests') {
                return this.chooseChest(rec);
            }
            if (s.layout === 'keys') {
                return this.chooseKey(rec);
            }
            const gatePos = new THREE.Vector3(rec.baseX, 1.5, -5.3);
            // Either way the chosen passage opens and the player walks in —
            // there is always a real room behind it: the next chamber, or a
            // dead end that sends the player back
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
                    // Build the next chamber beyond the chosen gate, then
                    // uncover the passage so it is visible through the
                    // opening doors / archway
                    this.clearTraps(g.chamber);
                    g.nextChamber = this.buildChamber(rec.baseX, -13.3);
                    rec.back.visible = false;
                    rec.glow.visible = false;
                    g.mode = 'opening';
                    g.walkGate = rec;
                    g.modeDelay = this.isCrossing(s) ? 0.25 : 0.7;
                    g.walkT = 0;
                }
            } else {
                updateWeightForKey(this.currentAppId, this.questionIndex, 1);
                this.score = Math.max(0, this.score - 1);
                this.streak = 0;
                this.saveScore();
                if (!this.isCrossing(s)) {
                    // A real dead-end room appears behind the wrong door too
                    rec.trapRoom = this.buildTrapRoom(rec);
                    rec.back.visible = false;
                    rec.glow.visible = false;
                }
                g.mode = 'failWalk';
                g.walkGate = rec;
                g.walkT = 0;
                this.reloadProgress();
            }
        },

        chooseChest: function(rec) {
            const g = this._g;
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
                rec.lidTarget = 1;
                this.spawnCoins(new THREE.Vector3(rec.baseX, 1.1, -2.7));
                if (this.reloadProgress()) {
                    this.saveScore();
                    this.clearTraps(g.chamber);
                    g.nextChamber = this.buildChamber(0, -13.3);
                    const exit = g.chamber.exit;
                    exit.openTarget = 1;
                    exit.back.visible = false;
                    exit.glow.visible = false;
                    g.mode = 'opening';
                    g.walkGate = exit;
                    g.modeDelay = 1.2;
                    g.walkT = 0;
                }
            } else {
                updateWeightForKey(this.currentAppId, this.questionIndex, 1);
                this.score = Math.max(0, this.score - 1);
                this.streak = 0;
                this.saveScore();
                rec.lidTarget = 0.35;
                g.mode = 'chestFail';
                g.walkGate = rec;
                g.failPhase = 0;
                g.modeDelay = 0.45;
                this.reloadProgress();
            }
        },

        chooseKey: function(rec) {
            const g = this._g;
            const correct = rec.entry.isCorrect;
            if (correct) {
                this.ended = true;
                this.message = { value: this.getSuccessMsg(), success: true };
                successSound.play();
                updateWeightForKey(this.currentAppId, this.questionIndex, -1);
                this.score += 1;
                this.streak += 1;
                if (this.streak % 3 === 0) {
                    this.gems += 1;
                }
                if (!this.reloadProgress()) return;
                this.saveScore();
                this.clearTraps(g.chamber);
                g.nextChamber = this.buildChamber(0, -13.3);
            } else {
                updateWeightForKey(this.currentAppId, this.questionIndex, 1);
                this.score = Math.max(0, this.score - 1);
                this.streak = 0;
                this.saveScore();
                this.reloadProgress();
            }
            // The chosen key flies to the lock — only the right one opens the door
            rec.flying = true;
            g.walkGate = rec;
            g.keyCorrect = correct;
            g.mode = 'keyFly';
            g.walkT = 0;
            g.keyFrom = rec.key.position.clone();
            // The lock in the rec's local space (its group sits at (x, 0, -2))
            g.keyTo = new THREE.Vector3(-rec.baseX, 1.7, -3.75);
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

            // Gates and props: doors swing, chest lids open, keys hover,
            // wrong picks shake, hovered signs grow
            chambers.forEach(chamber => {
                const gateList = chamber.exit ? chamber.gates.concat([chamber.exit]) : chamber.gates;
                gateList.forEach(gate => {
                    gate.openT += (gate.openTarget - gate.openT) * Math.min(1, dt * 2.2);
                    if (gate.pivotL) {
                        gate.pivotL.rotation.y = gate.openT * 1.85;
                        gate.pivotR.rotation.y = -gate.openT * 1.85;
                    }
                    if (gate.lidPivot) {
                        gate.lidT += (gate.lidTarget - gate.lidT) * Math.min(1, dt * 3);
                        gate.lidPivot.rotation.x = -gate.lidT * 1.6;
                        if (gate.innerGlow) gate.innerGlow.visible = gate.lidT > 0.45;
                    }
                    if (gate.key && gate.key.visible && !gate.flying) {
                        gate.key.rotation.y += dt * 1.2;
                        gate.key.position.y = gate.keyHome.y + Math.sin(t * 1.7 + gate.baseX) * 0.07;
                    }
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
                });
            });

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
                // The wrong passage opened too — walk in as if it were right:
                // fully into the dead-end room, or out to the middle of the crossing
                const gate = g.walkGate;
                const s = gate.chamber.scenario;
                const crossing = this.isCrossing(s);
                g.walkT = Math.min(1, g.walkT + dt / (crossing ? 1.2 : 2.0));
                const e = 0.5 - 0.5 * Math.cos(Math.PI * g.walkT);
                const ex = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, g.walkT * 1.6));
                g.camera.position.set(gate.baseX * ex, 1.6, 5 - (crossing ? 8.4 : 14.0) * e);
                g.pitch *= Math.max(0, 1 - dt * 3);
                yawToward(gate.baseX, -25, 5);
                if (g.walkT >= 1) {
                    // ...and only then the trap springs
                    this.triggerTrap(gate);
                    g.mode = 'failEvent';
                    g.modeDelay = s.fail === 'bounce' ? 0.3 : 0.9;
                    g.walkT = 0;
                }
            } else if (g.mode === 'failEvent') {
                g.modeDelay -= dt;
                const gate = g.walkGate;
                const room = gate.trapRoom;
                if (room && room.lunge && room.monster) {
                    // The monster lunges toward the player
                    room.monster.position.z = Math.min(4.0, room.monster.position.z + dt * 2.4);
                    room.monster.scale.addScalar(dt * 0.3);
                }
                if (this.isCrossing(gate.chamber.scenario)) {
                    // Look down at the planks/stones tumbling into the pit
                    g.pitch = Math.max(-0.45, g.pitch - dt * 0.9);
                }
                if (g.modeDelay <= 0) {
                    g.mode = 'failReturn';
                    g.walkT = 0;
                    g.returnFrom = g.camera.position.clone();
                    g.returnYaw = g.yaw;
                    g.returnPitch = g.pitch;
                }
            } else if (g.mode === 'failReturn') {
                // The character flees back to the chamber. What collapsed or
                // opened stays that way — that path can no longer be chosen.
                g.walkT = Math.min(1, g.walkT + dt / 0.55);
                const e = 1 - Math.pow(1 - g.walkT, 2);  // fast escape, ease-out
                g.camera.position.lerpVectors(g.returnFrom, new THREE.Vector3(0, 1.6, 5), e);
                g.yaw = g.returnYaw * (1 - e);
                g.pitch = g.returnPitch * (1 - e);
                if (g.walkT >= 1) {
                    const gate = g.walkGate;
                    gate.active = false;
                    this.refreshPickMeshes();
                    gate.shake = 0.7;
                    g.camShake = 0;
                    g.mode = 'idle';
                }
            } else if (g.mode === 'chestFail') {
                g.modeDelay -= dt;
                if (g.modeDelay <= 0) {
                    const rec = g.walkGate;
                    if (g.failPhase === 0) {
                        // The fake chest belches dark smoke and is spent
                        const s = rec.chamber.scenario;
                        failureSound.play();
                        this.message = { value: s.failMsg, error: true };
                        g.camShake = 0.7;
                        rec.shake = 0.7;
                        for (let i = 0; i < 10; i++) {
                            const puff = new THREE.Mesh(
                                g.puffGeo,
                                new THREE.MeshBasicMaterial({ color: i % 2 ? s.failColor : 0x222028, transparent: true })
                            );
                            puff.scale.setScalar(1.5 + Math.random() * 2);
                            puff.position.set(rec.baseX + (Math.random() - 0.5) * 0.8, 1 + Math.random() * 0.5, -2.8);
                            g.scene.add(puff);
                            g.particles.push({
                                mesh: puff,
                                vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1 + Math.random() * 1.5, 0.5),
                                gravity: 0.5,
                                maxLife: 0.9,
                                life: 0.9,
                            });
                        }
                        g.failPhase = 1;
                        g.modeDelay = 0.9;
                    } else {
                        rec.active = false;
                        this.refreshPickMeshes();
                        g.mode = 'idle';
                    }
                }
            } else if (g.mode === 'keyFly') {
                // The chosen key flies toward the lock on the exit door
                g.walkT = Math.min(1, g.walkT + dt / 0.9);
                const rec = g.walkGate;
                const e = 0.5 - 0.5 * Math.cos(Math.PI * g.walkT);
                rec.key.position.lerpVectors(g.keyFrom, g.keyTo, e);
                rec.key.rotation.y += dt * 7;
                if (g.walkT >= 1) {
                    rec.flying = false;
                    rec.key.visible = false;
                    if (g.keyCorrect) {
                        const exit = g.chamber.exit;
                        exit.openTarget = 1;
                        exit.back.visible = false;
                        exit.glow.visible = false;
                        this.spawnCoins(new THREE.Vector3(0, 1.6, -5.2));
                        g.walkGate = exit;
                        g.mode = 'opening';
                        g.modeDelay = 0.8;
                        g.walkT = 0;
                    } else {
                        // The wrong key shatters in the lock — and is gone
                        failureSound.play();
                        this.message = { value: rec.chamber.scenario.failMsg, error: true };
                        g.camShake = 0.6;
                        for (let i = 0; i < 12; i++) {
                            const shard = new THREE.Mesh(
                                g.puffGeo,
                                new THREE.MeshBasicMaterial({ color: 0xffd740, transparent: true })
                            );
                            shard.scale.setScalar(0.5 + Math.random() * 0.8);
                            shard.position.set(0, 1.7, -5.7);
                            g.scene.add(shard);
                            g.particles.push({
                                mesh: shard,
                                vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, 1 + Math.random() * 2),
                                gravity: 8,
                                maxLife: 0.8,
                                life: 0.8,
                            });
                        }
                        g.mode = 'keyFail';
                        g.modeDelay = 0.7;
                    }
                }
            } else if (g.mode === 'keyFail') {
                g.modeDelay -= dt;
                if (g.modeDelay <= 0) {
                    g.walkGate.active = false;
                    this.refreshPickMeshes();
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


// Learning Platformer - 2D side-scroller (Phaser 3), Mario-style answer picking.
// The level is a sequence of themed obstacles, each with one answer per option:
//   river / clouds / dragon - blocks float overhead, jump up to hit one
//   pipes    - Mario warp pipes: hop into one; right warps you forward, wrong
//              warps you back to the start of the obstacle
//   platform - jump up and land on the floating platform with the right answer
//   tree     - jump up and grab the one right fruit (Dangerous Dave style)
// Picking right opens the gate; a wrong pick just grays out - no falling, no
// dying - so young kids can always recover.
var PlatformerComponent = Vue.component('platformer', Vue.extend({
    template: `
    <div class="container">
        <div class="row">
            <h5 v-html="title" :style="{color: theme.colors.text}"></h5>
        </div>
        <div class="row">
            <h3 v-html="exercise" :style="{color: theme.colors.text}"></h3>
        </div>
        <div class="row">
            <div class="platformer-area" ref="gameArea"></div>
        </div>
        <div class="row platformer-controls">
            <div class="platformer-dpad">
                <button class="platformer-btn"
                        @touchstart.prevent="touch.left = true" @touchend.prevent="touch.left = false"
                        @touchcancel="touch.left = false"
                        @mousedown="touch.left = true" @mouseup="touch.left = false"
                        @mouseleave="touch.left = false">◀</button>
                <button class="platformer-btn"
                        @touchstart.prevent="touch.right = true" @touchend.prevent="touch.right = false"
                        @touchcancel="touch.right = false"
                        @mousedown="touch.right = true" @mouseup="touch.right = false"
                        @mouseleave="touch.right = false">▶</button>
            </div>
            <button class="platformer-btn platformer-jump"
                    @touchstart.prevent="touch.jump = true"
                    @mousedown="touch.jump = true">קפוץ ⬆</button>
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
            list: [],
            game: null,
            touch: {left: false, right: false, jump: false},
            destroyed: false,
        }
    },

    methods: {
        create: function() {
            // The Phaser game starts from mounted(); base created() still calls this.
        },

        makeQuestion: function(usedIndexes) {
            let qIndex = getWeightedRandomIndex(this.list, this.currentAppId, getSetItems(this.currentApp));
            for (let tries = 0; usedIndexes.has(qIndex) && tries < 8; tries++) {
                qIndex = getWeightedRandomIndex(this.list, this.currentAppId, getSetItems(this.currentApp));
            }
            usedIndexes.add(qIndex);

            const wrongIndexes = getRandomIndexesExcluding(this.list, this.currentApp.resultIndex, qIndex);
            const options = this.shuffle([
                {text: String(this.list[qIndex][this.currentApp.resultIndex].value), correct: true},
                ...wrongIndexes.map(i => ({text: String(this.list[i][this.currentApp.resultIndex].value), correct: false})),
            ]);

            const questionField = { ...this.list[qIndex][this.currentApp.questionIndex] };
            if (this.currentApp.questionType) {
                questionField.type = this.currentApp.questionType;
            }
            const showText = questionField.type === 'text' || questionField.type === 'text_to_speech';
            return {
                questionIndex: qIndex,
                html: render(questionField),
                banner: showText ? String(questionField.value) : '🔊 הקשב לשאלה',
                action: generateQuestion(questionField),
                options: options,
            };
        },

        onCorrect: function(question) {
            this.message = {value: this.getSuccessMsg(), success: true};
            successSound.play();
            updateWeightForKey(this.currentAppId, question.questionIndex, -1);
            this.score += 1;
            if (this.reloadProgress()) {
                this.saveScore();
            }
        },

        onWrong: function(question) {
            failureSound.play();
            this.score = Math.max(0, this.score - 1);
            this.saveScore();
            updateWeightForKey(this.currentAppId, question.questionIndex, 1);
            this.message = {value: 'נסה שוב :(', error: true};
            this.reloadProgress();
        },

        startGame: function() {
            const vm = this;
            const W = 900, H = 500, GROUND_H = 64;
            const SEG = 900, INTRO = 620, OUTRO = 520;
            const SPEED = 240, JUMP_VELOCITY = 590;

            const BLOCK_TEXTURES = {river: 'pf_stone', clouds: 'pf_cloud', dragon: 'pf_block'};

            function createTextures(scene) {
                if (scene.textures.exists('pf_ground')) {
                    return;
                }
                const g = scene.add.graphics();

                // Sky gradient (sits behind everything as a fixed backdrop)
                g.fillGradientStyle(0x4aa6e0, 0x4aa6e0, 0xcdeafe, 0xcdeafe, 1);
                g.fillRect(0, 0, W, H);
                g.generateTexture('pf_sky', W, H); g.clear();

                // Grassy ground: dirt, pebbles, grass blades on top
                g.fillStyle(0x6d4c41); g.fillRect(0, 0, 64, GROUND_H);
                g.fillStyle(0x5d4037);
                g.fillCircle(12, 42, 4); g.fillCircle(42, 54, 5); g.fillCircle(54, 34, 3);
                g.fillStyle(0x7cb342); g.fillRect(0, 0, 64, 18);
                g.fillStyle(0x9ccc65); g.fillRect(0, 0, 64, 7);
                g.fillStyle(0x7cb342);
                for (let i = 0; i < 64; i += 8) { g.fillTriangle(i, 18, i + 4, 8, i + 8, 18); }
                g.generateTexture('pf_ground', 64, GROUND_H); g.clear();

                // Golden answer block (dragon / generic) with shine
                g.fillGradientStyle(0xffe082, 0xffca28, 0xffb300, 0xffa000, 1);
                g.fillRoundedRect(0, 0, 140, 84, 14);
                g.lineStyle(5, 0xff8f00); g.strokeRoundedRect(3, 3, 134, 78, 14);
                g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(12, 10, 116, 18, 8);
                g.generateTexture('pf_block', 140, 84); g.clear();

                // Cloud block
                g.fillStyle(0xffffff); g.fillRoundedRect(0, 0, 140, 84, 40);
                g.fillStyle(0xe3f2fd); g.fillRoundedRect(0, 46, 140, 38, {tl: 0, tr: 0, bl: 40, br: 40});
                g.generateTexture('pf_cloud', 140, 84); g.clear();

                // Stepping stone (river)
                g.fillGradientStyle(0xb0bec5, 0x90a4ae, 0x78909c, 0x607d8b, 1);
                g.fillRoundedRect(0, 0, 140, 84, 16);
                g.lineStyle(5, 0x546e7a); g.strokeRoundedRect(3, 3, 134, 78, 16);
                g.fillStyle(0xffffff, 0.25); g.fillRoundedRect(12, 10, 116, 16, 8);
                g.generateTexture('pf_stone', 140, 84); g.clear();

                // Mario-style warp pipe: shaded body + wide lip + dark mouth
                const PW = 96, PH = 112;
                g.fillGradientStyle(0x66bb6a, 0x2e7d32, 0x66bb6a, 0x2e7d32, 1);
                g.fillRect(12, 26, PW - 24, PH - 26);
                g.fillStyle(0xa5d6a7, 0.7); g.fillRect(20, 30, 10, PH - 34);
                g.fillStyle(0x1b5e20); g.fillRect(8, 26, 6, PH - 26);
                g.fillGradientStyle(0x81c784, 0x2e7d32, 0x81c784, 0x2e7d32, 1);
                g.fillRoundedRect(0, 0, PW, 30, 8);
                g.fillStyle(0x103810); g.fillRect(10, 6, PW - 20, 18);
                g.fillStyle(0x000000, 0.55); g.fillRect(16, 9, PW - 32, 12);
                g.generateTexture('pf_pipe', PW, PH); g.clear();

                // Floating one-way platform: grass cap on a dirt slab + drop shadow
                const LW = 140, LH = 40;
                g.fillStyle(0x000000, 0.15); g.fillRoundedRect(6, 12, LW - 12, LH - 8, 10);
                g.fillGradientStyle(0x8d6e63, 0x6d4c41, 0x5d4037, 0x4e342e, 1);
                g.fillRoundedRect(0, 8, LW, LH - 8, 10);
                g.fillStyle(0x7cb342); g.fillRoundedRect(0, 0, LW, 16, {tl: 10, tr: 10, bl: 0, br: 0});
                g.fillStyle(0x9ccc65); g.fillRect(0, 0, LW, 6);
                g.generateTexture('pf_platform', LW, LH); g.clear();

                // Apple (tree fruit) with stem, leaf and highlight
                const AW = 46, AH = 50;
                g.fillStyle(0x6d4c41); g.fillRect(AW / 2 - 2, 2, 4, 12);
                g.fillStyle(0x43a047); g.fillEllipse(AW / 2 + 9, 9, 18, 10);
                g.fillStyle(0xe53935); g.fillCircle(AW / 2, AH / 2 + 7, 17);
                g.fillStyle(0xc62828); g.fillCircle(AW / 2 + 6, AH / 2 + 11, 12);
                g.fillStyle(0xff8a80, 0.85); g.fillCircle(AW / 2 - 6, AH / 2 + 1, 5);
                g.generateTexture('pf_apple', AW, AH); g.clear();

                // Water, bridge, coin
                g.fillGradientStyle(0x4fc3f7, 0x29b6f6, 0x0288d1, 0x0277bd, 1);
                g.fillRect(0, 0, 64, GROUND_H);
                g.generateTexture('pf_water', 64, GROUND_H); g.clear();
                g.fillStyle(0x8d6e63); g.fillRect(0, 0, 64, 18);
                g.lineStyle(2, 0x5d4037); g.strokeRect(0, 0, 64, 18);
                g.generateTexture('pf_bridge', 64, 18); g.clear();
                g.fillStyle(0xffd700); g.fillCircle(12, 12, 12);
                g.fillStyle(0xfff59d); g.fillCircle(12, 12, 6);
                g.generateTexture('pf_coin', 24, 24);
                g.destroy();
            }

            function coinBurst(scene, x, y) {
                for (let c = 0; c < 6; c++) {
                    const coin = scene.add.image(x, y, 'pf_coin').setDepth(8);
                    scene.tweens.add({
                        targets: coin,
                        x: x + (c - 2.5) * 34,
                        y: y - 110 - Math.random() * 50,
                        alpha: 0,
                        duration: 700,
                        ease: 'Cubic.easeOut',
                        onComplete: () => coin.destroy(),
                    });
                }
            }

            function markWrong(scene, block) {
                block.disabled = true;
                block.img.setTint(0x9e9e9e);
                block.label.setAlpha(0.4);
            }

            function sparkleBurst(scene, x, y) {
                for (let i = 0; i < 8; i++) {
                    const star = scene.add.text(x, y, '✨', {fontSize: '20px'}).setOrigin(0.5).setDepth(8);
                    const a = (i / 8) * Math.PI * 2;
                    scene.tweens.add({
                        targets: star,
                        x: x + Math.cos(a) * 60,
                        y: y + Math.sin(a) * 60,
                        alpha: 0,
                        duration: 700,
                        onComplete: () => star.destroy(),
                    });
                }
            }

            function solveObstacle(scene, obstacle, chosenBlock) {
                if (obstacle.type === 'tree' || obstacle.type === 'platform') {
                    sparkleBurst(scene, chosenBlock.img.x, chosenBlock.img.y);
                } else {
                    coinBurst(scene, chosenBlock.img.x, chosenBlock.img.y - 30);
                }
                chosenBlock.img.setTint(0x81c784);
                obstacle.blocks.forEach(block => {
                    scene.tweens.add({
                        targets: [block.img, block.label],
                        alpha: 0,
                        y: '-=40',
                        delay: block === chosenBlock ? 450 : 0,
                        duration: 400,
                        onComplete: () => block.img.disableBody(true, true),
                    });
                });
                obstacle.barrier.destroy();
                obstacle.deco.forEach(d => scene.tweens.add({targets: d, alpha: 0, duration: 600}));
                if (obstacle.type === 'river') {
                    scene.add.tileSprite(obstacle.wallX, H - GROUND_H + 9, 130, 18, 'pf_bridge').setDepth(4);
                }
                if (obstacle.dragon) {
                    scene.tweens.add({
                        targets: obstacle.dragon,
                        x: '+=260',
                        y: '-=330',
                        alpha: 0,
                        duration: 1100,
                        ease: 'Cubic.easeIn',
                    });
                }
            }

            function handleChoice(scene, obstacle, block) {
                if (vm.destroyed || obstacle.answered || block.disabled || scene.warping) {
                    return;
                }
                if (obstacle.type === 'pipes') {
                    handlePipeChoice(scene, obstacle, block);
                    return;
                }
                if (block.correct) {
                    obstacle.answered = true;
                    scene.bannerText.setText('🪙 רוץ קדימה!');
                    solveObstacle(scene, obstacle, block);
                    vm.onCorrect(obstacle.q);
                } else {
                    markWrong(scene, block);
                    scene.cameras.main.shake(150, 0.004);
                    vm.onWrong(obstacle.q);
                }
            }

            // Mario warp pipes: entering a pipe drops the player down and out
            // somewhere else - forward past the gate if right, back to the start
            // of the obstacle if wrong (still no falling, no dying).
            function handlePipeChoice(scene, obstacle, pipe) {
                scene.warping = true;
                const goRight = pipe.correct;
                const destX = goRight ? obstacle.wallX + 70 : obstacle.startX;
                warpPlayer(scene, pipe.img.x, pipe.img.y, destX, () => {
                    if (goRight) {
                        obstacle.answered = true;
                        scene.bannerText.setText('🪙 רוץ קדימה!');
                        solveObstacle(scene, obstacle, pipe);
                        vm.onCorrect(obstacle.q);
                    } else {
                        markWrong(scene, pipe);
                        scene.cameras.main.shake(150, 0.004);
                        vm.onWrong(obstacle.q);
                    }
                });
            }

            function warpPlayer(scene, pipeX, pipeY, destX, onArrive) {
                const player = scene.player;
                player.body.setVelocity(0, 0);
                player.body.moves = false;
                player.setAngle(0);
                scene.tweens.add({
                    targets: player, x: pipeX, duration: 130,
                    onComplete: () => scene.tweens.add({
                        targets: player, y: pipeY + 22, scale: 0.3, duration: 300, ease: 'Quad.easeIn',
                        onComplete: () => {
                            player.setPosition(destX, scene.groundTop - 60);
                            scene.tweens.add({
                                targets: player, scale: 1, duration: 240, ease: 'Back.easeOut',
                                onComplete: () => {
                                    player.body.reset(destX, scene.groundTop - 60);
                                    player.body.moves = true;
                                    scene.warping = false;
                                    onArrive();
                                },
                            });
                        },
                    }),
                });
            }

            // Readable label: dark text with a white halo so it shows on any texture
            function makeLabel(scene, x, y, text, opts) {
                return scene.add.text(x, y, text, Object.assign({
                    fontSize: '22px', fontFamily: 'Arial', color: '#1a1a1a', align: 'center',
                    fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 5,
                    wordWrap: {width: 130},
                }, opts || {})).setOrigin(0.5).setDepth(5);
            }

            // river / clouds / dragon: blocks float overhead, jump up to pick one
            function buildFloatingBlocks(scene, obstacle, baseX, q, groundTop, texKey) {
                const blockY = groundTop - 170;
                q.options.forEach((option, idx) => {
                    const x = baseX + 150 + idx * 190;
                    const img = scene.physics.add.staticImage(x, blockY, texKey).setDepth(4);
                    const label = makeLabel(scene, x, blockY, option.text, {wordWrap: {width: 125}});
                    const block = {img: img, label: label, correct: option.correct, disabled: false};
                    scene.physics.add.overlap(scene.player, img, () => handleChoice(scene, obstacle, block));
                    obstacle.blocks.push(block);
                });
            }

            // pipes: jump into the mouth of the pipe you choose to warp through it
            function buildPipes(scene, obstacle, baseX, q, groundTop) {
                q.options.forEach((option, idx) => {
                    const x = baseX + 150 + idx * 190;
                    const pipe = scene.physics.add.staticImage(x, groundTop - 56, 'pf_pipe').setDepth(4);
                    const label = makeLabel(scene, x, groundTop - 134, option.text, {color: '#1b5e20'});
                    const block = {img: pipe, label: label, correct: option.correct, disabled: false};
                    // Trigger only at the pipe's mouth, above standing height, so the
                    // player must hop into it (running past on the ground does nothing).
                    const mouth = scene.add.rectangle(x, groundTop - 98, 60, 26, 0x000000, 0);
                    scene.physics.add.existing(mouth, true);
                    scene.physics.add.overlap(scene.player, mouth, () => handleChoice(scene, obstacle, block));
                    obstacle.blocks.push(block);
                });
            }

            // platform: jump up and land on the floating platform with the right answer
            function buildPlatform(scene, obstacle, baseX, q, groundTop) {
                q.options.forEach((option, idx) => {
                    const x = baseX + 150 + idx * 190;
                    const y = groundTop - (idx % 2 === 0 ? 90 : 116);
                    const plat = scene.physics.add.staticImage(x, y, 'pf_platform').setDepth(4);
                    // One-way: the player can jump up through it and land on top
                    plat.body.checkCollision.down = false;
                    plat.body.checkCollision.left = false;
                    plat.body.checkCollision.right = false;
                    scene.physics.add.collider(scene.player, plat);
                    const label = makeLabel(scene, x, y - 2, option.text, {
                        fontSize: '20px', color: '#3e2723', wordWrap: {width: 130},
                    });
                    const block = {img: plat, label: label, correct: option.correct, disabled: false};
                    const zone = scene.add.rectangle(x, y - 18, 132, 24, 0x000000, 0);
                    scene.physics.add.existing(zone, true);
                    scene.physics.add.overlap(scene.player, zone, () => {
                        if (scene.player.body.velocity.y < -10) {
                            return; // ignore the upward pass-through; count the landing
                        }
                        handleChoice(scene, obstacle, block);
                    });
                    obstacle.blocks.push(block);
                });
            }

            // tree: jump up and grab the one right fruit (Dangerous Dave style)
            function buildTree(scene, obstacle, baseX, q, groundTop) {
                const cx = baseX + 430;
                drawTree(scene, cx, groundTop);
                q.options.forEach((option, idx) => {
                    const x = cx - 150 + idx * 100;
                    const y = groundTop - (idx % 2 === 0 ? 140 : 172);
                    const fruit = scene.physics.add.staticImage(x, y, 'pf_apple').setDepth(5);
                    const label = makeLabel(scene, x, y + 32, option.text, {
                        color: '#ffffff', stroke: '#2e7d32', strokeThickness: 5, fontSize: '20px',
                        wordWrap: {width: 120},
                    }).setDepth(6);
                    const block = {img: fruit, label: label, correct: option.correct, disabled: false};
                    scene.physics.add.overlap(scene.player, fruit, () => handleChoice(scene, obstacle, block));
                    obstacle.blocks.push(block);
                });
            }

            function drawTree(scene, cx, groundTop) {
                const g = scene.add.graphics().setDepth(3);
                g.fillStyle(0x6d4c41); g.fillRoundedRect(cx - 26, groundTop - 150, 52, 156, {tl: 8, tr: 8, bl: 0, br: 0});
                g.fillStyle(0x8d6e63); g.fillRect(cx - 22, groundTop - 148, 9, 150);
                const blobs = [[0, -205, 118], [-95, -165, 88], [95, -165, 88], [-55, -240, 78], [55, -240, 78], [0, -265, 78]];
                g.fillStyle(0x2e7d32);
                blobs.forEach(b => g.fillCircle(cx + b[0], groundTop + b[1], b[2]));
                g.fillStyle(0x43a047);
                blobs.forEach(b => g.fillCircle(cx + b[0] - 14, groundTop + b[1] - 14, b[2] * 0.66));
            }

            // Themed scenery sitting on the blocked passage; it fades when solved
            function addDeco(scene, obstacle, groundTop, type) {
                const wx = obstacle.wallX;
                if (type === 'river') {
                    obstacle.deco.push(scene.add.tileSprite(wx, H - GROUND_H / 2, 130, GROUND_H, 'pf_water').setDepth(3));
                    obstacle.deco.push(scene.add.text(wx, groundTop - 36, '🌊', {fontSize: '40px'}).setOrigin(0.5));
                } else if (type === 'clouds') {
                    for (let i = 0; i < 3; i++) {
                        obstacle.deco.push(scene.add.text(wx, groundTop - 40 - i * 86, '☁️', {fontSize: '72px'}).setOrigin(0.5));
                    }
                } else if (type === 'pipes') {
                    for (let i = 0; i < 3; i++) {
                        obstacle.deco.push(scene.add.text(wx, groundTop - 30 - i * 60, '🧱', {fontSize: '56px'}).setOrigin(0.5));
                    }
                } else if (type === 'platform') {
                    for (let i = 0; i < 3; i++) {
                        obstacle.deco.push(scene.add.text(wx, groundTop - 32 - i * 64, '🪨', {fontSize: '58px'}).setOrigin(0.5));
                    }
                } else if (type === 'tree') {
                    for (let i = 0; i < 3; i++) {
                        obstacle.deco.push(scene.add.text(wx, groundTop - 34 - i * 54, '🌿', {fontSize: '54px'}).setOrigin(0.5));
                    }
                }
            }

            function addDragon(scene, obstacle, groundTop) {
                obstacle.dragon = scene.add.text(obstacle.wallX - 20, groundTop - 70, '🐉', {fontSize: '88px'}).setOrigin(0.5).setDepth(4);
                scene.tweens.add({
                    targets: obstacle.dragon,
                    y: '-=26', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
                });
            }

            function buildObstacle(scene, type, baseX, q, groundTop) {
                const obstacle = {type: type, q: q, answered: false, activated: false, blocks: [], deco: []};

                // Invisible gate that opens when the obstacle is solved, plus the
                // warp-back checkpoint used by the pipes.
                obstacle.startX = baseX + 60;
                obstacle.wallX = baseX + 815;
                const wall = scene.add.rectangle(obstacle.wallX, H / 2, 26, H, 0x000000, 0);
                scene.physics.add.existing(wall, true);
                scene.physics.add.collider(scene.player, wall);
                obstacle.barrier = wall;

                if (type === 'pipes') {
                    buildPipes(scene, obstacle, baseX, q, groundTop);
                } else if (type === 'platform') {
                    buildPlatform(scene, obstacle, baseX, q, groundTop);
                } else if (type === 'tree') {
                    buildTree(scene, obstacle, baseX, q, groundTop);
                } else {
                    buildFloatingBlocks(scene, obstacle, baseX, q, groundTop, BLOCK_TEXTURES[type]);
                }

                addDeco(scene, obstacle, groundTop, type);
                if (type === 'dragon') {
                    addDragon(scene, obstacle, groundTop);
                }

                // Activation zone: shows + reads the question when the player arrives
                const trigger = scene.add.rectangle(baseX + 30, H / 2, 30, H, 0x000000, 0);
                scene.physics.add.existing(trigger, true);
                scene.physics.add.overlap(scene.player, trigger, () => {
                    if (vm.destroyed || obstacle.activated) {
                        return;
                    }
                    obstacle.activated = true;
                    scene.currentQ = q;
                    scene.lastCheckpointX = baseX + 30;
                    vm.exercise = q.html;
                    vm.message = {};
                    scene.bannerText.setText(q.banner);
                    try { q.action(); } catch (e) {}
                });

                return obstacle;
            }

            function sceneCreate() {
                const scene = this;
                createTextures(scene);

                const usedIndexes = new Set();
                const pool = vm.shuffle(['river', 'clouds', 'pipes', 'platform', 'tree']);
                const themes = pool.slice(0, 4).concat(['dragon']);
                const total = INTRO + themes.length * SEG + OUTRO;
                const groundTop = H - GROUND_H;
                scene.groundTop = groundTop;
                scene.lastCheckpointX = 120;
                scene.levelDone = false;
                scene.currentQ = null;
                scene.warping = false;

                scene.physics.world.setBounds(0, 0, total, H);
                scene.cameras.main.setBounds(0, 0, total, H);

                // Layered, parallax background -> reads like a real side-scroller
                scene.add.image(0, 0, 'pf_sky').setOrigin(0).setScrollFactor(0).setDepth(-20);
                scene.add.text(70, 54, '☀️', {fontSize: '58px'}).setScrollFactor(0).setDepth(-19);
                for (let x = 0; x < total; x += 300) {
                    scene.add.ellipse(x, groundTop + 30, 360, 240, 0x81c784).setScrollFactor(0.25).setDepth(-12).setAlpha(0.85);
                }
                for (let x = 200; x < total; x += 380) {
                    scene.add.text(x, 80 + (x % 3) * 30, '☁️', {fontSize: '44px'}).setScrollFactor(0.4).setDepth(-11).setAlpha(0.9);
                }
                for (let x = 150; x < total; x += 260) {
                    scene.add.ellipse(x, groundTop + 44, 240, 180, 0x66bb6a).setScrollFactor(0.55).setDepth(-10).setAlpha(0.9);
                }
                for (let x = 330; x < total; x += 520) {
                    scene.add.text(x, groundTop + 6, '🌳', {fontSize: '46px'}).setOrigin(0.5, 1).setScrollFactor(0.8).setDepth(1).setAlpha(0.9);
                }

                const ground = scene.add.tileSprite(total / 2, H - GROUND_H / 2, total, GROUND_H, 'pf_ground').setDepth(2);
                scene.physics.add.existing(ground, true);

                const player = scene.add.text(120, groundTop - 60, '🏃', {fontSize: '42px'}).setOrigin(0.5).setDepth(6);
                player.setFlipX(true); // the emoji faces left by default; start facing right
                scene.physics.add.existing(player);
                player.body.setSize(34, 44);
                player.body.setOffset((player.width - 34) / 2, (player.height - 44) / 2);
                player.body.setCollideWorldBounds(true);
                scene.physics.add.collider(player, ground);
                scene.player = player;
                // The physics body stays an unscaled upright box (scaling it would
                // resize the collider and drop him through the floor). A separate
                // sprite rides on top and carries all the run / jump animation.
                player.setAlpha(0);
                scene.playerArt = scene.add.text(player.x, player.y, '🏃', {fontSize: '42px'})
                    .setOrigin(0.5).setDepth(6).setFlipX(true);
                scene.playerShadow = scene.add.ellipse(player.x, groundTop + 2, 40, 12, 0x000000, 0.25).setDepth(3);

                // Fixed question banner on top of the game view; tap to hear again
                const banner = scene.add.rectangle(W / 2, 38, W - 28, 60, 0x1a237e, 0.6)
                    .setScrollFactor(0).setDepth(9).setInteractive();
                scene.bannerText = scene.add.text(W / 2, 38, '➡ רוץ ימינה!', {
                    fontSize: '28px', fontFamily: 'Arial', color: '#ffffff',
                }).setOrigin(0.5).setScrollFactor(0).setDepth(10);
                banner.on('pointerdown', () => {
                    if (scene.currentQ) {
                        try { scene.currentQ.action(); } catch (e) {}
                    }
                });

                themes.forEach((type, i) => buildObstacle(scene, type, INTRO + i * SEG, vm.makeQuestion(usedIndexes), groundTop));

                // Trophy at the end of the level -> rebuild with fresh questions
                const trophy = scene.add.text(total - 180, groundTop - 44, '🏆', {fontSize: '58px'}).setOrigin(0.5);
                scene.physics.add.existing(trophy, true);
                scene.physics.add.overlap(player, trophy, () => {
                    if (vm.destroyed || scene.levelDone) {
                        return;
                    }
                    scene.levelDone = true;
                    vm.message = {value: vm.getSuccessMsg(), success: true};
                    coinBurst(scene, trophy.x, trophy.y);
                    scene.time.delayedCall(900, () => {
                        if (!vm.destroyed && vm.reloadProgress()) {
                            vm.exercise = '';
                            scene.scene.restart();
                        }
                    });
                });

                scene.cursors = scene.input.keyboard.createCursorKeys();
                scene.coyoteUntil = 0;
                scene.jumpBufferUntil = 0;
                scene.cameras.main.startFollow(player, true, 0.12, 0.12);
            }

            function sceneUpdate(time) {
                const scene = this;
                const player = scene.player;
                if (!player || !player.body) {
                    return;
                }

                // The visible sprite always rides on the (invisible) physics body
                const art = scene.playerArt;
                art.x = player.x;
                art.y = player.y;

                // Soft shadow that shrinks/fades as the player rises
                const sh = scene.playerShadow;
                if (sh) {
                    const air = Phaser.Math.Clamp((scene.groundTop - player.y) / 220, 0, 1);
                    sh.x = player.x;
                    sh.y = scene.groundTop + 2;
                    sh.setScale(1 - air * 0.5);
                    sh.setAlpha(0.28 * (1 - air * 0.6));
                }

                // Controls are frozen mid pipe-warp; keep the sprite matched to the
                // warp tween (which scales/moves the body) while we wait.
                if (scene.warping) {
                    art.setScale(player.scaleX, player.scaleY).setAngle(player.angle);
                    return;
                }

                const left = scene.cursors.left.isDown || vm.touch.left;
                const right = scene.cursors.right.isDown || vm.touch.right;
                if (left && !right) {
                    player.body.setVelocityX(-SPEED);
                    art.setFlipX(false);
                } else if (right && !left) {
                    player.body.setVelocityX(SPEED);
                    art.setFlipX(true);
                } else {
                    player.body.setVelocityX(0);
                }

                // Forgiving jump: coyote time + jump buffering
                if (player.body.blocked.down || player.body.touching.down) {
                    scene.coyoteUntil = time + 120;
                }
                const jumpPressed = Phaser.Input.Keyboard.JustDown(scene.cursors.up)
                    || Phaser.Input.Keyboard.JustDown(scene.cursors.space)
                    || vm.touch.jump;
                vm.touch.jump = false;
                if (jumpPressed) {
                    scene.jumpBufferUntil = time + 140;
                }
                if (time < scene.jumpBufferUntil && time < scene.coyoteUntil) {
                    player.body.setVelocityY(-JUMP_VELOCITY);
                    scene.jumpBufferUntil = 0;
                    scene.coyoteUntil = 0;
                }

                // Make him *look* like he's running / jumping. Applied to the
                // sprite only, never the physics body, so he can't sink.
                const grounded = player.body.blocked.down || player.body.touching.down;
                const lean = art.flipX ? 1 : -1; // flipX = facing right
                if (!grounded) {
                    // airborne: stretch up when rising, squash when falling, tilt forward
                    const s = Phaser.Math.Clamp(-player.body.velocity.y / 700, -0.28, 0.28);
                    art.setScale(1 - s * 0.6, 1 + s);
                    art.setAngle(lean * 16);
                } else if (Math.abs(player.body.velocity.x) > 10) {
                    // running: quick bob + back-and-forth stride sway
                    art.setScale(1, 1 + Math.abs(Math.sin(time * 0.05)) * 0.08);
                    art.setAngle(lean * 7 + Math.sin(time * 0.025) * 9);
                } else {
                    // idle: settle upright with a gentle breathing pulse
                    art.setAngle(art.angle * 0.7);
                    art.setScale(1, 1 + Math.sin(time * 0.004) * 0.03);
                }

                // Safety net: the level has no pits, but recover gracefully anyway
                if (player.y > H + 80) {
                    player.setPosition(scene.lastCheckpointX, scene.groundTop - 80);
                    player.body.setVelocity(0, 0);
                }
            }

            this.game = new Phaser.Game({
                type: Phaser.AUTO,
                parent: this.$refs.gameArea,
                width: W,
                height: H,
                backgroundColor: '#aee4ff',
                physics: {default: 'arcade', arcade: {gravity: {y: 1100}, debug: false}},
                scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH},
                scene: {create: sceneCreate, update: sceneUpdate},
            });
        },
    },

    mounted() {
        this.currentAppId = this.$route.params.currentAppId;
        this.currentApp = getItemById(apps, this.currentAppId);
        this.updateScore();
        if (!this.reloadProgress()) {
            return;
        }
        this.title = this.currentApp.title || 'רוץ, קפוץ ופגע בתשובה הנכונה!';
        this.list = getDataList(this.currentApp.listName);
        if (typeof Phaser === 'undefined') {
            this.message = {value: 'משחק הפלטפורמה לא נטען - בדוק חיבור לאינטרנט ונסה שוב', error: true};
            return;
        }
        this.startGame();
    },

    beforeDestroy() {
        this.destroyed = true;
        if (this.game) {
            this.game.destroy(true);
            this.game = null;
        }
    },
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
    {path: '/play/platformer/:currentAppId', component: PlatformerComponent, props: true },
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

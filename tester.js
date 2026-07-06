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
    // Adventure mode: virtual lists (a world's filtered subset) from worlds.js
    if (typeof getAdventureList === 'function') {
        const adventureList = getAdventureList(listName);
        if (adventureList) {
            return adventureList;
        }
    }
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
        // Adventure mode: unlock cycles run only from 'learn' encounters (worlds.js)
        if (setItems && (typeof shouldAdventureAutoUnlock !== 'function' || shouldAdventureAutoUnlock(key))){
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
    let weights = null;
    // Adventure mode: first-time init seeded from existing knowledge about the
    // same items (worlds.js). Returns null for regular keys or when there is
    // no evidence — then the default initialization proceeds as usual.
    if (typeof getAdventureSeededWeights === 'function') {
        weights = getAdventureSeededWeights(key, setItems, elements);
    }
    if (weights) {
        // Seeded from prior knowledge — progress and new_items were already updated inside the hook
    } else if (setItems === 0 || getActivityMode() == 'practicing') {
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
    // Adventure mode: report the answer for XP / world-completion tracking (adventure.js)
    if (typeof onAdventureAnswer === 'function') {
        onAdventureAnswer(key, change < 0);
    }
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
  // Adventure mode: adv-<world>-<n> ids resolve to a virtual app from worlds.js
  if (typeof resolveAdventureApp === 'function') {
      const adventureApp = resolveAdventureApp(id);
      if (adventureApp) {
          return adventureApp;
      }
  }
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
                // Adventure mode: return to the world path instead of the legacy app screen
                if (typeof getAdventureLevelCompleteRoute === 'function') {
                    const adventureRoute = getAdventureLevelCompleteRoute(this.currentAppId);
                    if (adventureRoute) {
                        this.$router.push(adventureRoute);
                        return false;
                    }
                }
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


// Word Link - matching game. Question words drift down from the top; answer
// words sit in slots along the bottom. Drag a line from a falling word to its
// matching answer and, if they pair up, both explode. A wrong link just fizzles;
// a word that reaches the floor respawns at the top (no losing, kid-friendly).
var WordLinkComponent = Vue.component('word-link', Vue.extend({
    template: `
    <div class="container">
        <div class="row">
            <h3 v-html="title" :style="{color: theme.colors.text}"></h3>
        </div>
        <div class="row">
            <div class="wl-area" ref="wlArea" @pointerdown="onDown" @pointermove="onMove"
                 @pointerup="onUp" @pointercancel="onUp" @pointerleave="onUp">
                <svg class="wl-svg" :width="areaW" :height="areaH">
                    <line v-if="line.active" :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2"
                          :stroke="line.ok ? '#69f0ae' : '#ffd54f'" stroke-width="7"
                          stroke-linecap="round" stroke-dasharray="2 14" />
                </svg>
                <div v-for="b in blocks" :key="b.id" v-show="!b.dead"
                     class="wl-token wl-faller" :class="{'wl-exposed': b.exposed, 'wl-buried': !b.exposed}"
                     :data-id="b.id"
                     :style="{left: b.left + 'px', top: b.y + 'px', width: blockW + 'px', height: blockH + 'px'}">{{ b.text }}</div>
                <div v-for="t in targets" :key="t.id" class="wl-token wl-target"
                     :data-id="t.id"
                     :style="{left: t.left + 'px', top: t.top + 'px', width: blockW + 'px', height: blockH + 'px'}">{{ t.text }}</div>
                <div v-for="x in bursts" :key="x.id" class="wl-burst"
                     :style="{left: x.x + 'px', top: x.y + 'px'}">💥</div>
                <div v-if="gameOver" class="wl-over">
                    <div class="wl-over-title">💥 המשחק נגמר!</div>
                    <button class="wl-restart" @click="restart">שחק שוב</button>
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
            list: [],
            blocks: [],     // every question block on screen (flat, for rendering)
            columns: [],    // columns[c] = stack of those same block refs (logic)
            targets: [],    // answer slots along the bottom
            bursts: [],
            line: {active: false, x1: 0, y1: 0, x2: 0, y2: 0, ok: false},
            dragId: null,
            dragGroup: null,
            moveTimer: null,
            spawnTimer: null,
            areaW: 320,
            areaH: 400,
            nCols: 5,
            colW: 64,
            blockW: 60,
            blockH: 48,
            stackFloor: 320,
            targetTop: 330,
            maxRows: 8,
            preRows: 3,         // how tall the wall starts
            descendSpeed: 0.05, // very slow, Tetris-like
            startBottomY: 168,  // y of the lowest tile when the wall is built
            gameOver: false,
            seq: 0,
            destroyed: false,
        };
    },

    methods: {
        create: function() {
            // Real setup happens in mounted() (same pattern as falling_answers).
        },

        uid: function() {
            this.seq += 1;
            return 'wl' + this.seq;
        },

        fieldToken: function(idx, fieldName) {
            const field = this.list[idx][fieldName];
            const isText = field.type === 'text' || field.type === 'text_to_speech';
            return {text: isText ? String(field.value) : '🔊', action: generateQuestion(field)};
        },

        colX: function(c) {
            return Math.round(c * this.colW + (this.colW - this.blockW) / 2);
        },

        pickQuestionIdx: function() {
            return getWeightedRandomIndex(this.list, this.currentAppId, getSetItems(this.currentApp));
        },

        // --- the wall ------------------------------------------------------
        // Every tile carries an absolute y and the whole wall descends together
        // (tick adds to each y). The FRONT tile of a column is the lowest one
        // (largest y) - the only one that can be answered. Clearing it just
        // removes it; nothing drops in to fill the gap (the wall keeps coming).
        addTile: function(c, idx, y) {
            const q = this.fieldToken(idx, this.currentApp.questionIndex);
            const b = {id: this.uid(), idx: idx, text: q.text, action: q.action, col: c,
                       left: this.colX(c), y: y, exposed: false, dead: false};
            this.columns[c].push(b);
            this.blocks.push(b);
            return b;
        },

        removeBlock: function(b) {
            const col = this.columns[b.col];
            const i = col.indexOf(b);
            if (i !== -1) { col.splice(i, 1); }
            const bi = this.blocks.indexOf(b);
            if (bi !== -1) { this.blocks.splice(bi, 1); }
        },

        // The front (answerable) tile of a column = the lowest one on screen.
        frontTile: function(c) {
            const col = this.columns[c];
            if (!col.length) {
                return null;
            }
            let low = col[0];
            for (let i = 1; i < col.length; i++) {
                if (col[i].y > low.y) { low = col[i]; }
            }
            return low;
        },

        refreshExposed: function() {
            this.blocks.forEach(b => { b.exposed = false; });
            for (let c = 0; c < this.columns.length; c++) {
                const f = this.frontTile(c);
                if (f) { f.exposed = true; }
            }
        },

        columnTopY: function(c) {
            const col = this.columns[c];
            let top = Infinity;
            for (let i = 0; i < col.length; i++) {
                if (col[i].y < top) { top = col[i].y; }
            }
            return top;
        },

        exposedIdxs: function() {
            const a = [];
            for (let c = 0; c < this.columns.length; c++) {
                const f = this.frontTile(c);
                if (f) { a.push(f.idx); }
            }
            return a;
        },
        onScreenIdxs: function() {
            return this.blocks.filter(b => !b.dead).map(b => b.idx);
        },

        // --- answer slots --------------------------------------------------
        assignTarget: function(t, idx) {
            const a = this.fieldToken(idx, this.currentApp.resultIndex);
            t.idx = idx; t.text = a.text; t.action = a.action;
        },

        // The rule: if no answer currently matches an exposed (top) question,
        // the next answer must be for one of those exposed questions; otherwise
        // pick freely among the answers of the questions on screen.
        pickTargetIdx: function(avoid) {
            const exposed = this.exposedIdxs();
            const covered = this.targets.some(t => exposed.indexOf(t.idx) !== -1);
            let pool;
            if (exposed.length && !covered) {
                pool = exposed.filter(i => avoid.indexOf(i) === -1);
                if (!pool.length) { pool = exposed; }
            } else {
                const onScreen = this.onScreenIdxs();
                pool = onScreen.filter(i => avoid.indexOf(i) === -1);
                if (!pool.length) { pool = onScreen.length ? onScreen : [this.pickQuestionIdx()]; }
            }
            return pool[Math.floor(Math.random() * pool.length)];
        },

        refillTarget: function(t) {
            const avoid = this.targets.filter(x => x !== t).map(x => x.idx);
            this.assignTarget(t, this.pickTargetIdx(avoid));
            this.ensureSolvable();
        },

        // Safety net: guarantee at least one answer matches an exposed question.
        ensureSolvable: function() {
            const exposed = this.exposedIdxs();
            if (!exposed.length || !this.targets.length) {
                return;
            }
            if (this.targets.some(t => exposed.indexOf(t.idx) !== -1)) {
                return;
            }
            const idx = exposed[Math.floor(Math.random() * exposed.length)];
            const t = this.targets[Math.floor(Math.random() * this.targets.length)];
            this.assignTarget(t, idx);
        },

        buildTargets: function() {
            this.targets = [];
            for (let s = 0; s < this.nCols; s++) {
                this.targets.push({id: this.uid(), slot: s, idx: 0, text: '',
                                   action: function() {}, left: this.colX(s), top: this.targetTop});
            }
            this.targets.forEach(t => this.refillTarget(t));
        },

        // --- pointer / line drawing ---------------------------------------
        tokenCenter: function(el) {
            const r = el.getBoundingClientRect();
            const ar = this.$refs.wlArea.getBoundingClientRect();
            return {x: r.left + r.width / 2 - ar.left, y: r.top + r.height / 2 - ar.top};
        },
        relPoint: function(e) {
            const ar = this.$refs.wlArea.getBoundingClientRect();
            return {x: e.clientX - ar.left, y: e.clientY - ar.top};
        },
        tokenIdAt: function(clientX, clientY) {
            const el = document.elementFromPoint(clientX, clientY);
            const token = el && el.closest ? el.closest('.wl-token') : null;
            return token ? token.getAttribute('data-id') : null;
        },
        find: function(id) {
            return this.blocks.find(b => b.id === id) || this.targets.find(t => t.id === id) || null;
        },
        groupOf: function(id) {
            return this.blocks.some(b => b.id === id) ? 'q' : 'a';
        },

        onDown: function(e) {
            const id = this.tokenIdAt(e.clientX, e.clientY);
            if (!id) {
                return;
            }
            const tok = this.find(id);
            const grp = this.groupOf(id);
            if (!tok || (grp === 'q' && !tok.exposed)) {
                return; // buried questions can't be answered
            }
            e.preventDefault();
            const el = document.elementFromPoint(e.clientX, e.clientY).closest('.wl-token');
            const c = this.tokenCenter(el);
            this.dragId = id;
            this.dragGroup = grp;
            this.line = {active: true, x1: c.x, y1: c.y, x2: c.x, y2: c.y, ok: false};
        },

        onMove: function(e) {
            if (!this.dragId) {
                return;
            }
            const p = this.relPoint(e);
            this.line.x2 = p.x;
            this.line.y2 = p.y;
            const startEl = this.$refs.wlArea.querySelector('[data-id="' + this.dragId + '"]');
            if (startEl) {
                const c = this.tokenCenter(startEl);
                this.line.x1 = c.x;
                this.line.y1 = c.y;
            }
            const overId = this.tokenIdAt(e.clientX, e.clientY);
            const over = overId ? this.find(overId) : null;
            const drag = this.find(this.dragId);
            let ok = false;
            if (over && drag && this.groupOf(overId) !== this.dragGroup) {
                const qB = this.dragGroup === 'q' ? drag : over;
                ok = !!qB.exposed && over.idx === drag.idx;
            }
            this.line.ok = ok;
        },

        onUp: function(e) {
            if (!this.dragId) {
                return;
            }
            const overId = this.tokenIdAt(e.clientX, e.clientY);
            const drag = this.find(this.dragId);
            if (overId && overId !== this.dragId) {
                const over = this.find(overId);
                if (over && drag && this.groupOf(overId) !== this.dragGroup) {
                    const qBlock = this.dragGroup === 'q' ? drag : over;
                    const target = this.dragGroup === 'q' ? over : drag;
                    if (qBlock.exposed && qBlock.idx === target.idx) {
                        this.matchPair(qBlock, target);
                    } else {
                        this.message = {value: 'לא תואם, נסה שוב', error: true};
                        failureSound.play();
                    }
                }
            } else if (overId && overId === this.dragId && drag) {
                try { drag.action(); } catch (err) {} // a tap reads the word aloud
            }
            this.line.active = false;
            this.dragId = null;
            this.dragGroup = null;
        },

        burst: function(token) {
            const el = this.$refs.wlArea.querySelector('[data-id="' + token.id + '"]');
            const c = el ? this.tokenCenter(el) : {x: token.left, y: token.y || token.top};
            const b = {id: this.uid(), x: c.x, y: c.y};
            this.bursts.push(b);
            setTimeout(() => {
                const i = this.bursts.indexOf(b);
                if (i !== -1) { this.bursts.splice(i, 1); }
            }, 600);
        },

        matchPair: function(block, target) {
            this.burst(block);
            this.burst(target);
            this.removeBlock(block);
            this.message = {value: this.getSuccessMsg(), success: true};
            successSound.play();
            this.score += 1;
            updateWeightForKey(this.currentAppId, block.idx, -1);
            this.saveScore();
            this.reloadProgress();
            this.refreshExposed();
            this.refillTarget(target);
            this.ensureSolvable();
        },

        // --- timers --------------------------------------------------------
        tick: function() {
            if (this.gameOver) {
                return;
            }
            const floor = this.stackFloor;
            let over = false;
            for (let i = 0; i < this.blocks.length; i++) {
                const b = this.blocks[i];
                if (b.dead) { continue; }
                b.y += this.descendSpeed;
                if (b.y + this.blockH >= floor) { over = true; }
            }
            if (over) { this.endGame(); }
        },

        spawnTick: function() {
            if (this.gameOver) {
                return;
            }
            // feed the wall: add a tile on top of the shortest column
            let best = -1, min = Infinity;
            for (let c = 0; c < this.nCols; c++) {
                const len = this.columns[c].length;
                if (len < this.maxRows && len < min) { min = len; best = c; }
            }
            if (best === -1) {
                return;
            }
            const y = this.columns[best].length ? this.columnTopY(best) - this.blockH : 4;
            this.addTile(best, this.pickQuestionIdx(), y);
            this.refreshExposed();
            this.ensureSolvable();
        },

        endGame: function() {
            this.gameOver = true;
            clearInterval(this.moveTimer);
            clearInterval(this.spawnTimer);
            this.message = {value: 'המשחק נגמר!', error: true};
            try { failureSound.play(); } catch (e) {}
        },

        restart: function() {
            this.blocks = [];
            this.columns = Array.from({length: this.nCols}, () => []);
            this.bursts = [];
            this.gameOver = false;
            this.message = {};
            this.measure();
            this.initialFill();
            this.refreshExposed();
            this.buildTargets();
            this.ensureSolvable();
            this.moveTimer = setInterval(() => this.tick(), 30);
            this.spawnTimer = setInterval(() => this.spawnTick(), 2200);
        },

        // --- layout --------------------------------------------------------
        measure: function() {
            if (!this.$refs.wlArea) {
                return;
            }
            this.areaW = this.$refs.wlArea.offsetWidth;
            this.areaH = this.$refs.wlArea.offsetHeight;
            this.colW = this.areaW / this.nCols;
            this.blockW = Math.max(48, Math.floor(this.colW)); // tiles touch -> Tetris grid
            this.blockH = 56;
            this.targetTop = this.areaH - this.blockH - 10;
            this.stackFloor = this.targetTop - 6;
            this.maxRows = 8;
            this.startBottomY = this.preRows * this.blockH;
            for (let c = 0; c < this.columns.length; c++) {
                this.columns[c].forEach(b => { b.col = c; b.left = this.colX(c); });
            }
            this.targets.forEach(t => { t.left = this.colX(t.slot); t.top = this.targetTop; });
        },

        initialFill: function() {
            for (let c = 0; c < this.nCols; c++) {
                for (let r = 0; r < this.preRows; r++) {
                    this.addTile(c, this.pickQuestionIdx(), this.startBottomY - r * this.blockH);
                }
            }
        },
    },

    mounted() {
        this.currentAppId = this.$route.params.currentAppId;
        this.currentApp = getItemById(apps, this.currentAppId);
        this.updateScore();
        if (!this.reloadProgress()) {
            return;
        }
        this.title = this.currentApp.title || 'חברו קו מהקובייה החשופה בקדמת הערימה אל התשובה למטה';
        this.list = getDataList(this.currentApp.listName);
        this.$nextTick(() => {
            this.areaW = this.$refs.wlArea.offsetWidth;
            // Narrow well -> only 1-3 questions are ever exposed at once
            this.nCols = this.areaW < 320 ? 2 : 3;
            this.columns = Array.from({length: this.nCols}, () => []);
            this.measure();
            this.initialFill();
            this.refreshExposed();
            this.buildTargets();
            this.ensureSolvable();
            this.onResize = () => this.measure();
            window.addEventListener('resize', this.onResize);
            this.moveTimer = setInterval(() => this.tick(), 30);
            this.spawnTimer = setInterval(() => this.spawnTick(), 2200);
        });
    },

    beforeDestroy() {
        this.destroyed = true;
        clearInterval(this.moveTimer);
        clearInterval(this.spawnTimer);
        if (this.onResize) {
            window.removeEventListener('resize', this.onResize);
        }
    },
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
      fail: 'block', obstacle: 'rocks', failColor: 0x6e6675, failMsg: 'המעבר חסום בסלעים! נסה דלת אחרת' },
    { title: '✨ השער הקסום — בחר במעבר הנכון', door: 0x6a4fbf, frame: 0xb39ddb, flame: 0xb388ff, light: 0xa37bff, rune: 0xc9a6ff,
      fail: 'bounce', failColor: 0xb388ff, failMsg: 'השער הקסום הדף אותך אחורה!' },
    { title: '🐉 מאורת הדרקון — רק דלת אחת בטוחה!', door: 0x9c2f2f, frame: 0x6d4c41, flame: 0xff7043, light: 0xff6633, rune: 0xff8a5c,
      fail: 'monster', creature: 'dragon', failColor: 0xff5722, eyes: 0xffd740, failMsg: 'יש כאן דרקון! עדיף לחזור' },
    { title: '❄️ מבוך הקרח — מצא את השער הנכון', door: 0x3f6fb5, frame: 0xa8d4e8, flame: 0x81d4fa, light: 0x6fc3ff, rune: 0x9fdcff,
      fail: 'block', obstacle: 'ice', failColor: 0x9fd8f5, failMsg: 'קיר קרח חוסם את הדרך!' },
    { title: '🌿 גן הסוד — איזו דלת תוביל הלאה?', door: 0x3f6f33, frame: 0x9e8f6e, flame: 0xaed581, light: 0x9ccc65, rune: 0xc5e1a5,
      fail: 'block', obstacle: 'thorns', failColor: 0x33581f, failMsg: 'קוצים סבוכים חוסמים את הדרך!' },
    { title: '🌉 גשר התהום — איזה גשר יחזיק?', layout: 'bridges', pit: 'dark', door: 0x7a6a4f, frame: 0x5d4a36, flame: 0xffb74d, light: 0xffa14d, rune: 0xffe0b2,
      fail: 'collapse', failColor: 0x8d6e63, failMsg: 'הגשר קרס! ברחת ברגע האחרון!' },
    { title: '👻 אולם הרפאים — בחר מעבר זהיר', door: 0x4a3f5c, frame: 0x6e6680, flame: 0x9fa8da, light: 0x8c9eff, rune: 0xb39ddb,
      fail: 'monster', creature: 'ghost', failColor: 0x76608a, eyes: 0xff1744, failMsg: 'רוח רפאים שומרת כאן! עדיף לחזור' },
    { title: '🌋 נהר הלבה — איזה גשר בטוח?', layout: 'bridges', pit: 'lava', door: 0x5d4037, frame: 0x4e342e, flame: 0xff8a65, light: 0xff7043, rune: 0xffab91,
      fail: 'collapse', failColor: 0x8d6e63, failMsg: 'הגשר קרס לתוך הלבה! ברחת ברגע האחרון!' },
    { title: '⛏️ המכרה הנטוש — איזו מנהרה פתוחה?', door: 0x6d5843, frame: 0x55483a, flame: 0xffcc80, light: 0xffb74d, rune: 0xd7ccc8,
      fail: 'collapse', obstacle: 'rocks', failColor: 0x5d5048, failMsg: 'המנהרה חסומה בסלעים! עדיף לחזור' },
    { title: '🏰 חצר הטירה — איזה שער פתוח?', door: 0x8c7048, frame: 0xa099a8, flame: 0xfff176, light: 0xffe082, rune: 0xfff59d,
      fail: 'monster', creature: 'orc', failColor: 0x90a4ae, eyes: 0x80d8ff, failMsg: 'שומר הטירה כאן! עדיף לחזור' },
    { title: '🪨 נהר אבני הדריכה — איזה שביל בטוח?', layout: 'stones', pit: 'water', door: 0x8a8578, frame: 0x78838f, flame: 0x90caf9, light: 0x86b8e8, rune: 0xb3d6f2,
      fail: 'collapse', failColor: 0x9aa6b0, failMsg: 'האבנים שקעו במים! ברחת בזמן!' },
    { title: '💰 חדר האוצר — איזו תיבה אמיתית?', layout: 'chests', door: 0x7a5a2e, frame: 0x9c8c6e, flame: 0xffd54f, light: 0xffca5e, rune: 0xffe082,
      fail: 'smoke', failColor: 0x4a3d52, failMsg: 'תיבה מזויפת! ענן עשן שחור!' },
    { title: '🗝️ חדר המפתחות — איזה מפתח פותח את הדלת?', layout: 'keys', door: 0x6b4f86, frame: 0x8a7f9c, flame: 0xce93d8, light: 0xb68fd6, rune: 0xd1b3e8,
      fail: 'shatter', failColor: 0xffd740, failMsg: 'המפתח הלא נכון נשבר במנעול!' },
];

// Pastel unicorn restyle of the maze scenarios, used when the unicorn theme is
// selected in the style picker: candy palettes, friendly fail effects and no
// scary creatures.
// Vivid hot-pink family matching the app navbar (unicorn theme #FF69B4 / #BA55D3):
// bright pinks, magentas and purples, coherent and lively rather than multicolor.
const MAZE_UNICORN_SCENARIOS = [
    { title: '🌈 שערי הקשת — איזו דלת מובילה לאוצר?', door: 0xff4fa0, frame: 0xd66bff, flame: 0xff8fd0, light: 0xff69b4, rune: 0xffd6f0,
      fail: 'block', obstacle: 'ice', failColor: 0xe0a8ff, failMsg: 'קיר בדולח נוצץ חוסם את הדרך! נסה דלת אחרת' },
    { title: '✨ שביל אבקת הקסם — בחר במעבר הנכון', door: 0xba55d3, frame: 0xd98fff, flame: 0xff5fd6, light: 0xc47fff, rune: 0xffd6ff,
      fail: 'bounce', failColor: 0xd98fff, failMsg: 'ענן קסם רך החזיר אותך בעדינות!' },
    { title: '🦄 גן חדי הקרן — איזו דלת תוביל הלאה?', door: 0xff69b4, frame: 0xff9ed6, flame: 0xffb3e0, light: 0xff8fc7, rune: 0xffe3f5,
      fail: 'block', obstacle: 'thorns', failColor: 0xff4fa0, failMsg: 'שיחי ורדים פורחים חוסמים את השביל!' },
    { title: '🌸 גשרי הפריחה — איזה גשר יחזיק?', layout: 'bridges', pit: 'water', door: 0xff4f97, frame: 0xff8fbf, flame: 0xff6bd6, light: 0xff69b4, rune: 0xffd6e6,
      fail: 'collapse', failColor: 0xff4f97, failMsg: 'הגשר התפרק לעלי כותרת! ברחת בזמן!' },
    { title: '🍭 ממלכת הממתקים — איזו תיבה אמיתית?', layout: 'chests', door: 0xff5fa8, frame: 0xff9ec4, flame: 0xff8fd0, light: 0xff7fb0, rune: 0xffd6e6,
      fail: 'smoke', failColor: 0xff6fb3, failMsg: 'תיבת צחוק! ענן סוכריות ורוד!' },
    { title: '☁️ נהר הקסם — איזה שביל בטוח?', layout: 'stones', pit: 'water', door: 0xc85fff, frame: 0xe0a8ff, flame: 0xff8fd0, light: 0xc47fff, rune: 0xffd6f0,
      fail: 'collapse', failColor: 0xd98fff, failMsg: 'אבני הקסם שקעו! קפצת חזרה בזמן!' },
    { title: '🗝️ חדר מפתחות הקסם — איזה מפתח פותח?', layout: 'keys', door: 0xb15fff, frame: 0xd99fff, flame: 0xff5fd6, light: 0xc47fff, rune: 0xffd6ff,
      fail: 'shatter', failColor: 0xff69b4, failMsg: 'המפתח הפך לנצנצים! נסה מפתח אחר!' },
];

// Scene atmosphere per style. 'night' is the classic look; 'unicorn' turns the
// maze into a bright, joyful candy-rainbow world with sunny sparkles.
const MAZE_ATMOSPHERES = {
    night: {
        fog: [0x0c1024, 8, 46], skyTop: 0x05070f, skyBottom: 0x232a52,
        stars: 0xcfdcff, starSize: 1.4,
        moonInner: 'rgba(235,240,255,1)', moonOuter: 'rgba(160,180,255,0)',
        hemiSky: 0x32406e, hemiGround: 0x14100c, hemiIntensity: 0.55,
        dirColor: 0x8fa6e8, dirIntensity: 0.5,
        floorTint: 0xffffff, wallTint: 0xffffff, firefly: 0xd6e88a,
        exposure: 1.1,
        scenarios: MAZE_SCENARIOS,
    },
    unicorn: {
        // Vivid hot-pink world matching the app navbar (#FF69B4 / #BA55D3)
        fog: [0xffcbe8, 22, 82], skyTop: 0xd66bff, skyBottom: 0xff69b4,
        stars: 0xffe3f5, starSize: 2.4,
        moonInner: 'rgba(255,240,250,1)', moonOuter: 'rgba(255,150,210,0)', // a bright pink sun
        hemiSky: 0xffffff, hemiGround: 0xffb3e0, hemiIntensity: 1.5,
        dirColor: 0xffffff, dirIntensity: 1.05,
        exposure: 1.4,
        // Vivid pink/magenta textures (tints stay white — the color lives in the texture)
        floorTint: 0xffffff, wallTint: 0xffffff, firefly: 0xff8fd0,
        stonePalette: {bg: '#ff69b4', shades: ['#ff8fd0', '#ba55d3', '#ff4fa0', '#d98fff']},
        cobblePalette: {bg: '#ff8fc7', shades: ['#ff69b4', '#ffa8d8', '#d66bff', '#ff5fa8']},
        woodPalette: {base: '#ff9ec4', grain: [220, 80, 150]},
        rainbow: true,
        scenarios: MAZE_UNICORN_SCENARIOS,
    },
};

function getMazeAtmosphere() {
    return getLocalStorage('theme', 'base') === 'unicorn' ? MAZE_ATMOSPHERES.unicorn : MAZE_ATMOSPHERES.night;
}

// Swappable companion characters for the maze. All are CC0/free rigged models
// from the three.js examples, served with CORS over jsDelivr so they load
// straight from a URL. `clips` maps the game's states to each model's own clip
// names; `once` lists the non-looping clips. The in-game button cycles through
// these plus the hand-built procedural figure for easy side-by-side comparison.
const HERO_MODELS = [
    {
        // Cute big-eyed chibi character (CC0 Quaternius via poly.pizza) — the
        // default companion: a plush "beanie"-style buddy that runs and hops.
        // Keys must be lowercase — actions are stored by clip.name.toLowerCase().
        name: '🧸 חמוד', height: 1.35, yawOffset: Math.PI,
        url: 'assets/models/maze/chibi.glb',
        clips: {
            idle: 'characterarmature|idle', run: 'characterarmature|run',
            flee: 'characterarmature|run', scared: 'characterarmature|hitreact',
            cheer: 'characterarmature|jump_idle',
        },
        once: [],
    },
    {
        // Cute rigged puppy (Shiba Inu, CC0 Quaternius) — gallops and hops.
        name: '🐶 כלבלב', height: 1.15, yawOffset: Math.PI,
        url: 'assets/models/maze/shiba.glb',
        clips: {
            idle: 'idle', run: 'gallop', flee: 'gallop',
            scared: 'idle_hitreact_left', cheer: 'gallop_jump',
        },
        once: [],
    },
    // A roster of cute rigged animals (CC0, Quaternius) sharing one rig, so the
    // same clip map works for all. The in-game button cycles through them.
    {
        name: '🐺 האסקי', height: 1.2, yawOffset: Math.PI, url: 'assets/models/maze/husky.glb',
        clips: {idle: 'idle', run: 'gallop', flee: 'gallop', scared: 'idle_hitreact_left', cheer: 'gallop_jump'}, once: [],
    },
    {
        name: '🦌 איל', height: 1.5, yawOffset: Math.PI, url: 'assets/models/maze/deer.glb',
        clips: {idle: 'idle', run: 'gallop', flee: 'gallop', scared: 'idle_hitreact_left', cheer: 'gallop_jump'}, once: [],
    },
    {
        name: '🦙 אלפקה', height: 1.5, yawOffset: Math.PI, url: 'assets/models/maze/alpaca.glb',
        clips: {idle: 'idle', run: 'gallop', flee: 'gallop', scared: 'idle_hitreact_left', cheer: 'gallop_jump'}, once: [],
    },
    {
        // Cute rigged bunny (CharacterArmature rig — different clip names).
        name: '🐰 ארנב', height: 1.6, yawOffset: Math.PI,
        url: 'assets/models/maze/bunny.glb',
        clips: {
            idle: 'characterarmature|idle', run: 'characterarmature|run',
            flee: 'characterarmature|run', scared: 'characterarmature|hitreact',
            cheer: 'characterarmature|jump_idle',
        },
        once: [],
    },
    {
        name: '🤖 רובוט', height: 1.5, yawOffset: Math.PI,
        url: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
        clips: { idle: 'idle', run: 'running', flee: 'running', scared: 'no', cheer: 'thumbsup' },
        once: ['jump', 'thumbsup', 'no', 'yes', 'wave', 'punch', 'death'],
    },
    {
        name: '🪖 חייל', height: 1.7, yawOffset: 0,
        url: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Soldier.glb',
        clips: { idle: 'idle', run: 'run', flee: 'run', scared: 'idle', cheer: 'walk' },
        once: [],
    },
];

// The creatures that occupy a "wrong" room. CC0 Quaternius models (downloaded
// to assets/models/maze). `idle` is the clip they stand in; `notice` plays once
// when the player walks in and spots them. `yaw` orients them toward the door.
const CREATURE_MODELS = {
    dragon:  { url: 'assets/models/maze/dragon.glb',  height: 2.6, yaw: 0, y: 0.5, idle: 'flying_idle', notice: 'headbutt' },
    orc:     { url: 'assets/models/maze/orc.glb',     height: 2.1, yaw: 0, y: 0,   idle: 'idle',        notice: 'wave' },
    ghost:   { url: 'assets/models/maze/ghost.glb',   height: 2.0, yaw: 0, y: 0.5, idle: 'flying_idle', notice: 'headbutt' },
};

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
                <a @click="cycleHero" :style="{position:'absolute', left:'10px', bottom:'10px', zIndex:5,
                       background:'rgba(20,16,30,0.72)', color:'#fff', padding:'6px 12px',
                       borderRadius:'18px', cursor:'pointer', fontSize:'14px', userSelect:'none'}">
                    🔁 דמות: {{ heroName }}</a>
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
            heroName: 'טוען…',
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

        makeWoodTexture: function(palette) {
            const base = (palette && palette.base) || '#9a7950';
            const grain = (palette && palette.grain) || [60, 35, 15];
            return this.makeCanvasTexture(256, (ctx, s) => {
                ctx.fillStyle = base;
                ctx.fillRect(0, 0, s, s);
                for (let i = 0; i < 40; i++) {
                    ctx.strokeStyle = `rgba(${grain[0] + Math.random() * 40}, ${grain[1] + Math.random() * 25}, ${grain[2]}, ${0.25 + Math.random() * 0.3})`;
                    ctx.lineWidth = 1 + Math.random() * 2.5;
                    const y = Math.random() * s;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.bezierCurveTo(s * 0.3, y + (Math.random() - 0.5) * 14, s * 0.7, y + (Math.random() - 0.5) * 14, s, y);
                    ctx.stroke();
                }
            });
        },

        makeStoneTexture: function(palette) {
            const bg = (palette && palette.bg) || '#36323d';
            const shades = (palette && palette.shades) || ['#55505c', '#4a4550', '#5d5866', '#48434e'];
            return this.makeCanvasTexture(256, (ctx, s) => {
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, s, s);
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

        makeRainbowTexture: function() {
            return this.makeCanvasTexture(512, (ctx, s) => {
                // Vivid, thick bands so the arc reads as a real rainbow at distance
                const colors = ['#ff3d7f', '#ff9f2e', '#ffe02e', '#3dd67a', '#2f9fff', '#b15fff'];
                const band = s * 0.05;
                const cy = s * 0.98;                 // arc centre near the bottom edge
                ctx.lineWidth = band;
                ctx.lineCap = 'butt';
                ctx.globalAlpha = 1;
                colors.forEach((color, i) => {
                    ctx.strokeStyle = color;
                    ctx.beginPath();
                    ctx.arc(s / 2, cy, s * 0.82 - i * band, Math.PI, 2 * Math.PI);
                    ctx.stroke();
                });
                // Fade the leg ends downward so the arch dissolves into the sky
                // instead of ending in a hard horizontal cut.
                ctx.globalCompositeOperation = 'destination-out';
                const fade = ctx.createLinearGradient(0, s * 0.45, 0, s * 0.9);
                fade.addColorStop(0, 'rgba(0,0,0,0)');
                fade.addColorStop(1, 'rgba(0,0,0,1)');
                ctx.fillStyle = fade;
                ctx.fillRect(0, 0, s, s);
                ctx.globalCompositeOperation = 'source-over';
            });
        },

        makeCobbleTexture: function(palette) {
            const bg = (palette && palette.bg) || '#26242c';
            const shades = (palette && palette.shades) || ['#3a3741', '#433f4a', '#36333d', '#3e3a45'];
            return this.makeCanvasTexture(256, (ctx, s) => {
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, s, s);
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
            // Style-driven atmosphere: classic night, or pastel dawn on the unicorn theme
            const atmo = g.atmo = getMazeAtmosphere();
            g.scene.fog = new THREE.Fog(atmo.fog[0], atmo.fog[1], atmo.fog[2]);

            g.camera = new THREE.PerspectiveCamera(70, area.clientWidth / area.clientHeight, 0.1, 300);
            g.camera.position.set(0, 1.6, 5);
            g.camera.rotation.order = 'YXZ';
            g.scene.add(g.camera);

            g.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
            g.renderer.setSize(area.clientWidth, area.clientHeight);
            g.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isTouch ? 1.5 : 2));
            g.renderer.outputEncoding = THREE.sRGBEncoding;
            g.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            g.renderer.toneMappingExposure = atmo.exposure;
            area.insertBefore(g.renderer.domElement, area.firstChild);

            // Night sky dome
            const sky = new THREE.Mesh(
                new THREE.SphereGeometry(220, 32, 16),
                new THREE.ShaderMaterial({
                    side: THREE.BackSide,
                    depthWrite: false,
                    uniforms: {
                        top: { value: new THREE.Color(atmo.skyTop) },
                        bottom: { value: new THREE.Color(atmo.skyBottom) },
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
                color: atmo.stars, size: atmo.starSize, sizeAttenuation: false,
                transparent: true, opacity: 0.9,
            }));
            g.scene.add(g.stars);

            // Moon
            const moon = new THREE.Sprite(new THREE.SpriteMaterial({
                map: this.makeRadialTexture(atmo.moonInner, atmo.moonOuter),
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            }));
            moon.scale.set(34, 34, 1);
            moon.position.set(-55, 75, -130);
            g.scene.add(moon);

            // A big bright rainbow arc on the horizon (unicorn style only).
            // fog:false is essential — it sits far beyond the fog plane, so with
            // fog on it would be washed to a flat pink dome.
            if (atmo.rainbow) {
                const rainbow = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: this.makeRainbowTexture(),
                    transparent: true, opacity: 0.95, depthWrite: false, fog: false,
                }));
                rainbow.scale.set(150, 150, 1);
                rainbow.position.set(0, 52, -140);
                g.scene.add(rainbow);
            }

            // Lights: cold moonlight + warm torches (added per gate)
            g.scene.add(new THREE.HemisphereLight(atmo.hemiSky, atmo.hemiGround, atmo.hemiIntensity));
            const moonLight = new THREE.DirectionalLight(atmo.dirColor, atmo.dirIntensity);
            moonLight.position.set(-12, 22, 8);
            g.scene.add(moonLight);

            // Cobblestone floor
            const cobbleTex = this.makeCobbleTexture(atmo.cobblePalette);
            cobbleTex.wrapS = cobbleTex.wrapT = THREE.RepeatWrapping;
            cobbleTex.repeat.set(14, 14);
            cobbleTex.anisotropy = g.renderer.capabilities.getMaxAnisotropy();
            const floor = new THREE.Mesh(
                new THREE.PlaneGeometry(80, 80),
                new THREE.MeshStandardMaterial({ map: cobbleTex, color: atmo.floorTint, roughness: 1, metalness: 0 })
            );
            floor.rotation.x = -Math.PI / 2;
            g.scene.add(floor);

            // Shared resources for building chambers
            g.stoneTex = this.makeStoneTexture(atmo.stonePalette);
            g.stoneTex.wrapS = g.stoneTex.wrapT = THREE.RepeatWrapping;
            g.woodTex = this.makeWoodTexture(atmo.woodPalette);
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
                color: atmo.firefly, size: 0.09, transparent: true, opacity: 0.85,
                blending: THREE.AdditiveBlending, depthWrite: false,
            }));
            g.scene.add(g.fireflies);

            // The little adventurer that runs ahead of the player (Temple-Run
            // style). It lives in world space so it carries across chambers.
            this.buildHero();
            // Start on the first rigged model; the in-game button cycles to the
            // others (and to the procedural figure). If loading fails, the
            // procedural figure stays as the fallback.
            g.heroIndex = 0;
            this.loadHeroModel(0);
            // Preload the wrong-room creatures so they're ready the instant a
            // wrong door is opened (only one is ever shown at a time).
            this.loadCreatures();
        },

        // Preloads every creature once into a cache. Since only one trap room
        // exists at a time we can reuse the single instance, no cloning needed.
        loadCreatures: function() {
            const g = this._g;
            g.creatures = {};
            if (typeof THREE.GLTFLoader === 'undefined' || typeof THREE.AnimationMixer === 'undefined') return;
            const loader = new THREE.GLTFLoader();
            Object.keys(CREATURE_MODELS).forEach(key => {
                const spec = CREATURE_MODELS[key];
                loader.load(spec.url, gltf => {
                    if (!this._g || this._g !== g) return;
                    const scene = gltf.scene;
                    scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
                    let box = new THREE.Box3().setFromObject(scene);
                    const size = new THREE.Vector3(); box.getSize(size);
                    scene.scale.setScalar(spec.height / (size.y || 1));
                    box = new THREE.Box3().setFromObject(scene);
                    scene.position.y -= box.min.y;                     // feet on floor
                    scene.position.x -= (box.min.x + box.max.x) / 2;   // centered
                    scene.position.z -= (box.min.z + box.max.z) / 2;
                    const pivot = new THREE.Group();
                    pivot.add(scene);
                    const mixer = new THREE.AnimationMixer(scene);
                    const actions = {};
                    gltf.animations.forEach(clip => {
                        actions[clip.name.split('|').pop().toLowerCase()] = mixer.clipAction(clip);
                    });
                    g.creatures[key] = { pivot: pivot, mixer: mixer, actions: actions, spec: spec, current: null, inUse: false };
                }, undefined, err => { console.warn('Maze creature failed to load: ' + key, err); });
            });
        },

        // Places a cached creature in the room, standing in its idle clip
        attachCreature: function(room, key) {
            const g = this._g;
            const c = g.creatures && g.creatures[key];
            if (!c || c.inUse) return null;
            c.inUse = true;
            c.pivot.position.set(0, c.spec.y, 1.6);   // a bit inside the room, facing the door
            c.pivot.rotation.y = c.spec.yaw;
            room.group.add(c.pivot);
            this.playCreatureClip(c, c.spec.idle, true);
            return c;
        },

        playCreatureClip: function(c, name, loop) {
            name = (name || '').toLowerCase();
            let action = c.actions[name] || c.actions['idle'] || c.actions[Object.keys(c.actions)[0]];
            if (!action || c.current === action) return;
            if (c.current) c.current.fadeOut(0.25);
            action.reset();
            action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
            action.clampWhenFinished = !loop;
            action.fadeIn(0.25).play();
            c.current = action;
        },

        // A low-poly explorer companion. Built facing -Z (into the maze), so by
        // default the player sees its back as it leads the way. Limbs hang from
        // shoulder/hip pivots so they can swing for a run cycle.
        buildHero: function() {
            const g = this._g;
            const hero = new THREE.Group();
            const mats = {
                skin:  new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: 0.8 }),
                coat:  new THREE.MeshStandardMaterial({ color: 0x3f8f5a, roughness: 0.7 }),
                pants: new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.85 }),
                hat:   new THREE.MeshStandardMaterial({ color: 0x7a5a32, roughness: 0.8 }),
                pack:  new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.85 }),
                dark:  new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.9 }),
            };
            g.heroDisposables = Object.keys(mats).map(k => mats[k]);

            const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.26), mats.coat);
            torso.position.y = 0.87;
            hero.add(torso);
            const belt = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.28), mats.dark);
            belt.position.y = 0.62;
            hero.add(belt);
            // Backpack on the back (+Z, since the figure faces -Z)
            const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.18), mats.pack);
            pack.position.set(0, 0.9, 0.2);
            hero.add(pack);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.32), mats.skin);
            head.position.y = 1.29;
            hero.add(head);
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 14), mats.hat);
            brim.position.y = 1.47;
            hero.add(brim);
            const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.26, 14), mats.hat);
            cap.position.y = 1.61;
            hero.add(cap);
            // Eyes on the -Z face so the front is readable when it turns to flee
            for (const ex of [-0.08, 0.08]) {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), mats.dark);
                eye.position.set(ex, 1.31, -0.16);
                hero.add(eye);
            }

            const makeLimb = (w, h, d, mat) => {
                const pivot = new THREE.Group();
                const limb = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
                limb.position.y = -h / 2;     // hangs below the pivot point
                pivot.add(limb);
                hero.add(pivot);
                return pivot;
            };
            const armL = makeLimb(0.12, 0.42, 0.14, mats.coat);  armL.position.set(-0.28, 1.06, 0);
            const armR = makeLimb(0.12, 0.42, 0.14, mats.coat);  armR.position.set( 0.28, 1.06, 0);
            const legL = makeLimb(0.15, 0.6, 0.16, mats.pants);  legL.position.set(-0.11, 0.62, 0);
            const legR = makeLimb(0.15, 0.6, 0.16, mats.pants);  legR.position.set( 0.11, 0.62, 0);

            hero.scale.setScalar(0.85);
            hero.position.set(0, 0, 2.3);
            g.scene.add(hero);

            g.hero = {
                group: hero, head: head, armL: armL, armR: armR, legL: legL, legR: legR,
                phase: 0, yaw: 0, prevMode: 'idle',
                armLX: 0.12, armRX: 0.12, legLX: 0, legRX: 0, bodyPitch: 0,
            };
        },

        // Drives the companion every frame from the current game mode: it runs
        // ahead through the chosen door, recoils when a trap springs, sprints
        // back when it fails, points at doors while idle, cheers on success.
        updateHero: function(dt, t) {
            const g = this._g;
            const h = g.hero;
            if (!h) return;
            const cam = g.camera.position;
            const mode = g.mode;
            const gate = g.walkGate;

            // Target world position, heading and pose archetype for this mode
            let tx = cam.x, tz = cam.z - 2.7;
            let faceX = 0, faceZ = -1;
            let state = 'idle';
            let snap = false;

            if (mode === 'idle' || mode === 'keyFly') {
                const hov = (g.hovered && g.hovered.active) ? g.hovered.baseX : 0;
                tx = cam.x + hov * 0.18;
            } else if (mode === 'opening') {
                state = 'cheer';
                tx = cam.x + (gate ? gate.baseX * 0.3 : 0);
            } else if (mode === 'walk' || mode === 'failWalk') {
                state = 'run';
                const bx = gate ? gate.baseX : cam.x;
                tx = cam.x + (bx - cam.x) * 0.6;
                tz = cam.z - (mode === 'walk' ? 2.9 : 2.4);
                faceX = (bx - h.group.position.x) * 0.5;
            } else if (mode === 'failEvent') {
                state = 'scared';
                tx = cam.x;
                tz = cam.z - 1.7;
            } else if (mode === 'failReturn') {
                state = 'flee';
                tx = cam.x;
                tz = cam.z - 1.9;
                faceZ = 1;                 // turned around, sprinting toward us
            } else if (mode === 'chestFail' || mode === 'keyFail') {
                state = 'scared';
            }

            // Snap to rest the frame a chamber rebases (avoids a long slide)
            if (mode === 'idle' && (h.prevMode === 'walk' || h.prevMode === 'failReturn')) snap = true;
            h.prevMode = mode;

            const moveK = snap ? 1 : Math.min(1, dt * (state === 'idle' || state === 'cheer' ? 6 : 12));
            h.group.position.x += (tx - h.group.position.x) * moveK;
            h.group.position.z += (tz - h.group.position.z) * moveK;

            // Pose targets
            let tArmL = 0.12, tArmR = 0.12, tLegL = 0, tLegR = 0, tPitch = 0, tremble = 0, bob = 0;
            if (state === 'run' || state === 'flee') {
                h.phase += dt * (state === 'flee' ? 17 : 14);
                const sw = Math.sin(h.phase);
                tLegL = sw; tLegR = -sw;
                tArmL = -sw * 0.85; tArmR = sw * 0.85;
                tPitch = state === 'flee' ? 0.04 : 0.16;
                bob = Math.abs(sw) * 0.07;
                if (state === 'flee') { tArmL -= 0.6; tArmR -= 0.6; }
            } else if (state === 'scared') {
                h.phase += dt * 30;
                tArmL = -2.2; tArmR = -2.2;
                tLegL = 0.2; tLegR = -0.2;
                tPitch = -0.18;
                tremble = Math.sin(h.phase) * 0.05;
            } else if (state === 'cheer') {
                tArmL = -2.4; tArmR = -2.4;
                bob = Math.abs(Math.sin(t * 9)) * 0.12;
            } else {
                const breathe = Math.sin(t * 1.6) * 0.05;
                tArmL = 0.12 + breathe; tArmR = 0.12 - breathe;
                bob = Math.sin(t * 1.5) * 0.02;
                if (mode === 'idle' && g.hovered && g.hovered.active) {
                    if (g.hovered.baseX > h.group.position.x) tArmR = -1.3; else tArmL = -1.3;
                } else if (mode === 'keyFly') {
                    tArmR = -1.5;          // gesture toward the flying key
                }
            }

            h.group.position.y = bob;

            const poseK = Math.min(1, dt * 12);
            h.armLX += (tArmL - h.armLX) * poseK;  h.armL.rotation.x = h.armLX + tremble;
            h.armRX += (tArmR - h.armRX) * poseK;  h.armR.rotation.x = h.armRX - tremble;
            h.legLX += (tLegL - h.legLX) * poseK;  h.legL.rotation.x = h.legLX;
            h.legRX += (tLegR - h.legRX) * poseK;  h.legR.rotation.x = h.legRX;
            h.bodyPitch += (tPitch - h.bodyPitch) * poseK;

            // Smoothly face the heading direction (shortest way around)
            const targetYaw = Math.atan2(-faceX, -faceZ);
            let dyaw = targetYaw - h.yaw;
            while (dyaw > Math.PI) dyaw -= Math.PI * 2;
            while (dyaw < -Math.PI) dyaw += Math.PI * 2;
            h.yaw += dyaw * (snap ? 1 : Math.min(1, dt * 8));
            h.group.rotation.y = h.yaw;
            h.group.rotation.x = h.bodyPitch;

            // If a rigged model loaded, it follows the same transform and plays
            // a baked clip per state; otherwise the procedural limbs above show.
            const m = h.model;
            if (m) {
                m.group.position.copy(h.group.position);
                m.group.rotation.set(0, h.yaw + m.yawOffset, 0);
                this.setHeroClip(state, m);
                m.mixer.update(dt);
                return;
            }

            // Idle glance around (procedural figure only)
            h.head.rotation.y = state === 'idle' ? Math.sin(t * 0.7) * 0.3 : 0;
        },

        // Tap the in-game button to cycle: each rigged model in turn, then the
        // hand-built procedural figure, then back around — easy to compare live.
        cycleHero: function() {
            const g = this._g;
            if (!g || !g.hero) return;
            g.heroIndex = ((g.heroIndex == null ? 0 : g.heroIndex) + 1) % (HERO_MODELS.length + 1);
            if (g.heroIndex === HERO_MODELS.length) {
                this.disposeHeroModel();
                g.hero.group.visible = true;
                this.heroName = '🧍 פרוצדורלי';
            } else {
                this.loadHeroModel(g.heroIndex);
            }
        },

        disposeHeroModel: function() {
            const g = this._g;
            const m = g && g.hero && g.hero.model;
            if (!m) return;
            m.mixer.stopAllAction();
            g.scene.remove(m.group);
            m.group.traverse(o => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) [].concat(o.material).forEach(mat => mat.dispose());
            });
            g.hero.model = null;
        },

        // Loads rigged character HERO_MODELS[index] with its baked animation
        // clips. On any failure (no loader, offline, CORS) the procedural
        // companion simply stays.
        loadHeroModel: function(index) {
            const g = this._g;
            const spec = HERO_MODELS[index];
            if (!spec) return;
            if (typeof THREE.GLTFLoader === 'undefined' || typeof THREE.AnimationMixer === 'undefined') {
                g.hero.group.visible = true;
                this.heroName = '🧍 פרוצדורלי';
                return;
            }
            this.heroName = 'טוען ' + spec.name + '…';
            new THREE.GLTFLoader().load(spec.url, gltf => {
                if (!this._g || this._g !== g || !g.hero || g.heroIndex !== index) return;
                this.disposeHeroModel();                 // drop the previous model
                const model = gltf.scene;
                // Skinned meshes can vanish when their precomputed bounds fall
                // outside the view as they animate — turn off frustum culling.
                model.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
                // Normalize: target height, feet on the floor, centered
                let box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3(); box.getSize(size);
                model.scale.setScalar(spec.height / (size.y || 1));
                box = new THREE.Box3().setFromObject(model);
                model.position.y -= box.min.y;
                model.position.x -= (box.min.x + box.max.x) / 2;
                model.position.z -= (box.min.z + box.max.z) / 2;

                const root = new THREE.Group();
                root.add(model);
                g.scene.add(root);

                const mixer = new THREE.AnimationMixer(model);
                const actions = {};
                gltf.animations.forEach(clip => { actions[clip.name.toLowerCase()] = mixer.clipAction(clip); });

                g.hero.group.visible = false;            // hide the procedural fallback
                g.hero.model = {
                    scene: model, group: root, mixer: mixer, actions: actions, current: null,
                    yawOffset: spec.yawOffset, clips: spec.clips, once: spec.once,
                };
                this.heroName = spec.name;
            }, undefined, err => {
                console.warn('Maze hero model failed to load — using the procedural companion.', err);
                if (this._g === g && g.hero && !g.hero.model) {
                    g.hero.group.visible = true;
                    this.heroName = '🧍 פרוצדורלי';
                }
            });
        },

        // Crossfades the model to the clip that matches the current state
        setHeroClip: function(state, m) {
            let name = (m.clips && m.clips[state]) || 'idle';
            if (!m.actions[name]) name = m.actions['idle'] ? 'idle' : Object.keys(m.actions)[0];
            if (!name || !m.actions[name]) return;
            const action = m.actions[name];
            const speed = state === 'flee' ? 1.5 : (state === 'run' ? 1.25 : 1);
            if (m.current === name) { action.timeScale = speed; return; }
            const prev = m.current && m.actions[m.current];
            const loopOnce = m.once && m.once.indexOf(name) >= 0;
            action.reset();
            action.timeScale = speed;
            action.setLoop(loopOnce ? THREE.LoopOnce : THREE.LoopRepeat);
            action.clampWhenFinished = !!loopOnce;
            action.fadeIn(0.2).play();
            if (prev) prev.fadeOut(0.2);
            m.current = name;
        },

        buildChamber: function(ox, oz) {
            const g = this._g;
            const scenarioPool = g.atmo.scenarios;
            let scenario;
            do {
                scenario = scenarioPool[Math.floor(Math.random() * scenarioPool.length)];
            } while (scenarioPool.length > 1 && scenario === g.lastScenario);
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
                const mat = new THREE.MeshStandardMaterial({ map: tex, color: g.atmo.wallTint, roughness: 0.95 });
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
            const skin = new THREE.MeshStandardMaterial({ color: 0x161020, roughness: 0.92 });
            const horn = new THREE.MeshStandardMaterial({ color: 0x2c2433, roughness: 0.8 });
            const bone = new THREE.MeshStandardMaterial({ color: 0xeae0d0, roughness: 0.5 });
            monster.userData.disposables = [skin, horn, bone];

            // Hulking body + head
            const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 18, 14), skin);
            body.scale.set(1.35, 1.6, 0.95);
            body.position.y = 1.55;
            monster.add(body);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 14), skin);
            head.scale.set(1.1, 1.0, 1.0);
            head.position.set(0, 2.95, 0.1);
            monster.add(head);

            // Horns
            for (const hx of [-0.46, 0.46]) {
                const h = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.72, 10), horn);
                h.position.set(hx, 3.55, 0.05);
                h.rotation.z = hx > 0 ? -0.35 : 0.35;
                monster.add(h);
            }

            // Big glowing eyes
            for (const ex of [-0.3, 0.3]) {
                const eye = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: g.flameTex, color: s.eyes || 0xff3b30,
                    blending: THREE.AdditiveBlending, depthWrite: false,
                }));
                eye.scale.set(0.52, 0.62, 1);
                eye.position.set(ex, 3.02, 0.72);
                monster.add(eye);
            }

            // Fanged grin
            for (let i = -2; i <= 2; i++) {
                const fang = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 6), bone);
                fang.position.set(i * 0.16, 2.6, 0.64);
                fang.rotation.x = Math.PI;
                monster.add(fang);
            }

            // Clawed arms raised to strike
            for (const ax of [-1.2, 1.2]) {
                const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 1.55, 10), skin);
                arm.position.set(ax, 1.95, 0.35);
                arm.rotation.z = ax > 0 ? 0.7 : -0.7;
                arm.rotation.x = -0.5;
                monster.add(arm);
                for (let c = -1; c <= 1; c++) {
                    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 6), bone);
                    claw.position.set(ax + (ax > 0 ? 0.58 : -0.58), 2.62, 0.6 + c * 0.13);
                    claw.rotation.x = -1.2;
                    monster.add(claw);
                }
            }
            return monster;
        },

        // A real room built behind a wrong door — and deliberately built to look
        // like any other chamber (same stone, warm torchlight, a treasure glow
        // teasing further on) so you can't tell it's wrong until you step in and
        // see what's inside. Only one ever exists (it is torn down when you
        // flee), so it can be nearly the size of a normal chamber.
        buildTrapRoom: function(gate) {
            const g = this._g;
            const s = gate.chamber.scenario;
            const group = new THREE.Group();
            group.position.set(gate.baseX, 0, -13.3);
            const room = { group: group, disposables: [], monster: null, creature: null };
            const H = 5;                 // matches a normal chamber's wall height
            const W = 12, D = 11, midZ = 7 - D / 2;   // entrance plane at local z = 7
            const open = 1.15;           // half-width of the doorway

            const addWall = (w, h, x, y, z, rotY) => {
                const tex = g.stoneTex.clone();
                tex.needsUpdate = true;
                tex.repeat.set(Math.max(1, w / 3.5), Math.max(1, h / 3.5));
                const mat = new THREE.MeshStandardMaterial({ map: tex, color: g.atmo.wallTint, roughness: 0.95 });
                room.disposables.push(tex, mat);
                const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), mat);
                wall.position.set(x, y, z);
                if (rotY) wall.rotation.y = rotY;
                group.add(wall);
            };

            // Front wall with the doorway opening (aligned to the gate), wide
            // side walls and a far wall — open to the night sky like a real room.
            addWall(W / 2 - open, H, -(W / 2 + open) / 2, H / 2, 7);
            addWall(W / 2 - open, H, (W / 2 + open) / 2, H / 2, 7);
            addWall(2.6, 2, 0, 4, 7);                  // lintel over the doorway
            addWall(W, H, 0, H / 2, 7 - D);            // far wall
            addWall(D, H, -W / 2, H / 2, midZ, Math.PI / 2);
            addWall(D, H, W / 2, H / 2, midZ, Math.PI / 2);

            // Warm torchlight, just like a normal chamber — no give-away tint
            const lamp = new THREE.PointLight(s.light, 1.3, 26, 2);
            lamp.position.set(0, H - 0.6, midZ + 1);
            group.add(lamp);
            for (const lx of [-W / 3, W / 3]) {
                const side = new THREE.PointLight(s.light, 0.6, 16, 2);
                side.position.set(lx, H - 1.2, 4.2);
                group.add(side);
            }
            // A treasure glow on the far wall, teasing a way forward (the bait)
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: g.flameTex, color: 0xffd27f,
                blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4,
            }));
            glow.scale.set(3, 3, 1);
            glow.position.set(0, 1.6, 7 - D + 0.5);
            room.disposables.push(glow.material);
            group.add(glow);

            if (s.fail === 'monster') {
                // A creature is already standing there in plain sight
                room.creatureKey = s.creature;
                const c = s.creature && this.attachCreature(room, s.creature);
                if (c) {
                    room.creature = c;
                } else {
                    // Model not downloaded yet: show the procedural beast for now;
                    // animate() swaps in the real model the instant it's ready.
                    room.monster = this.makeMonster(s);
                    room.monster.position.set(0, 0, 1.6);
                    room.disposables.push.apply(room.disposables, room.monster.userData.disposables || []);
                    group.add(room.monster);
                }
            } else if (s.fail === 'bounce') {
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(1.1, 1.6, 48),
                    new THREE.MeshBasicMaterial({
                        color: s.failColor, transparent: true, opacity: 0.55,
                        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
                    })
                );
                ring.rotation.x = -Math.PI / 2;
                ring.position.set(0, 0.06, 1.6);
                const pillar = new THREE.Mesh(
                    new THREE.CylinderGeometry(1.0, 1.25, H, 24, 1, true),
                    new THREE.MeshBasicMaterial({
                        color: s.failColor, transparent: true, opacity: 0.16,
                        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
                    })
                );
                pillar.position.set(0, H / 2, 1.6);
                room.disposables.push(ring.material, pillar.material);
                group.add(ring, pillar);
            } else {
                // 'block' / 'collapse' — a clearly themed obstacle (rocks / ice /
                // thorns) already filling the back of the room and barring the way
                this.buildObstacle(room, s.obstacle || 'rocks', s.failColor);
            }

            g.scene.add(group);
            g.trapRooms.push(room);
            return room;
        },

        // A realistic, themed pile that blocks the room — visible the moment you
        // walk in, so you simply see it and turn back.
        buildObstacle: function(room, kind, color) {
            const group = new THREE.Group();
            const disp = [];
            if (kind === 'ice') {
                const ice = new THREE.MeshStandardMaterial({
                    color: 0xbfe6ff, roughness: 0.15, metalness: 0.1,
                    transparent: true, opacity: 0.78, emissive: 0x244a66, emissiveIntensity: 0.5,
                });
                disp.push(ice);
                for (let i = 0; i < 14; i++) {
                    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.35 + Math.random() * 0.35, 1.6 + Math.random() * 2.2, 5), ice);
                    shard.position.set((Math.random() - 0.5) * 5.5, (1.0 + Math.random() * 1.2) / 2, -2 + Math.random() * 2.4);
                    shard.scale.y = 1 + Math.random();
                    shard.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 3, (Math.random() - 0.5) * 0.5);
                    group.add(shard);
                }
            } else if (kind === 'thorns') {
                const bark = new THREE.MeshStandardMaterial({ color: 0x2f3d22, roughness: 0.95 });
                const leaf = new THREE.MeshStandardMaterial({ color: color || 0x3f6f33, roughness: 0.9 });
                disp.push(bark, leaf);
                for (let i = 0; i < 22; i++) {
                    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 1.8 + Math.random() * 2.4, 6), bark);
                    vine.position.set((Math.random() - 0.5) * 6, 1.2 + Math.random() * 1.4, -2 + Math.random() * 2.6);
                    vine.rotation.set((Math.random() - 0.5) * 1.6, Math.random() * 3, (Math.random() - 0.5) * 1.6);
                    group.add(vine);
                    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 5), leaf);
                    spike.position.copy(vine.position);
                    spike.position.y += 0.3;
                    spike.rotation.copy(vine.rotation);
                    group.add(spike);
                }
            } else {
                // rocks / cave-in
                const rock = new THREE.MeshStandardMaterial({ color: color || 0x6e6675, roughness: 0.95, flatShading: true });
                const rock2 = new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: 1, flatShading: true });
                disp.push(rock, rock2);
                for (let i = 0; i < 20; i++) {
                    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.8, 0), i % 3 ? rock : rock2);
                    b.position.set((Math.random() - 0.5) * 6.5, 0.2 + Math.random() * 2.8, -2.2 + Math.random() * 2.6);
                    b.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
                    b.scale.y = 0.75 + Math.random() * 0.4;
                    group.add(b);
                }
            }
            room.disposables.push.apply(room.disposables, disp);
            room.group.add(group);
            return group;
        },

        disposeTrapRooms: function() {
            const g = this._g;
            g.trapRooms.forEach(room => {
                if (room.creature) {
                    if (room.creature.current) room.creature.current.stop();
                    room.creature.current = null;
                    room.group.remove(room.creature.pivot);
                    room.creature.inUse = false;
                }
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

        // The player has walked in and now sees what's inside. This is calm by
        // design — no jump-scare: you simply realize it's the wrong room and
        // turn back. Crossings (bridges) still give way, as that's their nature.
        triggerTrap: function(gate) {
            const g = this._g;
            const s = gate.chamber.scenario;
            failureSound.play();
            this.message = { value: s.failMsg, error: true };

            if (this.isCrossing(s)) {
                this.collapseCrossing(gate);
                g.camShake = 0.6;
                return;
            }
            // A small startle only, and a calm "notice" from the creature if any
            g.camShake = 0.2;
            const room = gate.trapRoom;
            if (room && room.creature) {
                this.playCreatureClip(room.creature, room.creature.spec.notice, false);
            }
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
            // Use questionItem (with questionType applied) so a 'speech'/'text_to_speech'
            // override — e.g. reading a letter aloud — is spoken automatically.
            const action = generateQuestion(questionItem);
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
                g.camera.position.set(gate.baseX * ex, 1.6, 5 - (crossing ? 8.4 : 14.6) * e);
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
                // A beat to take in the room and what's in it, then we leave
                g.modeDelay -= dt;
                if (this.isCrossing(g.walkGate.chamber.scenario)) {
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
                // Walk calmly back out to the chamber.
                g.walkT = Math.min(1, g.walkT + dt / 0.7);
                const e = 1 - Math.pow(1 - g.walkT, 2);  // ease-out
                g.camera.position.lerpVectors(g.returnFrom, new THREE.Vector3(0, 1.6, 5), e);
                g.yaw = g.returnYaw * (1 - e);
                g.pitch = g.returnPitch * (1 - e);
                if (g.walkT >= 1) {
                    const gate = g.walkGate;
                    gate.active = false;
                    this.refreshPickMeshes();
                    gate.shake = 0.4;
                    g.camShake = 0;
                    // Shut the dead-end door behind us and tear the room down, so
                    // only ever one (big) trap room exists at a time.
                    gate.openTarget = 0;
                    if (gate.back) gate.back.visible = true;
                    if (gate.trapRoom) { gate.trapRoom = null; this.disposeTrapRooms(); }
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

            this.updateHero(dt, t);
            // If a creature finished downloading after its room was built, swap
            // it in now (replacing the temporary procedural stand-in).
            if (g.creatures && g.trapRooms.length) {
                g.trapRooms.forEach(room => {
                    if (!room.creature && room.creatureKey && g.creatures[room.creatureKey] &&
                        !g.creatures[room.creatureKey].inUse) {
                        const c = this.attachCreature(room, room.creatureKey);
                        if (c) {
                            room.creature = c;
                            if (room.monster) { room.group.remove(room.monster); room.monster = null; }
                        }
                    }
                });
            }
            // Advance the animation of whichever creature is currently on show
            if (g.creatures) {
                for (const k in g.creatures) {
                    if (g.creatures[k].inUse) g.creatures[k].mixer.update(dt);
                }
            }
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
            if (this._g.hero) {
                this.disposeHeroModel();
                this._g.hero.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
                (this._g.heroDisposables || []).forEach(m => m.dispose());
            }
            if (this._g.creatures) {
                for (const k in this._g.creatures) {
                    const c = this._g.creatures[k];
                    c.mixer.stopAllAction();
                    c.pivot.traverse(o => {
                        if (o.geometry) o.geometry.dispose();
                        if (o.material) [].concat(o.material).forEach(mat => mat.dispose());
                    });
                }
            }
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
            <div class="platformer-dpad">
                <button class="platformer-btn platformer-down"
                        @touchstart.prevent="touch.down = true" @touchend.prevent="touch.down = false"
                        @touchcancel="touch.down = false"
                        @mousedown="touch.down = true" @mouseup="touch.down = false"
                        @mouseleave="touch.down = false">⬇</button>
                <button class="platformer-btn platformer-jump"
                        @touchstart.prevent="touch.up = true" @touchend.prevent="touch.up = false"
                        @touchcancel="touch.up = false"
                        @mousedown="touch.up = true" @mouseup="touch.up = false"
                        @mouseleave="touch.up = false">⬆</button>
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
            list: [],
            game: null,
            touch: {left: false, right: false, up: false, down: false},
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
            const UNDER = 320, CLIMB = 230; // underground depth + tree-climb speed

            // All "answer cube" obstacles now share the Mario question-block look.
            const BLOCK_TEXTURES = {river: 'pf_qblock', clouds: 'pf_qblock', dragon: 'pf_qblock'};

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

                // Mario-style question cube: beveled 3D box you bonk from below.
                const QW = 128, QH = 100;
                g.fillStyle(0x7a4a12); g.fillRect(0, 0, QW, QH);               // dark outline
                g.fillStyle(0xc9821f); g.fillRect(4, 4, QW - 8, QH - 8);       // body
                g.fillStyle(0xe2a534); g.fillRect(4, 4, QW - 8, 12);          // lit top bevel
                g.fillStyle(0xe2a534); g.fillRect(4, 4, 12, QH - 8);          // lit left bevel
                g.fillStyle(0x9c5f14); g.fillRect(4, QH - 16, QW - 8, 12);    // shaded bottom bevel
                g.fillStyle(0x9c5f14); g.fillRect(QW - 16, 4, 12, QH - 8);    // shaded right bevel
                g.fillStyle(0xffe9b0);                                          // corner rivets
                [[12, 12], [QW - 12, 12], [12, QH - 12], [QW - 12, QH - 12]].forEach(p => g.fillCircle(p[0], p[1], 4));
                g.generateTexture('pf_qblock', QW, QH); g.clear();

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

                // Trampoline: a stretchy red mat on a dark frame with two legs
                const TW = 130, TH = 48;
                g.fillStyle(0x37474f); g.fillRect(14, 22, 11, TH - 22); g.fillRect(TW - 25, 22, 11, TH - 22); // legs
                g.fillStyle(0x263238); g.fillRoundedRect(2, 12, TW - 4, 14, 6);                                // frame rim
                g.fillGradientStyle(0xff6b6b, 0xe53935, 0xc62828, 0xb71c1c, 1); g.fillEllipse(TW / 2, 14, TW - 22, 16); // mat
                g.fillStyle(0xffffff, 0.30); g.fillEllipse(TW / 2 - 14, 11, 34, 6);                            // sheen
                g.generateTexture('pf_tramp', TW, TH); g.clear();

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
                // A solved tree is no longer climbable - drop the player and retire the zone
                if (obstacle.climbZone) {
                    const ci = scene.climbZones.indexOf(obstacle.climbZone);
                    if (ci >= 0) { scene.climbZones.splice(ci, 1); }
                    if (scene.climbing === obstacle.climbZone) {
                        scene.climbing = null;
                        scene.player.body.setAllowGravity(true);
                    }
                }
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

            // Mario pipes: stand on top and press down to slide in. The right pipe
            // drops you into an underground tunnel that continues past the gate; the
            // wrong pipe just spits you back out the top (still no falling, no dying).
            function tryEnterPipe(scene) {
                const player = scene.player;
                const grounded = player.body.blocked.down || player.body.touching.down;
                if (!grounded) {
                    return;
                }
                for (let i = 0; i < scene.pipes.length; i++) {
                    const block = scene.pipes[i];
                    if (block.disabled || block.obstacle.answered) {
                        continue;
                    }
                    if (scene.physics.overlap(player, block.topZone)) {
                        enterPipe(scene, block);
                        return;
                    }
                }
            }

            function enterPipe(scene, block) {
                scene.warping = true;
                const player = scene.player;
                const pipe = block.img;
                player.body.setVelocity(0, 0);
                player.body.moves = false;
                player.setAngle(0);
                scene.tweens.add({
                    targets: player, x: pipe.x, duration: 110,
                    onComplete: () => scene.tweens.add({
                        targets: player, y: pipe.y + 10, scale: 0.3, duration: 280, ease: 'Quad.easeIn',
                        onComplete: () => block.correct ? descendIntoTunnel(scene, block) : ejectFromPipe(scene, block),
                    }),
                });
            }

            // Right pipe: teleport down into the tunnel and hand control back so the
            // player can run right underground. The question counts as answered here.
            function descendIntoTunnel(scene, block) {
                const player = scene.player;
                const obstacle = block.obstacle;
                const destX = block.img.x;
                const destY = scene.tunnelFloorTop - 60;
                scene.inTunnel = true;
                scene.cameras.main.setBounds(0, 0, scene.worldW, H + UNDER);
                player.setScale(1);
                player.setPosition(destX, destY);
                player.body.reset(destX, destY);
                player.body.moves = true;
                scene.warping = false;
                obstacle.answered = true;
                scene.bannerText.setText('🪙 רוץ ימינה במנהרה!');
                vm.onCorrect(obstacle.q);
            }

            // Wrong pipe: pop back up out of the same pipe and gray it out.
            function ejectFromPipe(scene, block) {
                const player = scene.player;
                const pipe = block.img;
                const destY = scene.groundTop - 140;
                player.setPosition(pipe.x, pipe.y + 10);
                scene.tweens.add({
                    targets: player, y: destY, scale: 1, duration: 280, ease: 'Back.easeOut',
                    onComplete: () => {
                        player.body.reset(pipe.x, destY);
                        player.body.moves = true;
                        scene.warping = false;
                        markWrong(scene, block);
                        scene.cameras.main.shake(150, 0.004);
                        vm.onWrong(block.obstacle.q);
                    },
                });
            }

            // Right trampoline: squash it, then fling the player up out of the tunnel in
            // an arc that lands on the surface past the gate (this is the way back up).
            function launchToSurface(scene, obstacle, block) {
                scene.warping = true;
                const player = scene.player;
                const pad = block.img;
                player.body.setVelocity(0, 0);
                player.body.moves = false;
                player.setAngle(0);
                scene.tweens.add({targets: pad, scaleY: 0.45, duration: 80, yoyo: true});
                const destX = obstacle.wallX + 70;
                const destY = scene.groundTop - 60;
                const peakY = scene.groundTop - 150;
                scene.inTunnel = false;
                scene.tweens.add({
                    targets: player, x: (pad.x + destX) / 2, y: peakY, duration: 440, ease: 'Quad.easeOut',
                    onComplete: () => scene.tweens.add({
                        targets: player, x: destX, y: destY, duration: 300, ease: 'Quad.easeIn',
                        onComplete: () => {
                            scene.cameras.main.setBounds(0, 0, scene.worldW, H);
                            player.body.reset(destX, destY);
                            player.body.moves = true;
                            scene.warping = false;
                            if (obstacle.barrier) { obstacle.barrier.destroy(); obstacle.barrier = null; }
                            sparkleBurst(scene, destX, destY);
                            scene.bannerText.setText('🪙 רוץ קדימה!');
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

            // A Mario block bounces up briefly when bonked from below
            function bonkBlock(scene, block) {
                scene.tweens.add({
                    targets: [block.img, block.label],
                    y: block.homeY - 14,
                    duration: 90, yoyo: true, ease: 'Quad.easeOut',
                });
            }

            // river / clouds / dragon: solid Mario cubes overhead - bonk from below
            function buildFloatingBlocks(scene, obstacle, baseX, q, groundTop, texKey) {
                const blockY = groundTop - 170;
                q.options.forEach((option, idx) => {
                    const x = baseX + 150 + idx * 190;
                    const img = scene.physics.add.staticImage(x, blockY, texKey).setDepth(4);
                    const label = makeLabel(scene, x, blockY, option.text, {wordWrap: {width: 110}});
                    const block = {img: img, label: label, correct: option.correct, disabled: false, homeY: blockY};
                    // Solid block: only a head-bonk from below (player rising into it)
                    // answers. The player's own up-collision flag is the reliable signal
                    // (a static block's touching flags aren't dependable in Arcade).
                    scene.physics.add.collider(scene.player, img, () => {
                        if (block.disabled || obstacle.answered) {
                            return;
                        }
                        const p = scene.player.body;
                        if (p.blocked.up || p.touching.up) {
                            bonkBlock(scene, block);
                            handleChoice(scene, obstacle, block);
                        }
                    });
                    obstacle.blocks.push(block);
                });
            }

            // pipes: solid columns you stand on; press down on the right one to drop
            // into the underground tunnel (built separately, spanning to the trampolines).
            function buildPipes(scene, obstacle, baseX, q, groundTop) {
                q.options.forEach((option, idx) => {
                    const x = baseX + 150 + idx * 190;
                    const pipe = scene.physics.add.staticImage(x, groundTop - 56, 'pf_pipe').setDepth(4);
                    scene.physics.add.collider(scene.player, pipe); // solid - stand on top
                    const label = makeLabel(scene, x, groundTop - 134, option.text, {color: '#1b5e20'});
                    // Thin trigger across the pipe's lip: "standing on this pipe".
                    const topZone = scene.add.rectangle(x, groundTop - 112, 84, 36, 0x000000, 0);
                    scene.physics.add.existing(topZone, true);
                    const block = {img: pipe, label: label, correct: option.correct,
                                   disabled: false, topZone: topZone, obstacle: obstacle};
                    scene.pipes.push(block);
                    obstacle.blocks.push(block);
                });
            }

            // Underground tunnel the right pipe drops into: a dark cave with a floor to
            // run on and some coins. It spans from the pipe segment to the trampoline
            // segment, where the right trampoline flings the player back up to daylight.
            function buildTunnel(scene, surfaceTop, startX, endX) {
                const floorTop = H + UNDER - 48;
                scene.tunnelFloorTop = floorTop;
                const tWidth = endX - startX;
                const cx = (startX + endX) / 2;

                // Dark cave backdrop spanning from just under the ground down past the floor
                scene.add.rectangle(cx, (surfaceTop + (floorTop + 48)) / 2, tWidth, (floorTop + 48) - surfaceTop, 0x241a14).setDepth(1);
                const floor = scene.add.tileSprite(cx, floorTop + 24, tWidth, 48, 'pf_ground').setDepth(2);
                scene.physics.add.existing(floor, true);
                scene.physics.add.collider(scene.player, floor);
                for (let c = startX + 130; c < endX - 130; c += 170) {
                    scene.add.image(c, floorTop - 64, 'pf_coin').setDepth(3);
                }
            }

            // platform: four solid-looking platforms. Step on the right one and it
            // holds (gate opens); step on a wrong one and it crumbles out from under
            // you and you drop back to the ground (no dying - just try another).
            function buildPlatform(scene, obstacle, baseX, q, groundTop) {
                q.options.forEach((option, idx) => {
                    const x = baseX + 150 + idx * 190;
                    const y = groundTop - (idx % 2 === 0 ? 96 : 124);
                    const plat = scene.physics.add.staticImage(x, y, 'pf_platform').setDepth(4);
                    // One-way: the player can jump up through it and land on top
                    plat.body.checkCollision.down = false;
                    plat.body.checkCollision.left = false;
                    plat.body.checkCollision.right = false;
                    const collider = scene.physics.add.collider(scene.player, plat);
                    const label = makeLabel(scene, x, y - 2, option.text, {
                        fontSize: '20px', color: '#3e2723', wordWrap: {width: 130},
                    });
                    const block = {img: plat, label: label, correct: option.correct, disabled: false, collider: collider};
                    const zone = scene.add.rectangle(x, y - 18, 132, 24, 0x000000, 0);
                    scene.physics.add.existing(zone, true);
                    scene.physics.add.overlap(scene.player, zone, () => {
                        if (scene.player.body.velocity.y < -10) {
                            return; // ignore the upward pass-through; count the landing
                        }
                        handlePlatform(scene, obstacle, block);
                    });
                    obstacle.blocks.push(block);
                });
            }

            function handlePlatform(scene, obstacle, block) {
                if (vm.destroyed || obstacle.answered || block.disabled || scene.warping) {
                    return;
                }
                if (block.correct) {
                    obstacle.answered = true;
                    scene.bannerText.setText('🪙 רוץ קדימה!');
                    solveObstacle(scene, obstacle, block);
                    vm.onCorrect(obstacle.q);
                } else {
                    // crumble away and drop the player through
                    block.disabled = true;
                    if (block.collider) { scene.physics.world.removeCollider(block.collider); block.collider = null; }
                    if (block.img.body) { block.img.body.enable = false; }
                    scene.tweens.add({targets: [block.img, block.label], alpha: 0, y: '+=34', duration: 300});
                    scene.cameras.main.shake(150, 0.004);
                    vm.onWrong(obstacle.q);
                }
            }

            // trampolines (underground): four springy pads. The right one flings you up
            // to the surface past the gate; a wrong one gives a dead little bounce + grays.
            function buildTrampolines(scene, obstacle, baseX, q, groundTop) {
                q.options.forEach((option, idx) => {
                    const x = baseX + 150 + idx * 185;
                    const y = groundTop - 84;
                    const pad = scene.physics.add.staticImage(x, y, 'pf_tramp').setDepth(4);
                    pad.body.checkCollision.down = false;
                    pad.body.checkCollision.left = false;
                    pad.body.checkCollision.right = false;
                    scene.physics.add.collider(scene.player, pad);
                    const label = makeLabel(scene, x, y - 46, option.text, {fontSize: '20px', color: '#ffcdd2', stroke: '#7f0000'});
                    const block = {img: pad, label: label, correct: option.correct, disabled: false, homeY: y};
                    const zone = scene.add.rectangle(x, y - 22, 120, 22, 0x000000, 0);
                    scene.physics.add.existing(zone, true);
                    scene.physics.add.overlap(scene.player, zone, () => {
                        if (scene.player.body.velocity.y < -10) {
                            return; // ignore the upward pass-through; count the landing
                        }
                        handleTrampoline(scene, obstacle, block);
                    });
                    obstacle.blocks.push(block);
                });
            }

            function handleTrampoline(scene, obstacle, block) {
                if (vm.destroyed || obstacle.answered || block.disabled || scene.warping) {
                    return;
                }
                if (block.correct) {
                    obstacle.answered = true;
                    scene.bannerText.setText('🚀 קפיצה למעלה!');
                    launchToSurface(scene, obstacle, block);
                    vm.onCorrect(obstacle.q);
                } else {
                    scene.tweens.add({targets: [block.img, block.label], y: block.homeY - 8, duration: 80, yoyo: true});
                    markWrong(scene, block);
                    scene.cameras.main.shake(120, 0.004);
                    vm.onWrong(obstacle.q);
                }
            }

            // tree: climb the trunk/foliage (Dangerous Dave style) and grab the right fruit
            function buildTree(scene, obstacle, baseX, q, groundTop) {
                const cx = baseX + 430;
                drawTree(scene, cx, groundTop);

                // The whole trunk + canopy is a climb field: while inside it the
                // player ignores gravity and moves freely with the arrows / D-pad.
                const zoneH = 300, zoneW = 360;
                const climbZone = scene.add.rectangle(cx, groundTop - zoneH / 2, zoneW, zoneH, 0x000000, 0);
                scene.physics.add.existing(climbZone, true);
                scene.climbZones.push(climbZone);
                obstacle.climbZone = climbZone;

                const n = q.options.length;
                q.options.forEach((option, idx) => {
                    const x = cx + (idx - (n - 1) / 2) * 105;
                    const y = groundTop - (idx % 2 === 0 ? 215 : 285); // high enough to need climbing
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

            // Tree climbing: returns true while it owns the player's movement this frame
            function updateClimb(scene, upHeld, downHeld, jumpPressed) {
                const player = scene.player;
                const art = scene.playerArt;
                let zone = null;
                for (let i = 0; i < scene.climbZones.length; i++) {
                    if (scene.physics.overlap(player, scene.climbZones[i])) { zone = scene.climbZones[i]; break; }
                }
                if (!scene.climbing) {
                    if (zone && (upHeld || downHeld)) {
                        scene.climbing = zone;
                        player.body.setAllowGravity(false);
                    } else {
                        return false;
                    }
                } else if (jumpPressed || !zone) {
                    // hop off (with a little boost) or fall out the side of the foliage
                    scene.climbing = null;
                    player.body.setAllowGravity(true);
                    if (jumpPressed) { player.body.setVelocityY(-JUMP_VELOCITY * 0.7); }
                    return false;
                }

                const left = scene.cursors.left.isDown || vm.touch.left;
                const right = scene.cursors.right.isDown || vm.touch.right;
                player.body.setVelocityX(left && !right ? -CLIMB : right && !left ? CLIMB : 0);
                player.body.setVelocityY(upHeld ? -CLIMB : downHeld ? CLIMB : 0);
                if (left && !right) { art.setFlipX(false); } else if (right && !left) { art.setFlipX(true); }
                art.setAngle(0);
                art.setScale(1, 1 + Math.sin(scene.time.now * 0.02) * 0.06);
                return true;
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

                // Invisible gate that opens when the obstacle is solved. Both the gate
                // and the question trigger sit on this obstacle's lane (groundTop is the
                // surface for most, but the underground floor for the trampolines).
                obstacle.startX = baseX + 60;
                obstacle.wallX = baseX + 815;
                const wall = scene.add.rectangle(obstacle.wallX, groundTop - 130, 26, 360, 0x000000, 0);
                scene.physics.add.existing(wall, true);
                scene.physics.add.collider(scene.player, wall);
                obstacle.barrier = wall;

                if (type === 'pipes') {
                    buildPipes(scene, obstacle, baseX, q, groundTop);
                } else if (type === 'trampolines') {
                    buildTrampolines(scene, obstacle, baseX, q, groundTop);
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
                const trigger = scene.add.rectangle(baseX + 30, groundTop - 130, 30, 360, 0x000000, 0);
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
                // Every run has the pipe -> underground -> trampoline detour: drop down
                // the right pipe, run the tunnel, and the right trampoline flings you
                // back up to the surface past the gate. Two random surface obstacles
                // lead in, the dragon block is the finale.
                const surface = vm.shuffle(['river', 'clouds', 'platform', 'tree']).slice(0, 2);
                const themes = surface.concat(['pipes', 'trampolines', 'dragon']);
                const total = INTRO + themes.length * SEG + OUTRO;
                const groundTop = H - GROUND_H;
                scene.groundTop = groundTop;
                scene.lastCheckpointX = 120;
                scene.levelDone = false;
                scene.currentQ = null;
                scene.warping = false;
                scene.worldW = total;
                scene.pipes = [];
                scene.climbZones = [];
                scene.climbing = null;
                scene.inTunnel = false;
                scene.prevUpTouch = false;
                scene.prevDownTouch = false;

                // World is taller than the view so the underground tunnel fits below;
                // the camera stays clamped to the surface until the player goes down.
                scene.physics.world.setBounds(0, 0, total, H + UNDER);
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

                // The tunnel runs under the pipe segment all the way to the trampoline
                // segment, so build it first (it sets scene.tunnelFloorTop, the lane the
                // trampoline obstacle is built on).
                const pipeBaseX = INTRO + themes.indexOf('pipes') * SEG;
                const trampBaseX = INTRO + themes.indexOf('trampolines') * SEG;
                buildTunnel(scene, groundTop, pipeBaseX + 20, trampBaseX + 815 + 150);

                themes.forEach((type, i) => {
                    const lane = type === 'trampolines' ? scene.tunnelFloorTop : groundTop;
                    buildObstacle(scene, type, INTRO + i * SEG, vm.makeQuestion(usedIndexes), lane);
                });

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
                const upHeld = scene.cursors.up.isDown || vm.touch.up;
                const downHeld = scene.cursors.down.isDown || vm.touch.down;
                // Held buttons -> edge presses (keyboard via JustDown, touch via prev state)
                const jumpPressed = Phaser.Input.Keyboard.JustDown(scene.cursors.up)
                    || Phaser.Input.Keyboard.JustDown(scene.cursors.space)
                    || (vm.touch.up && !scene.prevUpTouch);
                const downPressed = Phaser.Input.Keyboard.JustDown(scene.cursors.down)
                    || (vm.touch.down && !scene.prevDownTouch);

                // Climbing a tree trunk (Dangerous Dave style) overrides normal movement
                if (updateClimb(scene, upHeld, downHeld, jumpPressed)) {
                    scene.prevUpTouch = vm.touch.up;
                    scene.prevDownTouch = vm.touch.down;
                    return;
                }

                // Standing on a pipe and pressing down warps you into it
                if (downPressed && !scene.warping) {
                    tryEnterPipe(scene);
                }

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
                if (jumpPressed) {
                    scene.jumpBufferUntil = time + 140;
                }
                if (time < scene.jumpBufferUntil && time < scene.coyoteUntil) {
                    player.body.setVelocityY(-JUMP_VELOCITY);
                    scene.jumpBufferUntil = 0;
                    scene.coyoteUntil = 0;
                }

                scene.prevUpTouch = vm.touch.up;
                scene.prevDownTouch = vm.touch.down;

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
                // (skipped underground, where the player is legitimately below H).
                if (!scene.inTunnel && player.y > H + 80) {
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


// Tiny WebAudio synth for the duel game - pew/click/boom effects with no audio
// files. The context is created lazily on the first user click (autoplay policy)
// and every call is safe to make even where WebAudio is unavailable.
var duelSfx = (function () {
    let ctx = null;
    function ac() {
        try {
            if (!ctx) {
                ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            return ctx;
        } catch (e) {
            return null;
        }
    }
    function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
        const c = ac();
        if (!c) return;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, c.currentTime + when);
        if (slideTo) {
            o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), c.currentTime + when + dur);
        }
        g.gain.setValueAtTime(vol, c.currentTime + when);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + when + dur);
        o.connect(g);
        g.connect(c.destination);
        o.start(c.currentTime + when);
        o.stop(c.currentTime + when + dur + 0.05);
    }
    function noise(dur, vol, when = 0) {
        const c = ac();
        if (!c) return;
        const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
            d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        }
        const s = c.createBufferSource();
        s.buffer = buf;
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 900;
        const g = c.createGain();
        g.gain.value = vol;
        s.connect(f);
        f.connect(g);
        g.connect(c.destination);
        s.start(c.currentTime + when);
    }
    return {
        unlock: ac,
        pew: function () { tone(900, 0.18, 'square', 0.12, 0, 200); },
        superPew: function () { tone(1400, 0.28, 'sawtooth', 0.14, 0, 300); tone(700, 0.28, 'square', 0.1, 0.04, 200); },
        click: function () { tone(220, 0.05, 'square', 0.14); tone(170, 0.05, 'square', 0.12, 0.1); },
        fizzle: function () { noise(0.35, 0.1); },
        boom: function () { noise(0.3, 0.25); tone(130, 0.3, 'triangle', 0.2, 0, 55); },
        enemyPew: function () { tone(420, 0.22, 'sawtooth', 0.12, 0, 160); },
        whoosh: function () { noise(0.22, 0.06); tone(700, 0.2, 'sawtooth', 0.03, 0, 250); },
        hurt: function () { tone(320, 0.25, 'triangle', 0.16, 0, 140); },
        fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.2, 'square', 0.12, i * 0.13); }); },
        sad: function () { [392, 330, 262].forEach(function (f, i) { tone(f, 0.28, 'triangle', 0.12, i * 0.2); }); },
    };
})();

// Duel Shooter - a real-time 3D showdown (Three.js). Answering questions loads
// your magazine: a correct answer adds a golden energy bolt, a wrong answer adds
// a broken (dud) bolt that clearly doesn't work. When the magazine is full both
// fighters step out from behind their crates: golden bolts streak across the
// arena and hit the boss, a dud just sputters out of the barrel and drops
// ("click!"), giving the boss one shot back at you. Each side has 10 HP shown on
// fighting-game health bars. Bosses are the maze creatures (orc, ghost, dragon);
// the hero is the animated robot with a ray gun. Nobody gets hurt for real -
// the loser falls over comically and the winner dances.
var DuelShooterComponent = Vue.component('duel-shooter', Vue.extend({
    template: `
    <div class="container">
        <div class="ds3-wrap" ref="wrap" :class="{'ds-shake': arenaShake}">
            <div class="ds3-arena" ref="arena"></div>

            <div class="ds3-progress" v-if="progress && progress.total">
                <div class="ds3-progress-fill" :style="{width: (progress.progress / progress.total * 100) + '%'}"></div>
            </div>

            <div class="ds3-hud" dir="ltr">
                <div class="ds3-side">
                    <div class="ds3-name">{{ hero.icon }} אני <span class="ds3-score">⭐ {{ score }}</span></div>
                    <div class="ds3-hpbar"><div class="ds3-hpfill" :style="hpStyle(playerHp)"></div></div>
                </div>
                <div class="ds3-vs">VS<br><span>יריב {{ bossIndex + 1 }}/{{ villains.length }}</span></div>
                <div class="ds3-side ds3-side-enemy">
                    <div class="ds3-name">{{ villain.icon }} {{ villain.name }}</div>
                    <div class="ds3-hpbar ds3-flip"><div class="ds3-hpfill" :style="hpStyle(enemyHp)"></div></div>
                </div>
            </div>

            <div class="ds3-question" v-if="started && phase === 'load'" v-html="exercise"></div>

            <div class="ds3-flash" v-if="message.value"
                 v-bind:class="{ 'error': message.error, 'success': message.success }">{{ message.value }}</div>

            <div class="ds-mag" dir="ltr">
                <div v-for="n in magSize" :key="'m'+n" class="ds-slot" :class="slotClass(n - 1)">
                    <span v-if="magazine[n-1] && !magazine[n-1].good">✖</span>
                    <span v-else-if="magazine[n-1] && magazine[n-1].super">⚡</span>
                </div>
            </div>

            <div class="ds-msg">{{ duelMsg }}</div>

            <a class="ds3-fs-btn" @click="toggleFullscreen"><i class="material-icons">fullscreen</i></a>
            <a class="ds3-hero-btn" v-if="started && phase === 'load'" @click="switchHero">🔁 {{ hero.icon }} {{ hero.label }}</a>

            <div v-for="d in dmgPops" :key="'dp'+d.id" class="ds-dmg" :style="{left: d.x + '%', color: d.color}">{{ d.text }}</div>
            <template v-if="phase === 'victory'">
                <div v-for="c in confetti" :key="'cf'+c.id" class="ds-confetti"
                     :style="{left: c.left + '%', background: c.color, animationDelay: c.delay + 's'}"></div>
            </template>

            <div class="ds3-start" v-if="!started" @click="startGame">
                <h4>🏹 דו-קרב 🎯</h4>
                <p v-if="currentApp && currentApp.title">{{ currentApp.title }}</p>
                <p>הסתתר מאחורי שקי החול, בחר את הכדור הנכון בעמדת התחמושת — וכשהמחסנית מלאה צא לקרב!</p>
                <a class="btn-large amber darken-2 ds3-start-btn">▶ התחל במסך מלא</a>
            </div>
        </div>
    </div>`,

    extends: BaseGameComponent,

    data: function() { return {
        phase: 'load',          // 'load' | 'duel' | 'victory' | 'defeat'
        results: [],
        magazine: [],           // [{good: bool, super: bool, state: 'ready'|'spent'}]
        fireIndex: 0,
        maxHp: 10,
        playerHp: 10,
        enemyHp: 10,
        locked: false,
        started: false,         // start-overlay clicked (also requests fullscreen)
        arenaShake: false,
        streak: 0,              // consecutive correct answers; every 3rd loads a super bolt
        bossIndex: 0,
        // KayKit skeletons (CC0) with a full baked animation library, then the
        // Quaternius dragon as the final boss. `clips` maps game actions to
        // each model's own clip names (lowercased).
        heroIndex: 0,
        heroOptions: [
            {key: 'mage', label: 'קוסם', icon: '🧙', url: 'assets/models/duel/Mage.glb', height: 1.7,
             clips: {idle: 'idle', hide: 'spellcasting', run: 'running_a', shoot: 'spellcast_shoot',
                     hit: 'hit_a', death: 'death_a', cheer: 'cheer'},
             hideMeshes: [], muzzleMesh: '2h_staff'},
            {key: 'rogue', label: 'הרפתקן', icon: '🏹', url: 'assets/models/duel/Rogue.glb', height: 1.65,
             clips: {idle: '2h_ranged_aiming', hide: '2h_ranged_aiming', run: 'running_a', shoot: '2h_ranged_shoot',
                     hit: 'hit_a', death: 'death_a', cheer: 'cheer'},
             hideMeshes: ['1h_crossbow', 'knife_offhand'], muzzleMesh: '2h_crossbow'},
            {key: 'knight', label: 'אביר', icon: '🛡️', url: 'assets/models/duel/Knight.glb', height: 1.7,
             clips: {idle: 'idle', hide: 'blocking', run: 'running_a', shoot: '1h_melee_attack_slice_diagonal',
                     hit: 'hit_a', death: 'death_a', cheer: 'cheer'},
             hideMeshes: ['2h_sword', '1h_sword_offhand', 'badge_shield', 'spike_shield', 'rectangle_shield'],
             muzzleMesh: '1h_sword'},
            {key: 'robot', label: 'רובוט', icon: '🤖', url: 'assets/models/duel/RobotExpressive.glb', height: 1.55,
             clips: {idle: 'idle', hide: 'sitting', run: 'running', shoot: 'punch',
                     hit: 'no', death: 'death', cheer: 'dance'},
             hideMeshes: [], muzzleMesh: null},
        ],
        villains: [
            {key: 'minion',  icon: '💀', name: 'השלד הקטן',   url: 'assets/models/duel/Skeleton_Minion.glb',  height: 1.5,  y: 0,
             clips: {idle: 'idle_combat', run: 'running_a', attack: 'throw', hit: 'hit_a', death: 'death_a', cheer: 'taunt', spawn: 'skeletons_awaken_standing'}},
            {key: 'warrior', icon: '⚔️', name: 'השלד הלוחם',  url: 'assets/models/duel/Skeleton_Warrior.glb', height: 1.8,  y: 0,
             clips: {idle: 'idle_combat', run: 'running_a', attack: 'throw', hit: 'hit_a', death: 'death_a', cheer: 'taunt', spawn: 'skeletons_awaken_standing'}},
            {key: 'skelmage', icon: '🔮', name: 'קוסם השלדים', url: 'assets/models/duel/Skeleton_Mage.glb',   height: 1.85, y: 0,
             clips: {idle: 'idle_combat', run: 'running_a', attack: 'spellcast_shoot', hit: 'hit_a', death: 'death_a', cheer: 'taunt', spawn: 'skeletons_awaken_standing'}},
            {key: 'dragon',  icon: '🐉', name: 'הדרקון',      url: 'assets/models/maze/dragon.glb',           height: 2.4,  y: 0.35,
             clips: {idle: 'flying_idle', run: 'flying_idle', attack: 'headbutt', hit: 'headbutt', death: 'death', cheer: 'headbutt', spawn: 'flying_idle'}},
        ],
        duelMsg: '',
        fxId: 0,
        dmgPops: [],            // floating damage numbers (HTML overlay)
        confetti: [],
        timeouts: [],
    }},

    computed: {
        magSize: function() {
            return (this.currentApp && this.currentApp.magazineSize) ? this.currentApp.magazineSize : 6;
        },
        villain: function() {
            return this.villains[this.bossIndex % this.villains.length];
        },
        hero: function() {
            return this.heroOptions[this.heroIndex % this.heroOptions.length];
        },
    },

    methods: {
        create: function () {
            this.clearTimers();
            this.bossIndex = getLocalStorage(`${this.currentAppId}_duel_boss`, 0) % this.villains.length;
            this.heroIndex = getLocalStorage('duel_hero_choice', 0) % this.heroOptions.length;
            this.playerHp = this.maxHp;
            this.enemyHp = this.maxHp;
            this.magazine = [];
            this.fireIndex = 0;
            this.streak = 0;
            this.phase = 'load';
            this.dmgPops = [];
            this.confetti = [];
            this.duelMsg = this.villain.name + ' יורה לעברך! הסתתר וטען כדורים מעמדת התחמושת!';
            this.message = {};
            this.resetStage3D();
            this.nextQuestion();
            // First entry seeds the weights inside nextQuestion; honor the news
            // screen / level-complete navigation just like MCQComponent does.
            this.reloadProgress();
        },

        nextQuestion: function () {
            let question = generateFromList(this.currentApp.listName, this.currentApp.questionIndex,
                                            this.currentApp.resultIndex, this.currentAppId,
                                            getSetItems(this.currentApp), questionType=this.currentApp.questionType);
            this.results = this.shuffle(question.options);
            this.exercise = question.question;
            this.result = question.result;
            this.questionIndex = question.questionIndex;
            this.buildAnswerCards3D();
            question.action();
            this.locked = false;
            this.$forceUpdate();
        },

        // While loading the magazine only the progress bar is refreshed; navigation
        // (level done / news screen) waits until the duel resolves, so a full
        // magazine always gets fired.
        refreshProgress: function () {
            this.progress = getCurrentLevelProgress(this.currentAppId);
        },

        hpStyle: function (hp) {
            const pct = Math.max(0, hp / this.maxHp * 100);
            const color = pct > 60 ? '#43d675' : (pct > 30 ? '#ffb300' : '#ff5252');
            return {width: pct + '%', backgroundColor: color, boxShadow: '0 0 8px ' + color};
        },

        startGame: function () {
            duelSfx.unlock();
            this.started = true;
            this.enterFullscreen();
        },

        // Cycle the playable character (choice is saved for all duel games)
        switchHero: function () {
            if (this.phase !== 'load') return;
            this.heroIndex = (this.heroIndex + 1) % this.heroOptions.length;
            setLocalStorage('duel_hero_choice', this.heroIndex);
            this.loadHero3D();
        },

        enterFullscreen: function () {
            const el = this.$refs.wrap;
            if (!el || document.fullscreenElement) return;
            const req = el.requestFullscreen || el.webkitRequestFullscreen;
            if (req) {
                try {
                    const p = req.call(el);
                    // A shooter wants landscape; supported on Android in fullscreen
                    const lock = () => {
                        try {
                            if (screen.orientation && screen.orientation.lock) {
                                screen.orientation.lock('landscape').catch(() => {});
                            }
                        } catch (e) {}
                    };
                    if (p && p.then) { p.then(lock).catch(() => {}); } else { lock(); }
                } catch (e) { /* embedded mode is fine */ }
            }
        },

        toggleFullscreen: function () {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            } else {
                this.enterFullscreen();
            }
        },

        answer: function (index) {
            if (this.locked || this.phase !== 'load') {
                return
            }
            this.locked = true;
            duelSfx.unlock();
            const good = this.results[index] === this.result;
            let superBullet = false;
            if (good) {
                successSound.play();
                updateWeightForKey(this.currentAppId, this.questionIndex, -1);
                this.score += 1;
                this.streak += 1;
                superBullet = this.streak % 3 === 0;
                this.message = superBullet
                    ? {value: 'רצף של ' + this.streak + '! כדור-על נטען! ⚡⚡', success: true}
                    : {value: 'כדור זהב נוסף למחסנית! ✨', success: true};
            } else {
                failureSound.play();
                this.score = Math.max(0, this.score - 1);
                this.streak = 0;
                updateWeightForKey(this.currentAppId, this.questionIndex, 1);
                this.message = {value: 'אופס! נכנס כדור מקולקל 💨 התשובה הנכונה: ' + this.result, error: true};
            }
            this.saveScore();
            this.refreshProgress();
            this.answerFeedback3D(index, good);
            this.magazine.push({good: good, super: superBullet, state: 'ready'});
            this.later(() => {
                this.message = {};
                if (this.magazine.length >= this.magSize) {
                    this.startDuel();
                } else {
                    this.nextQuestion();
                }
            }, good ? 650 : 2200);
        },

        startDuel: function () {
            this.phase = 'duel';
            this.duelMsg = 'המחסנית מלאה! הקרב מתחיל! 🔥';
            if (this._duel) this._duel.answerRoot.visible = false;
            this.setCamPreset3D('battle', 1.0);
            this.walkTo3D(true, () => {
                this.later(this.fireNext, 350);
            });
        },

        fireNext: function () {
            if (this.enemyHp <= 0) {
                return this.endDuel(true);
            }
            if (this.playerHp <= 0) {
                return this.endDuel(false);
            }
            if (this.fireIndex >= this.magazine.length) {
                return this.endVolley();
            }
            const bullet = this.magazine[this.fireIndex];
            if (bullet.good) {
                const dmg = bullet.super ? 2 : 1;
                this.duelMsg = bullet.super ? 'כדור-על בדרך!! ⚡⚡' : 'כדור זהב בדרך! ⚡';
                if (bullet.super) { duelSfx.superPew(); } else { duelSfx.pew(); }
                this.heroShoot3D(bullet.super, () => {
                    bullet.state = 'spent';
                    this.enemyHp = Math.max(0, this.enemyHp - dmg);
                    this.shakeArena();
                    duelSfx.boom();
                    this.dmgPop(74, '-' + dmg, bullet.super ? '#00e5ff' : '#ffd54f');
                    this.fireIndex += 1;
                    this.later(this.fireNext, 500);
                });
            } else {
                this.duelMsg = 'קליק... קליק... הכדור המקולקל לא יורה! 💨';
                duelSfx.click();
                this.dudDrop3D(() => {
                    bullet.state = 'spent';
                    duelSfx.fizzle();
                    this.duelMsg = 'עכשיו תור ' + this.villain.name + ' לירות! 😈';
                    this.later(() => {
                        duelSfx.enemyPew();
                        this.enemyShoot3D(() => {
                            this.playerHp = Math.max(0, this.playerHp - 1);
                            this.shakeArena();
                            duelSfx.hurt();
                            this.dmgPop(22, '-1', '#ff8a80');
                            this.fireIndex += 1;
                            this.later(this.fireNext, 500);
                        });
                    }, 400);
                });
            }
        },

        shakeArena: function () {
            this.arenaShake = false;
            this.later(() => { this.arenaShake = true; }, 20);
            this.later(() => { this.arenaShake = false; }, 470);
            // Quick camera dolly punch on impact (battle view only)
            const g = this._duel;
            if (g && this.phase !== 'load') {
                const b = g.camPresets.battle;
                const z = (g.camera.aspect < 0.9 && b.posP) ? b.posP[2] : b.pos[2];
                this.tween3D(g.cam.pos, 'z', z - 0.5, 0.08, {
                    ease: 'out',
                    onDone: () => this.tween3D(g.cam.pos, 'z', z, 0.35),
                });
            }
        },

        endVolley: function () {
            this.duelMsg = 'המחסנית ריקה! חוזרים למחבוא לאסוף כדורים 🔄';
            this.setCamPreset3D('cover', 1.4);
            this.walkTo3D(false, () => {
                if (this.reloadProgress()) {
                    this.magazine = [];
                    this.fireIndex = 0;
                    this.phase = 'load';
                    this.setHeroClip('hide');
                    this.duelMsg = 'לחץ על הכדור עם התשובה הנכונה!';
                    this.nextQuestion();
                }
            });
        },

        endDuel: function (won) {
            this.phase = won ? 'victory' : 'defeat';
            if (won) {
                duelSfx.fanfare();
                successSound.play();
                const lastBoss = this.bossIndex === this.villains.length - 1;
                this.score += lastBoss ? 10 : 5;
                this.saveScore();
                setLocalStorage(`${this.currentAppId}_duel_boss`, (this.bossIndex + 1) % this.villains.length);
                this.makeConfetti();
                this.duelMsg = '';
                this.enemyDie3D();
                this.setHeroClip('cheer');
                this.message = lastBoss
                    ? {value: 'אלוף!! ניצחת את כל היריבים! 🏆👑', success: true}
                    : {value: 'ניצחון! ' + this.villain.name + ' מובס! 🏆', success: true};
            } else {
                duelSfx.sad();
                this.duelMsg = '';
                this.heroDie3D();
                this.enemyCheer3D();
                this.message = {value: 'הפעם ' + this.villain.name + ' ניצח... בוא ננסה שוב! 💪', error: true};
            }
            this.later(() => {
                if (this.reloadProgress()) {
                    this.create();
                }
            }, 3600);
        },

        makeConfetti: function () {
            const colors = ['#ffd54f', '#4fc3f7', '#81c784', '#f06292', '#ba68c8', '#ff8a65'];
            this.confetti = Array.from({length: 40}, (_, i) => ({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 1.2,
                color: colors[i % colors.length],
            }));
        },

        dmgPop: function (x, text, color) {
            const id = ++this.fxId;
            this.dmgPops.push({id: id, x: x, text: text, color: color});
            this.later(() => { this.dmgPops = this.dmgPops.filter(d => d.id !== id); }, 1000);
        },

        slotClass: function (i) {
            const b = this.magazine[i];
            if (!b) {
                return {};
            }
            return {
                'ds-good': b.good && !b.super,
                'ds-super': b.good && b.super,
                'ds-dud': !b.good,
                'ds-spent': b.state === 'spent',
                'ds-firing': this.phase === 'duel' && i === this.fireIndex && b.state !== 'spent',
            };
        },

        later: function (fn, ms) {
            this.timeouts.push(setTimeout(fn, ms));
        },

        clearTimers: function () {
            this.timeouts.forEach(clearTimeout);
            this.timeouts = [];
        },

        // ------------------------------------------------------------------
        // 3D layer. Everything below renders the fight; the game logic above
        // works even if THREE fails to load (callbacks still fire via timers).
        // ------------------------------------------------------------------

        initScene3D: function () {
            if (typeof THREE === 'undefined' || !this.$refs.arena) {
                return false;
            }
            const area = this.$refs.arena;
            const g = this._duel = {
                area: area,
                clock: new THREE.Clock(),
                tweens: [],
                bursts: [],
                mixers: [],
                heroHomeX: -3.1, heroHomeZ: 1.0, heroOutX: -1.25,
                enemyHomeX: 2.95, enemyOutX: 1.25,
            };

            g.renderer = new THREE.WebGLRenderer({antialias: true});
            g.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            g.renderer.setSize(area.clientWidth, area.clientHeight);
            g.renderer.outputEncoding = THREE.sRGBEncoding;
            g.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            g.renderer.toneMappingExposure = 1.15;
            g.renderer.shadowMap.enabled = true;
            g.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            area.appendChild(g.renderer.domElement);

            g.scene = new THREE.Scene();
            g.scene.background = this.makeSkyTexture3D();
            g.scene.fog = new THREE.Fog(0x2b2350, 16, 34);

            g.camera = new THREE.PerspectiveCamera(42, area.clientWidth / area.clientHeight, 0.1, 100);
            // Two camera moods: "cover" crouches behind the hero's crate while
            // loading bullets; "battle" is the wide side-on duel view.
            // posP/lookP are the portrait-phone variants: same framing, camera
            // pulled back along the view direction so everything stays in shot
            g.camPresets = {
                cover:  {pos: [-6.4, 1.9, 4.4], look: [-1.4, 0.85, -0.3], posP: [-9.4, 2.5, 7.2]},
                battle: {pos: [0, 2.25, 7.7],   look: [0, 1.1, 0],        posP: [0, 3.1, 13.5]},
            };
            g.cam = {
                pos: new THREE.Vector3().fromArray(g.camPresets.cover.pos),
                look: new THREE.Vector3().fromArray(g.camPresets.cover.look),
            };
            g.camera.position.copy(g.cam.pos);
            g.camera.lookAt(g.cam.look);
            g.nextSuppress = 2.5;

            g.raycaster = new THREE.Raycaster();
            this._onPointer = ev => {
                if (!this._duel || this.phase !== 'load' || !this.started || this.locked) return;
                const rect = g.renderer.domElement.getBoundingClientRect();
                const ndc = new THREE.Vector2(
                    ((ev.clientX - rect.left) / rect.width) * 2 - 1,
                    -((ev.clientY - rect.top) / rect.height) * 2 + 1
                );
                g.raycaster.setFromCamera(ndc, g.camera);
                const hits = g.raycaster.intersectObjects(g.answerRoot.children, true);
                if (hits.length) {
                    let o = hits[0].object;
                    while (o && o.userData.answerIndex === undefined) o = o.parent;
                    if (o) this.answer(o.userData.answerIndex);
                }
            };
            g.renderer.domElement.addEventListener('pointerdown', this._onPointer);
            this._onFsChange = () => this.later(() => this._onResize && this._onResize(), 80);
            document.addEventListener('fullscreenchange', this._onFsChange);

            g.scene.add(new THREE.HemisphereLight(0x8fa3ff, 0x3d2f20, 0.8));
            const sun = new THREE.DirectionalLight(0xffd9a8, 1.05);
            sun.position.set(-5, 8, 5);
            sun.castShadow = true;
            sun.shadow.mapSize.set(1024, 1024);
            sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
            sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
            g.scene.add(sun);
            // Cool blue moonlight rim from behind - gives the "night battle" pop
            const rim = new THREE.DirectionalLight(0x7fa8ff, 0.55);
            rim.position.set(6, 4, -6);
            g.scene.add(rim);

            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(60, 40),
                new THREE.MeshStandardMaterial({map: this.makeSandTexture3D(), roughness: 1})
            );
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            g.scene.add(ground);

            // Background dunes + a few rocks for depth
            const duneMat = new THREE.MeshStandardMaterial({color: 0x8a6a3f, roughness: 1});
            [[-9, -10, 5], [0, -13, 7], [9, -10, 5]].forEach(d => {
                const dune = new THREE.Mesh(new THREE.SphereGeometry(d[2], 16, 12), duneMat);
                dune.position.set(d[0], -d[2] * 0.72, d[1]);
                g.scene.add(dune);
            });
            const rockMat = new THREE.MeshStandardMaterial({color: 0x6b6560, roughness: 0.95});
            [[-5.5, -2.5, 0.5], [5.8, -3.2, 0.65], [-2.2, -4.5, 0.4], [3.1, -5.2, 0.55]].forEach(r => {
                const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r[2]), rockMat);
                rock.position.set(r[0], r[2] * 0.6, r[1]);
                rock.rotation.set(Math.random(), Math.random(), Math.random());
                rock.castShadow = true;
                g.scene.add(rock);
            });

            // Desert props: cacti silhouettes for depth
            const cactusMat = new THREE.MeshStandardMaterial({color: 0x2f6b38, roughness: 0.9});
            [[-7.5, -5, 1.2], [6.8, -7, 1.5], [-3.5, -8, 1.0], [8.5, -4, 0.9]].forEach(c => {
                const cactus = new THREE.Group();
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.6, 8), cactusMat);
                trunk.position.y = 0.8;
                cactus.add(trunk);
                [-1, 1].forEach(side => {
                    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.7, 8), cactusMat);
                    arm.position.set(side * 0.32, 0.95, 0);
                    arm.rotation.z = side * -0.9;
                    cactus.add(arm);
                    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.5, 8), cactusMat);
                    up.position.set(side * 0.52, 1.3, 0);
                    cactus.add(up);
                });
                cactus.position.set(c[0], 0, c[1]);
                cactus.scale.setScalar(c[2]);
                g.scene.add(cactus);
            });

            // Burning torches beside each cover crate - flickering battle-camp light
            g.flames = [];
            g.flameTex = this.makeGlowTexture3D('rgba(255,236,150,1)', 'rgba(255,120,20,0)');
            [[-3.1, -1.0], [3.1, -1.0]].forEach((tp, i) => {
                const pole = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.05, 0.07, 1.5, 8),
                    new THREE.MeshStandardMaterial({color: 0x5a4026, roughness: 0.9})
                );
                pole.position.set(tp[0], 0.75, tp[1]);
                pole.castShadow = true;
                g.scene.add(pole);
                const flame = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: g.flameTex, blending: THREE.AdditiveBlending, depthWrite: false,
                }));
                flame.position.set(tp[0], 1.65, tp[1]);
                flame.scale.setScalar(0.55);
                g.scene.add(flame);
                const light = new THREE.PointLight(0xff9440, 1.1, 7);
                light.position.set(tp[0], 1.7, tp[1]);
                g.scene.add(light);
                g.flames.push({sprite: flame, light: light, phase: i * 2.1});
            });

            // Real cover: sandbag walls the fighters crouch behind
            this.makeSandbagWall3D(-2.1);
            this.makeSandbagWall3D(2.1);

            // Crates become camp props behind the lines (GLB swaps in when loaded)
            g.crates = [this.makeCrate3D(-4.6, -0.7), this.makeCrate3D(4.6, -0.7)];

            // The ammo rack - the in-world "machine" where bullets are chosen
            this.makeAmmoRack3D();

            // Actors: procedural stand-ins appear instantly; real models swap in
            g.hero = this.makeFigure3D(0x3f7fe0, 0x274b86);
            g.hero.group.position.set(g.heroHomeX, 0, g.heroHomeZ);
            g.hero.group.rotation.y = Math.PI / 2;
            g.scene.add(g.hero.group);

            g.gun = new THREE.Group();
            g.gun.position.set(0.05, 1.02, 0.32);
            g.hero.group.add(g.gun);
            const barrel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.07, 0.7, 10),
                new THREE.MeshStandardMaterial({color: 0x37474f, metalness: 0.6, roughness: 0.35})
            );
            barrel.rotation.x = Math.PI / 2;
            barrel.position.z = 0.35;
            g.gun.add(barrel);
            g.gunTipLocal = new THREE.Vector3(0, 0, 0.75);

            g.enemy = null;
            this.loadEnemy3D();
            this.loadHero3D();
            this.loadCrateModel3D();
            this.loadProps3D();

            // Reusable FX: muzzle flash sprite + light, tracer bolt, enemy orb
            g.flashTex = this.makeGlowTexture3D('rgba(255,255,255,1)', 'rgba(255,180,40,0)');
            g.flash = new THREE.Sprite(new THREE.SpriteMaterial({map: g.flashTex, blending: THREE.AdditiveBlending, depthWrite: false}));
            g.flash.scale.setScalar(0.9);
            g.flash.visible = false;
            g.scene.add(g.flash);
            g.flashLight = new THREE.PointLight(0xffc266, 0, 6);
            g.scene.add(g.flashLight);

            g.bolt = this.makeBolt3D(0xffc935);
            g.superBolt = this.makeBolt3D(0x25e2ff);
            g.superBolt.scale.setScalar(1.7);
            g.dudBolt = this.makeBolt3D(0x8a8a8a);
            g.orb = this.makeBolt3D(0xc45cff);
            g.orb.scale.setScalar(1.4);

            this._onResize = () => {
                if (!this._duel) return;
                const w = area.clientWidth, h = area.clientHeight;
                g.renderer.setSize(w, h);
                g.camera.aspect = w / h;
                g.camera.updateProjectionMatrix();
                // Re-frame for the new orientation (portrait uses farther presets)
                if (g.camMode) this.setCamPreset3D(g.camMode);
            };
            window.addEventListener('resize', this._onResize);

            const loop = () => {
                if (!this._duel) return;
                g.raf = requestAnimationFrame(loop);
                const dt = Math.min(g.clock.getDelta(), 0.05);
                const t = g.clock.elapsedTime;
                g.mixers.forEach(m => m.update(dt));
                this.updateTweens3D(dt);
                this.updateBursts3D(dt);
                // Torch flames flicker
                g.flames.forEach(f => {
                    const k = Math.sin(t * 11 + f.phase) * 0.5 + Math.sin(t * 23 + f.phase * 3) * 0.5;
                    f.light.intensity = 1.05 + k * 0.3;
                    f.sprite.scale.setScalar(0.5 + k * 0.09);
                });
                // Procedural stand-ins get a light idle bob so they never look frozen
                if (g.hero && !g.hero.model) g.hero.group.position.y = Math.sin(t * 2.2) * 0.03;
                if (g.enemy && !g.enemy.model && g.enemy.alive) g.enemy.group.position.y = (g.enemy.spec.y || 0) + Math.sin(t * 1.8 + 1) * 0.05;
                // While you reload behind the crate the boss keeps up suppressing fire
                if (this.phase === 'load' && this.started && g.enemy && g.enemy.alive && t > g.nextSuppress) {
                    g.nextSuppress = t + 2.2 + Math.random() * 2;
                    this.suppress3D();
                }
                // Camera rig position + subtle handheld sway
                g.camera.position.set(
                    g.cam.pos.x + Math.sin(t * 0.4) * 0.07,
                    g.cam.pos.y + Math.cos(t * 0.3) * 0.045,
                    g.cam.pos.z
                );
                g.camera.lookAt(g.cam.look);
                g.renderer.render(g.scene, g.camera);
            };
            loop();
            return true;
        },

        // --- textures & procedural builders ---

        makeCanvasTex3D: function (size, draw) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            draw(canvas.getContext('2d'), size);
            const tex = new THREE.CanvasTexture(canvas);
            tex.encoding = THREE.sRGBEncoding;
            return tex;
        },

        makeSkyTexture3D: function () {
            return this.makeCanvasTex3D(1024, (ctx, s) => {
                const grad = ctx.createLinearGradient(0, 0, 0, s);
                grad.addColorStop(0, '#0c0c2e');
                grad.addColorStop(0.4, '#33245c');
                grad.addColorStop(0.68, '#c65a3f');
                grad.addColorStop(0.78, '#f4a45c');
                grad.addColorStop(1, '#f8c476');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, s, s);
                // soft nebula patches
                [['rgba(186,104,200,0.16)', 0.22, 0.18, 0.3], ['rgba(79,195,247,0.10)', 0.6, 0.1, 0.24],
                 ['rgba(240,98,146,0.10)', 0.42, 0.3, 0.34]].forEach(n => {
                    const neb = ctx.createRadialGradient(s * n[1], s * n[2], 4, s * n[1], s * n[2], s * n[3]);
                    neb.addColorStop(0, n[0]);
                    neb.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = neb;
                    ctx.fillRect(0, 0, s, s);
                });
                // stars - a few bright ones with cross sparkle
                for (let i = 0; i < 220; i++) {
                    const y = Math.random() * s * 0.55;
                    const x = Math.random() * s;
                    ctx.globalAlpha = 0.25 + Math.random() * 0.7;
                    ctx.fillStyle = '#ffffff';
                    const sz = Math.random() < 0.12 ? 3 : 1.6;
                    ctx.fillRect(x, y, sz, sz);
                    if (sz > 2) {
                        ctx.globalAlpha = 0.3;
                        ctx.fillRect(x - 4, y + 0.5, 11, 1);
                        ctx.fillRect(x + 0.5, y - 4, 1, 11);
                    }
                }
                ctx.globalAlpha = 1;
                // big glowing moon
                const mx = s * 0.76, my = s * 0.16;
                const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 150);
                halo.addColorStop(0, 'rgba(255,246,214,0.55)');
                halo.addColorStop(1, 'rgba(255,246,214,0)');
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(mx, my, 150, 0, Math.PI * 2);
                ctx.fill();
                const moon = ctx.createRadialGradient(mx - 14, my - 14, 4, mx, my, 58);
                moon.addColorStop(0, '#fffdf4');
                moon.addColorStop(0.8, '#ffedb8');
                moon.addColorStop(1, '#f4d88a');
                ctx.fillStyle = moon;
                ctx.beginPath();
                ctx.arc(mx, my, 58, 0, Math.PI * 2);
                ctx.fill();
                // craters
                ctx.fillStyle = 'rgba(200,170,110,0.35)';
                [[-18, 8, 9], [14, -12, 7], [4, 22, 12], [-28, -20, 6]].forEach(c => {
                    ctx.beginPath();
                    ctx.arc(mx + c[0], my + c[1], c[2], 0, Math.PI * 2);
                    ctx.fill();
                });
            });
        },

        makeSandTexture3D: function () {
            const tex = this.makeCanvasTex3D(256, (ctx, s) => {
                ctx.fillStyle = '#b98d54';
                ctx.fillRect(0, 0, s, s);
                const shades = ['#a87e48', '#c69a5f', '#b1854e', '#cfa468'];
                for (let i = 0; i < 2600; i++) {
                    ctx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
                    ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
                }
            });
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(7, 5);
            return tex;
        },

        makeGlowTexture3D: function (inner, outer) {
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

        makeCrate3D: function (x, z) {
            const g = this._duel;
            const group = new THREE.Group();
            const woodMat = new THREE.MeshStandardMaterial({color: 0x8a5a2e, roughness: 0.9});
            const box = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.05, 0.95), woodMat);
            box.position.y = 0.525;
            box.castShadow = true;
            box.receiveShadow = true;
            group.add(box);
            const bandMat = new THREE.MeshStandardMaterial({color: 0x4a3218, roughness: 0.7});
            [0.28, 0.78].forEach(y => {
                const band = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.0), bandMat);
                band.position.y = y;
                group.add(band);
            });
            group.position.set(x, 0, z === undefined ? 0.15 : z);
            g.scene.add(group);
            return group;
        },

        // A stacked sandbag wall - reads as proper battle cover
        makeSandbagWall3D: function (x) {
            const g = this._duel;
            const group = new THREE.Group();
            const colors = [0x7d6b43, 0x6d5c38, 0x86754a, 0x76653f];
            const rows = [
                {y: 0.19, count: 5, offset: 0},
                {y: 0.52, count: 4, offset: 0.21},
                {y: 0.85, count: 3, offset: 0.42},
            ];
            rows.forEach(row => {
                for (let i = 0; i < row.count; i++) {
                    const bag = new THREE.Mesh(
                        new THREE.SphereGeometry(0.32, 10, 8),
                        new THREE.MeshStandardMaterial({
                            color: colors[(i + row.count) % colors.length],
                            roughness: 1,
                        })
                    );
                    bag.scale.set(0.85, 0.62, 1.35);
                    bag.position.set(
                        (Math.random() - 0.5) * 0.06,
                        row.y,
                        -0.85 + row.offset + i * 0.44
                    );
                    bag.rotation.y = (Math.random() - 0.5) * 0.2;
                    bag.castShadow = true;
                    bag.receiveShadow = true;
                    group.add(bag);
                }
            });
            group.position.set(x, 0, 0.15);
            g.scene.add(group);
            return group;
        },

        // The ammo rack: a wooden stand behind the hero's wall holding the four
        // answer bullets. Clicking a bullet on the rack loads it into the gun.
        makeAmmoRack3D: function () {
            const g = this._duel;
            const rack = new THREE.Group();
            const woodMat = new THREE.MeshStandardMaterial({color: 0x6b4a26, roughness: 0.85});
            [-0.44, 0.44].forEach(lx => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 8), woodMat);
                leg.position.set(lx, 1.1, -0.05);
                leg.castShadow = true;
                rack.add(leg);
            });
            const board = new THREE.Mesh(
                new THREE.BoxGeometry(1.02, 1.78, 0.06),
                new THREE.MeshStandardMaterial({color: 0x54381c, roughness: 0.9})
            );
            board.position.set(0, 1.16, -0.05);
            board.castShadow = true;
            rack.add(board);
            // title plank
            const titleCanvas = document.createElement('canvas');
            titleCanvas.width = 512;
            titleCanvas.height = 96;
            const tctx = titleCanvas.getContext('2d');
            tctx.fillStyle = '#3e2a12';
            tctx.fillRect(0, 0, 512, 96);
            tctx.strokeStyle = '#f2b632';
            tctx.lineWidth = 8;
            tctx.strokeRect(4, 4, 504, 88);
            tctx.font = 'bold 56px Arial, sans-serif';
            tctx.textAlign = 'center';
            tctx.textBaseline = 'middle';
            tctx.fillStyle = '#ffe9b0';
            tctx.fillText('🔫 עמדת תחמושת', 256, 52);
            const titleTex = new THREE.CanvasTexture(titleCanvas);
            titleTex.encoding = THREE.sRGBEncoding;
            const title = new THREE.Mesh(
                new THREE.PlaneGeometry(1.25, 0.24),
                new THREE.MeshBasicMaterial({map: titleTex})
            );
            title.position.set(0, 2.2, -0.02);
            rack.add(title);

            rack.position.set(-4.5, 0, 1.65);
            // face the cover camera
            rack.rotation.y = Math.atan2(g.camPresets.cover.pos[0] - rack.position.x,
                                         g.camPresets.cover.pos[2] - rack.position.z);
            g.scene.add(rack);
            g.rack = rack;
            g.answerRoot = new THREE.Group();
            rack.add(g.answerRoot);
        },

        // Simple articulated stand-in figure (used until a GLB loads, and forever
        // when offline). Blue for the hero; the enemy variant gets horns.
        makeFigure3D: function (color, darkColor, horns) {
            const group = new THREE.Group();
            const mat = new THREE.MeshStandardMaterial({color: color, roughness: 0.6});
            const darkMat = new THREE.MeshStandardMaterial({color: darkColor, roughness: 0.7});
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.85, 12), mat);
            body.position.y = 0.85;
            body.castShadow = true;
            group.add(body);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), mat);
            head.position.y = 1.5;
            head.castShadow = true;
            group.add(head);
            const eye = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.05), darkMat);
            eye.position.set(0, 1.53, 0.2);
            group.add(eye);
            [-0.14, 0.14].forEach(lx => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.45, 8), darkMat);
                leg.position.set(lx, 0.22, 0);
                leg.castShadow = true;
                group.add(leg);
            });
            if (horns) {
                [-0.14, 0.14].forEach(hx => {
                    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 8), darkMat);
                    horn.position.set(hx, 1.75, 0);
                    horn.rotation.z = hx > 0 ? -0.4 : 0.4;
                    group.add(horn);
                });
            }
            return {group: group, model: null, mixer: null, actions: null, current: null, alive: true};
        },

        makeBolt3D: function (color) {
            const g = this._duel;
            const bolt = new THREE.Group();
            const core = new THREE.Mesh(
                new THREE.SphereGeometry(0.09, 10, 8),
                new THREE.MeshBasicMaterial({color: 0xffffff})
            );
            bolt.add(core);
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: this.makeGlowTexture3D('rgba(255,255,255,1)', 'rgba(255,255,255,0)'),
                color: color, blending: THREE.AdditiveBlending, depthWrite: false,
            }));
            glow.scale.setScalar(0.55);
            bolt.add(glow);
            const light = new THREE.PointLight(color, 0.9, 4);
            bolt.add(light);
            bolt.visible = false;
            g.scene.add(bolt);
            return bolt;
        },

        // --- model loading ---

        prepModel3D: function (model) {
            model.traverse(o => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.frustumCulled = false;
                }
            });
        },

        normalizeModel3D: function (model, height) {
            let box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            model.scale.setScalar(height / (size.y || 1));
            box = new THREE.Box3().setFromObject(model);
            model.position.y -= box.min.y;
            model.position.x -= (box.min.x + box.max.x) / 2;
            model.position.z -= (box.min.z + box.max.z) / 2;
        },

        loadHero3D: function () {
            const g = this._duel;
            if (typeof THREE.GLTFLoader === 'undefined' || typeof THREE.AnimationMixer === 'undefined') return;
            const spec = this.hero;
            new THREE.GLTFLoader().load(
                spec.url,
                gltf => {
                    if (!this._duel || this._duel !== g || this.hero !== spec) return;
                    const model = gltf.scene;
                    this.prepModel3D(model);
                    this.normalizeModel3D(model, spec.height);
                    // Swap: clear the stand-in / previous character (incl. gun)
                    if (g.hero.mixer) g.mixers = g.mixers.filter(m => m !== g.hero.mixer);
                    g.heroMuzzle = null;
                    g.hero.current = null;
                    for (let i = g.hero.group.children.length - 1; i >= 0; i--) {
                        g.hero.group.remove(g.hero.group.children[i]);
                    }
                    g.hero.group.add(model);
                    g.hero.model = model;
                    g.hero.spec = spec;
                    g.hero.mixer = new THREE.AnimationMixer(model);
                    g.mixers.push(g.hero.mixer);
                    g.hero.actions = {};
                    gltf.animations.forEach(clip => {
                        // Clip names may be prefixed, e.g. "CharacterArmature|Idle"
                        g.hero.actions[clip.name.toLowerCase().split('|').pop()] = g.hero.mixer.clipAction(clip);
                    });
                    // The pack ships every weapon variant attached; keep only the
                    // two-handed crossbow, and use it as the bolt's muzzle anchor.
                    model.traverse(o => {
                        const n = (o.name || '').toLowerCase();
                        if (spec.hideMeshes.indexOf(n) >= 0) o.visible = false;
                        if (n === spec.muzzleMesh) g.heroMuzzle = o;
                    });
                    this.setHeroClip(this.phase === 'load' ? 'hide' : 'idle');
                },
                undefined,
                err => console.warn('Duel hero model failed to load - keeping the stand-in figure.', err)
            );
        },

        loadEnemy3D: function () {
            const g = this._duel;
            if (!g) return;
            const spec = this.villain;
            if (g.enemy) {
                g.scene.remove(g.enemy.group);
                if (g.enemy.mixer) g.mixers = g.mixers.filter(m => m !== g.enemy.mixer);
            }
            // Stand-in monster appears immediately
            g.enemy = this.makeFigure3D(0xb03a3a, 0x5e1f1f, true);
            g.enemy.spec = spec;
            g.enemy.group.position.set(g.enemyHomeX, spec.y || 0, 0);
            g.enemy.group.rotation.y = -Math.PI / 2;
            g.scene.add(g.enemy.group);
            if (typeof THREE.GLTFLoader === 'undefined' || typeof THREE.AnimationMixer === 'undefined') return;
            const mine = g.enemy;
            new THREE.GLTFLoader().load(spec.url, gltf => {
                if (!this._duel || this._duel !== g || g.enemy !== mine) return;
                const model = gltf.scene;
                this.prepModel3D(model);
                this.normalizeModel3D(model, spec.height);
                for (let i = mine.group.children.length - 1; i >= 0; i--) {
                    mine.group.remove(mine.group.children[i]);
                }
                mine.group.add(model);
                mine.model = model;
                mine.mixer = new THREE.AnimationMixer(model);
                g.mixers.push(mine.mixer);
                mine.actions = {};
                gltf.animations.forEach(clip => {
                    // Clip names may be prefixed, e.g. "CharacterArmature|Idle"
                    mine.actions[clip.name.toLowerCase().split('|').pop()] = mine.mixer.clipAction(clip);
                });
                // Boss entrance: skeletons wake up from their inactive pose
                this.setEnemyClip('spawn', true);
            }, undefined, err => console.warn('Duel boss model failed to load - keeping the stand-in.', err));
        },

        // Background props from the KayKit dungeon pack: barrels, crate stacks
        // and banners that dress the two camps.
        loadProps3D: function () {
            const g = this._duel;
            if (typeof THREE.GLTFLoader === 'undefined') return;
            const loader = new THREE.GLTFLoader();
            const place = (url, height, spots) => {
                loader.load(url, gltf => {
                    if (!this._duel || this._duel !== g) return;
                    this.prepModel3D(gltf.scene);
                    spots.forEach(s => {
                        const prop = gltf.scene.clone(true);
                        this.normalizeModel3D(prop, height);
                        prop.position.set(s[0], 0, s[1]);
                        prop.rotation.y = s[2] || 0;
                        g.scene.add(prop);
                    });
                }, undefined, () => {});
            };
            place('assets/models/duel/props/barrel_large.gltf.glb', 0.85, [[-4.0, -0.6, 0.4], [4.4, 0.3, -0.7]]);
            place('assets/models/duel/props/barrel_small_stack.gltf.glb', 0.95, [[4.0, -1.2, 0.9]]);
            place('assets/models/duel/props/crates_stacked.gltf.glb', 1.15, [[-5.3, -1.4, 0.5], [5.6, -2.0, -0.3]]);
            place('assets/models/duel/props/banner_patternA_blue.gltf.glb', 2.3, [[-2.6, -2.4, 0.5]]);
            place('assets/models/duel/props/banner_patternA_red.gltf.glb', 2.3, [[2.6, -2.4, -0.5]]);
        },

        loadCrateModel3D: function () {
            const g = this._duel;
            if (typeof THREE.GLTFLoader === 'undefined') return;
            const loader = new THREE.GLTFLoader();
            const swapIn = model => {
                if (!this._duel || this._duel !== g) return;
                this.prepModel3D(model);
                g.crates.forEach(anchor => {
                    const crate = model.clone(true);
                    this.normalizeModel3D(crate, 1.15);
                    crate.position.set(anchor.position.x, 0, anchor.position.z);
                    g.scene.add(crate);
                    anchor.visible = false;
                });
            };
            if (window.SHOOTER_MODEL_DATA && window.SHOOTER_MODEL_DATA.crate) {
                const binary = atob(window.SHOOTER_MODEL_DATA.crate);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                loader.parse(bytes.buffer, '', gltf => swapIn(gltf.scene), () => {});
                return;
            }
            loader.load('assets/models/shooter/crate.glb', gltf => swapIn(gltf.scene), undefined, () => {});
        },

        // --- camera rig, answer bullets, suppression fire ---

        setCamPreset3D: function (name, dur) {
            const g = this._duel;
            if (!g) return;
            const p = g.camPresets[name];
            g.camMode = name;
            const portrait = g.camera.aspect < 0.9;
            const pos = (portrait && p.posP) ? p.posP : p.pos;
            const look = (portrait && p.lookP) ? p.lookP : p.look;
            if (!dur) {
                g.cam.pos.fromArray(pos);
                g.cam.look.fromArray(look);
                return;
            }
            ['x', 'y', 'z'].forEach((axis, i) => {
                this.tween3D(g.cam.pos, axis, pos[i], dur);
                this.tween3D(g.cam.look, axis, look[i], dur);
            });
        },

        // A clickable "cartridge card" - brass bullet icon + the answer text
        makeAnswerTexture3D: function (text) {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 160;
            const ctx = canvas.getContext('2d');
            const rr = (x, y, w, h, r) => {
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + w, y, x + w, y + h, r);
                ctx.arcTo(x + w, y + h, x, y + h, r);
                ctx.arcTo(x, y + h, x, y, r);
                ctx.arcTo(x, y, x + w, y, r);
                ctx.closePath();
            };
            rr(6, 6, 500, 148, 30);
            ctx.fillStyle = 'rgba(10, 14, 34, 0.92)';
            ctx.fill();
            ctx.lineWidth = 7;
            ctx.strokeStyle = '#f2b632';
            ctx.stroke();
            // brass cartridge pointing right
            const grad = ctx.createLinearGradient(0, 55, 0, 105);
            grad.addColorStop(0, '#f6d27a');
            grad.addColorStop(0.5, '#d8a23a');
            grad.addColorStop(1, '#a97a20');
            ctx.fillStyle = grad;
            rr(28, 55, 62, 50, 10);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(90, 55);
            ctx.quadraticCurveTo(126, 80, 90, 105);
            ctx.fill();
            // answer text, shrunk to fit
            let size = 62;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.7)';
            ctx.shadowBlur = 6;
            const plain = String(text).replace(/<[^>]*>/g, '').trim() || '?';
            do {
                ctx.font = 'bold ' + size + 'px Arial, sans-serif';
                size -= 4;
            } while (ctx.measureText(plain).width > 350 && size > 18);
            ctx.fillText(plain, 316, 82);
            const tex = new THREE.CanvasTexture(canvas);
            tex.encoding = THREE.sRGBEncoding;
            return tex;
        },

        buildAnswerCards3D: function () {
            const g = this._duel;
            if (!g) return;
            this.disposeAnswerCards3D();
            this.results.forEach((text, i) => {
                const mat = new THREE.MeshBasicMaterial({
                    map: this.makeAnswerTexture3D(text),
                    transparent: true,
                    depthTest: false,
                });
                const card = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), mat);
                card.renderOrder = 999;
                card.userData.answerIndex = i;
                // A vertical column of four bullets on the rack board
                card.scale.setScalar(0.55);
                card.position.set(0, 1.76 - i * 0.4, 0.01);
                g.answerRoot.add(card);
            });
            g.answerRoot.visible = true;
        },

        disposeAnswerCards3D: function () {
            const g = this._duel;
            if (!g) return;
            g.answerRoot.children.slice().forEach(card => {
                g.answerRoot.remove(card);
                if (card.material) {
                    if (card.material.map) card.material.map.dispose();
                    card.material.dispose();
                }
                if (card.geometry) card.geometry.dispose();
            });
        },

        // Visual response on the clicked card: the good bullet dives into the gun,
        // a wrong one turns gray and sags; the rest fade out
        answerFeedback3D: function (index, good) {
            const g = this._duel;
            if (!g) return;
            g.answerRoot.children.forEach(card => {
                if (card.userData.answerIndex === index) {
                    if (good) {
                        // The chosen bullet flies off the rack into the hero's gun
                        const target = g.answerRoot.worldToLocal(this.gunTip3D());
                        this.tween3D(card.position, 'x', target.x, 0.55, {ease: 'in'});
                        this.tween3D(card.position, 'y', target.y, 0.55, {ease: 'in'});
                        this.tween3D(card.position, 'z', target.z, 0.55, {ease: 'in'});
                        this.tween3D(card.scale, 'x', 0.06, 0.55, {ease: 'in'});
                        this.tween3D(card.scale, 'y', 0.06, 0.55, {ease: 'in'});
                    } else {
                        // A broken one turns gray and drops off the rack
                        card.material.color.set(0x4d4d4d);
                        this.tween3D(card.rotation, 'z', 0.5, 0.4);
                        this.tween3D(card.position, 'y', 0.12, 0.8, {ease: 'in'});
                        this.tween3D(card.material, 'opacity', 0.55, 0.8);
                    }
                } else {
                    this.tween3D(card.material, 'opacity', 0.12, 0.35);
                }
            });
        },

        // The boss shoots at your crate while you reload - pure drama, no damage
        suppress3D: function () {
            const g = this._duel;
            if (!g || !g.enemy || this.phase !== 'load') return;
            const spec = g.enemy.spec || {height: 2};
            const from = new THREE.Vector3(g.enemy.group.position.x - 0.4, (spec.y || 0) + spec.height * 0.5, 0);
            const to = new THREE.Vector3(-1.9 + Math.random() * 0.4, 0.95 + Math.random() * 0.45, 0.15);
            this.setEnemyClip('attack', true);
            duelSfx.whoosh();
            this.flyBolt3D(g.orb, from, to, 0.35, 0, () => {
                this.burst3D(to, 0xc45cff, 8, 2, 1.2);
            });
        },

        // --- animation helpers ---

        setClip3D: function (entity, name, oneShot) {
            if (!entity || !entity.actions) return;
            let key = (name || '').toLowerCase();
            // Semantic names (idle/run/shoot/hit/death/...) resolve through the
            // character spec's clips map to the model's own clip names.
            const clips = entity.spec && entity.spec.clips;
            if (clips && clips[key]) key = clips[key];
            if (!entity.actions[key]) {
                // Fall back to an idle-like clip - never accidentally play a death
                const candidates = [clips && clips.idle, 'idle', 'idle_combat', 'flying_idle'];
                key = candidates.find(c => c && entity.actions[c]) ||
                      Object.keys(entity.actions).find(k => k.indexOf('death') < 0);
            }
            if (!key || !entity.actions[key] || entity.current === key) return;
            const action = entity.actions[key];
            const prev = entity.current && entity.actions[entity.current];
            const once = !!oneShot;
            action.reset();
            action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat);
            action.clampWhenFinished = !!once;
            action.fadeIn(0.18).play();
            if (prev) prev.fadeOut(0.18);
            entity.current = key;
            if (once && entity.mixer) {
                // Drop back to idle when a one-shot clip ends
                const onDone = e => {
                    if (e.action !== action) return;
                    entity.mixer.removeEventListener('finished', onDone);
                    if (this._duel && entity.alive && entity.current === key) {
                        entity.current = null;
                        this.setClip3D(entity, 'idle');
                    }
                };
                entity.mixer.addEventListener('finished', onDone);
            }
        },

        setHeroClip: function (name, oneShot) {
            if (this._duel) this.setClip3D(this._duel.hero, name, oneShot);
        },

        setEnemyClip: function (name, oneShot) {
            if (this._duel && this._duel.enemy) this.setClip3D(this._duel.enemy, name, oneShot);
        },

        tween3D: function (obj, prop, to, dur, opts) {
            opts = opts || {};
            if (!this._duel) {
                if (opts.onDone) this.later(opts.onDone, dur * 1000);
                return;
            }
            this._duel.tweens.push({
                obj: obj, prop: prop, from: obj[prop], to: to, dur: dur, t: 0,
                ease: opts.ease || 'inout', onDone: opts.onDone,
            });
        },

        updateTweens3D: function (dt) {
            const g = this._duel;
            for (let i = g.tweens.length - 1; i >= 0; i--) {
                const tw = g.tweens[i];
                tw.t += dt;
                let k = Math.min(1, tw.t / tw.dur);
                if (tw.ease === 'inout') k = k * k * (3 - 2 * k);
                else if (tw.ease === 'in') k = k * k;
                else if (tw.ease === 'out') k = 1 - (1 - k) * (1 - k);
                tw.obj[tw.prop] = tw.from + (tw.to - tw.from) * k;
                if (tw.t >= tw.dur) {
                    g.tweens.splice(i, 1);
                    if (tw.onDone) tw.onDone();
                }
            }
        },

        burst3D: function (pos, color, count, speed, up) {
            const g = this._duel;
            if (!g) return;
            const geo = new THREE.SphereGeometry(0.055, 6, 5);
            const parts = [];
            for (let i = 0; i < (count || 14); i++) {
                const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
                    color: color, transparent: true, opacity: 1,
                    blending: THREE.AdditiveBlending, depthWrite: false,
                }));
                m.position.copy(pos);
                const a = Math.random() * Math.PI * 2;
                const v = (speed || 3) * (0.4 + Math.random() * 0.6);
                m.userData.vel = new THREE.Vector3(Math.cos(a) * v, (up || 1.6) * Math.random() * v * 0.8, Math.sin(a) * v * 0.4);
                g.scene.add(m);
                parts.push(m);
            }
            g.bursts.push({parts: parts, life: 0.6, t: 0});
        },

        updateBursts3D: function (dt) {
            const g = this._duel;
            for (let i = g.bursts.length - 1; i >= 0; i--) {
                const b = g.bursts[i];
                b.t += dt;
                const k = b.t / b.life;
                b.parts.forEach(p => {
                    p.userData.vel.y -= 6 * dt;
                    p.position.addScaledVector(p.userData.vel, dt);
                    p.material.opacity = Math.max(0, 1 - k);
                });
                if (b.t >= b.life) {
                    b.parts.forEach(p => {
                        g.scene.remove(p);
                        p.material.dispose();
                    });
                    g.bursts.splice(i, 1);
                }
            }
        },

        muzzleFlash3D: function (pos, color) {
            const g = this._duel;
            if (!g) return;
            g.flash.position.copy(pos);
            g.flash.material.color.set(color || 0xffc266);
            g.flash.visible = true;
            g.flashLight.position.copy(pos);
            g.flashLight.color.set(color || 0xffc266);
            g.flashLight.intensity = 2.4;
            this.later(() => {
                if (!this._duel) return;
                g.flash.visible = false;
                g.flashLight.intensity = 0;
            }, 90);
        },

        gunTip3D: function () {
            const g = this._duel;
            g.hero.group.updateMatrixWorld(true);
            if (g.heroMuzzle) {
                const v = new THREE.Vector3();
                g.heroMuzzle.getWorldPosition(v);
                v.x += 0.3;   // just past the crossbow tip, toward the enemy
                return v;
            }
            return g.gun.localToWorld(g.gunTipLocal.clone());
        },

        hitFlash3D: function (entity) {
            const g = this._duel;
            if (!g || !entity) return;
            const touched = [];
            entity.group.traverse(o => {
                if (o.isMesh && o.material && o.material.emissive) {
                    touched.push([o.material, o.material.emissive.getHex()]);
                    o.material.emissive.setHex(0xff2222);
                }
            });
            this.later(() => {
                touched.forEach(([m, hex]) => m.emissive.setHex(hex));
            }, 160);
        },

        // Sprint around the sandbag wall (never through it) via a waypoint at the
        // wall's near edge, facing the direction of travel.
        walkTo3D: function (out, cb) {
            const g = this._duel;
            if (!g) {
                this.later(cb, 900);
                return;
            }
            this.setHeroClip('run');
            this.setEnemyClip('run');
            const heroPts = out ? [[-2.7, 1.55], [g.heroOutX, 0.1]] : [[-2.7, 1.55], [g.heroHomeX, g.heroHomeZ]];
            const enemyPts = out ? [[2.7, 1.55], [g.enemyOutX, 0.1]] : [[2.7, 1.55], [g.enemyHomeX, 0]];
            let done = 0;
            const finish = () => {
                done += 1;
                if (done < 2 || !this._duel) return;
                g.hero.group.rotation.y = Math.PI / 2;
                g.enemy.group.rotation.y = -Math.PI / 2;
                this.setHeroClip('idle');
                this.setEnemyClip('idle');
                cb();
            };
            this.runPath3D(g.hero.group, heroPts, finish);
            this.runPath3D(g.enemy.group, enemyPts, finish);
        },

        runPath3D: function (group, points, onDone) {
            const speed = 3.6;   // m/s - a sprint, not a stroll
            const step = i => {
                if (!this._duel || i >= points.length) {
                    if (onDone) onDone();
                    return;
                }
                const tx = points[i][0], tz = points[i][1];
                const dx = tx - group.position.x;
                const dz = tz - group.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < 0.05) {
                    step(i + 1);
                    return;
                }
                this.tween3D(group.rotation, 'y', Math.atan2(dx, dz), 0.12);
                this.tween3D(group.position, 'x', tx, dist / speed, {ease: 'inout'});
                this.tween3D(group.position, 'z', tz, dist / speed, {ease: 'inout', onDone: () => step(i + 1)});
            };
            step(0);
        },

        flyBolt3D: function (bolt, from, to, dur, arc, onHit) {
            const g = this._duel;
            if (!g) {
                this.later(onHit, dur * 1000);
                return;
            }
            bolt.position.copy(from);
            bolt.visible = true;
            const state = {k: 0};
            this._duel.tweens.push({
                obj: state, prop: 'k', from: 0, to: 1, dur: dur, t: 0, ease: arc ? 'in' : 'linear',
                onDone: () => {
                    bolt.visible = false;
                    onHit();
                },
            });
            // Position is driven every frame off the tweened progress
            const drive = () => {
                if (!this._duel || !bolt.visible) return;
                bolt.position.lerpVectors(from, to, state.k);
                if (arc) bolt.position.y += Math.sin(Math.min(1, state.k) * Math.PI) * arc;
                requestAnimationFrame(drive);
            };
            drive();
        },

        heroShoot3D: function (superBolt, onHit) {
            const g = this._duel;
            this.setHeroClip('shoot', true);
            if (!g) {
                this.later(onHit, 600);
                return;
            }
            const from = this.gunTip3D();
            const spec = g.enemy.spec || {height: 2};
            const to = new THREE.Vector3(g.enemy.group.position.x - 0.25, (spec.y || 0) + spec.height * 0.55, 0);
            this.muzzleFlash3D(from, superBolt ? 0x66eaff : 0xffc266);
            const bolt = superBolt ? g.superBolt : g.bolt;
            this.flyBolt3D(bolt, from, to, 0.24, 0, () => {
                this.burst3D(to, superBolt ? 0x66eaff : 0xffc935, superBolt ? 26 : 16, superBolt ? 4.5 : 3);
                this.hitFlash3D(g.enemy);
                this.setEnemyClip('hit', true);
                // Knockback flinch
                this.tween3D(g.enemy.group.position, 'x', g.enemy.group.position.x + 0.25, 0.1, {
                    onDone: () => this.tween3D(g.enemy.group.position, 'x', g.enemyOutX, 0.25),
                });
                onHit();
            });
        },

        dudDrop3D: function (onDone) {
            const g = this._duel;
            if (!g) {
                this.later(onDone, 900);
                return;
            }
            const from = this.gunTip3D();
            const to = new THREE.Vector3(from.x + 1.1, 0.06, 0.1);
            this.flyBolt3D(g.dudBolt, from, to, 0.55, 0.25, () => {
                this.burst3D(to, 0x9e9e9e, 10, 1.2, 2.2);   // gray smoke puff
                onDone();
            });
        },

        enemyShoot3D: function (onHit) {
            const g = this._duel;
            if (!g) {
                this.later(onHit, 600);
                return;
            }
            const spec = g.enemy.spec || {height: 2};
            const from = new THREE.Vector3(g.enemy.group.position.x - 0.4, (spec.y || 0) + spec.height * 0.5, 0);
            const to = new THREE.Vector3(g.hero.group.position.x + 0.25, 0.95, 0);
            this.muzzleFlash3D(from, 0xc45cff);
            this.setEnemyClip('attack', true);
            this.flyBolt3D(g.orb, from, to, 0.28, 0, () => {
                this.burst3D(to, 0xc45cff, 16, 3);
                this.hitFlash3D(g.hero);
                this.tween3D(g.hero.group.position, 'x', g.hero.group.position.x - 0.25, 0.1, {
                    onDone: () => this.tween3D(g.hero.group.position, 'x', g.heroOutX, 0.25),
                });
                onHit();
            });
        },

        enemyDie3D: function () {
            const g = this._duel;
            if (!g || !g.enemy) return;
            g.enemy.alive = false;
            const pos = g.enemy.group.position.clone();
            pos.y += 1;
            this.burst3D(pos, 0xffd54f, 30, 4);
            const deathClip = (g.enemy.spec.clips || {}).death || 'death';
            if (g.enemy.actions && g.enemy.actions[deathClip]) {
                // Real baked death animation - the body stays down until reset
                this.setClip3D(g.enemy, 'death', true);
            } else {
                this.tween3D(g.enemy.group.rotation, 'z', -Math.PI / 2, 0.8, {ease: 'in'});
                this.tween3D(g.enemy.group.position, 'y', (g.enemy.spec.y || 0) - 0.15, 0.8, {
                    onDone: () => {
                        this.later(() => {
                            if (!this._duel || !g.enemy || g.enemy.alive) return;
                            this.burst3D(g.enemy.group.position.clone().setY(0.5), 0xffffff, 20, 2.5);
                            g.enemy.group.visible = false;
                        }, 700);
                    },
                });
            }
        },

        heroDie3D: function () {
            const g = this._duel;
            if (!g) return;
            g.hero.alive = false;
            const heroDeath = (g.hero.spec && g.hero.spec.clips) ? g.hero.spec.clips.death : 'death';
            if (g.hero.actions && g.hero.actions[heroDeath]) {
                this.setHeroClip('death', true);
            } else {
                this.tween3D(g.hero.group.rotation, 'z', Math.PI / 2, 0.8, {ease: 'in'});
            }
        },

        enemyCheer3D: function () {
            const g = this._duel;
            if (!g || !g.enemy) return;
            const cheerClip = (g.enemy.spec.clips || {}).cheer;
            if (g.enemy.actions && g.enemy.actions[cheerClip]) {
                this.setEnemyClip('cheer');
                return;
            }
            // Victory hops for the procedural stand-in boss
            const hop = n => {
                if (!this._duel || n <= 0) return;
                this.tween3D(g.enemy.group.position, 'y', (g.enemy.spec.y || 0) + 0.45, 0.25, {
                    ease: 'out',
                    onDone: () => this.tween3D(g.enemy.group.position, 'y', g.enemy.spec.y || 0, 0.25, {
                        ease: 'in', onDone: () => hop(n - 1),
                    }),
                });
            };
            hop(4);
        },

        resetStage3D: function () {
            const g = this._duel;
            if (!g) return;
            g.tweens = [];
            this.setCamPreset3D('cover');
            const swapBoss = !g.enemy || (g.enemy.spec && g.enemy.spec.key !== this.villain.key) || !g.enemy.alive;
            g.hero.alive = true;
            g.hero.group.visible = true;
            g.hero.group.rotation.set(0, Math.PI / 2, 0);
            g.hero.group.position.set(g.heroHomeX, 0, g.heroHomeZ);
            this.setHeroClip('hide');
            if (swapBoss) {
                this.loadEnemy3D();
            } else {
                g.enemy.group.position.set(g.enemyHomeX, g.enemy.spec.y || 0, 0);
                g.enemy.group.rotation.set(0, -Math.PI / 2, 0);
            }
        },
    },

    mounted: function () {
        this.initScene3D();
        this.resetStage3D();
        // create() ran in created(), before the scene existed - build the
        // in-world answer cards for the question it already generated.
        if (this.phase === 'load' && this.results.length) {
            this.buildAnswerCards3D();
        }
    },

    beforeDestroy() {
        this.clearTimers();
        const g = this._duel;
        if (g) this.disposeAnswerCards3D();
        this._duel = null;
        if (this._onResize) window.removeEventListener('resize', this._onResize);
        if (this._onFsChange) document.removeEventListener('fullscreenchange', this._onFsChange);
        if (g) {
            if (this._onPointer && g.renderer) {
                g.renderer.domElement.removeEventListener('pointerdown', this._onPointer);
            }
            cancelAnimationFrame(g.raf);
            if (g.renderer) {
                g.renderer.dispose();
                if (g.renderer.domElement && g.renderer.domElement.parentNode) {
                    g.renderer.domElement.parentNode.removeChild(g.renderer.domElement);
                }
            }
        }
    },
}));



// Wizard Duel - a Prodigy-style turn-based battle. A painted daytime scene with
// an animated 3D mage (left) facing a monster boss (right) on a transparent
// canvas layer. The question floats in a burning magic circle in the middle and
// the answers are big buttons at the bottom. A correct answer casts a fireball
// at the boss; a wrong one lets the boss strike back. Hero has 100 HP, bosses
// get tougher (30/45/60). Same learning engine as every other game.
var WizardDuelComponent = Vue.component('wizard-duel', Vue.extend({
    template: `
    <div class="container">
        <div class="ds3-wrap wd-wrap" ref="wrap" :class="{'ds-shake': arenaShake}">
            <div class="wd-stage" ref="stage"></div>

            <div class="ds3-progress" v-if="progress && progress.total">
                <div class="ds3-progress-fill" :style="{width: (progress.progress / progress.total * 100) + '%'}"></div>
            </div>

            <div class="wd-chip wd-chip-left" dir="rtl">
                <div class="wd-avatar">🧙</div>
                <div class="wd-chipbody">
                    <div class="wd-chipname">אני <span class="wd-coins">🪙 {{ score }}</span></div>
                    <div class="wd-hpbar"><div class="wd-hpfill" :style="hpStyle(playerHp, maxHp)"></div>
                        <span class="wd-hptext">{{ playerHp }} / {{ maxHp }}</span></div>
                </div>
            </div>
            <div class="wd-chip wd-chip-right" dir="rtl">
                <div class="wd-avatar">{{ boss.icon }}</div>
                <div class="wd-chipbody">
                    <div class="wd-chipname">{{ boss.name }} <span class="wd-coins">{{ bossIndex + 1 }}/{{ bosses.length }}</span></div>
                    <div class="wd-hpbar"><div class="wd-hpfill" :style="hpStyle(enemyHp, boss.hp)"></div>
                        <span class="wd-hptext">{{ enemyHp }} / {{ boss.hp }}</span></div>
                </div>
            </div>

            <div class="wd-circle" v-if="started && phase === 'question'">
                <div class="wd-flame">🔥</div>
                <div class="wd-question" v-html="exercise"></div>
            </div>

            <div class="ds3-flash" v-if="message.value"
                 v-bind:class="{ 'error': message.error, 'success': message.success }">{{ message.value }}</div>

            <div v-for="d in dmgPops" :key="'dp'+d.id" class="ds-dmg" :style="{left: d.x + '%', color: d.color}">{{ d.text }}</div>
            <template v-if="phase === 'victory'">
                <div v-for="c in confetti" :key="'cf'+c.id" class="ds-confetti"
                     :style="{left: c.left + '%', background: c.color, animationDelay: c.delay + 's'}"></div>
            </template>

            <div class="wd-answers" v-if="started && phase === 'question'" dir="rtl">
                <a v-for="(result, index) in results" :key="'a'+index" class="wd-answer"
                   v-on:click="answer(index)">{{ result }}</a>
            </div>

            <a class="ds3-fs-btn" @click="toggleFullscreen"><i class="material-icons">fullscreen</i></a>

            <div class="ds3-start" v-if="!started" @click="startGame">
                <h4>🧙 דו-קרב הקוסמים 🔥</h4>
                <p v-if="currentApp && currentApp.title">{{ currentApp.title }}</p>
                <p>ענה נכון והקוסם יטיל כדור אש על המפלצת. טעות - והמפלצת תוקפת אותך!</p>
                <a class="btn-large amber darken-2 ds3-start-btn">▶ התחל במסך מלא</a>
            </div>
        </div>
    </div>`,

    extends: BaseGameComponent,

    data: function() { return {
        phase: 'question',      // 'question' | 'anim' | 'victory' | 'defeat'
        results: [],
        maxHp: 100,
        playerHp: 100,
        enemyHp: 30,
        locked: false,
        started: false,
        arenaShake: false,
        streak: 0,
        bossIndex: 0,
        hero: {
            url: 'assets/models/duel/Mage.glb', height: 1.75,
            clips: {idle: 'idle', attack: 'spellcast_shoot', hit: 'hit_a', death: 'death_a', cheer: 'cheer'},
            muzzleMesh: '2h_staff',
        },
        bosses: [
            {key: 'orc',    icon: '👹', name: 'האורק',      url: 'assets/models/maze/orc.glb',    height: 2.0, y: 0,   hp: 30,
             clips: {idle: 'idle',        attack: 'punch',    hit: 'hitreact', death: 'death', cheer: 'yes'}},
            {key: 'ghost',  icon: '👻', name: 'רוח הרפאים', url: 'assets/models/maze/ghost.glb',  height: 1.9, y: 0.3, hp: 45,
             clips: {idle: 'flying_idle', attack: 'headbutt', hit: 'hitreact', death: 'death', cheer: 'yes'}},
            {key: 'dragon', icon: '🐉', name: 'הדרקון',     url: 'assets/models/maze/dragon.glb', height: 2.5, y: 0.3, hp: 60,
             clips: {idle: 'flying_idle', attack: 'headbutt', hit: 'hitreact', death: 'death', cheer: 'headbutt'}},
        ],
        fxId: 0,
        dmgPops: [],
        confetti: [],
        timeouts: [],
    }},

    computed: {
        boss: function() {
            return this.bosses[this.bossIndex % this.bosses.length];
        },
    },

    methods: {
        create: function () {
            this.clearTimers();
            this.bossIndex = getLocalStorage(`${this.currentAppId}_wizard_boss`, 0) % this.bosses.length;
            this.playerHp = this.maxHp;
            this.enemyHp = this.boss.hp;
            this.phase = 'question';
            this.streak = 0;
            this.dmgPops = [];
            this.confetti = [];
            this.message = {};
            this.resetStageWd();
            this.nextQuestion();
            // Honor the news screen / level-complete navigation (see MCQComponent)
            this.reloadProgress();
        },

        nextQuestion: function () {
            let question = generateFromList(this.currentApp.listName, this.currentApp.questionIndex,
                                            this.currentApp.resultIndex, this.currentAppId,
                                            getSetItems(this.currentApp), questionType=this.currentApp.questionType);
            this.results = this.shuffle(question.options);
            this.exercise = question.question;
            this.result = question.result;
            this.questionIndex = question.questionIndex;
            this.phase = 'question';
            question.action();
            this.locked = false;
            this.$forceUpdate();
        },

        refreshProgress: function () {
            this.progress = getCurrentLevelProgress(this.currentAppId);
        },

        hpStyle: function (hp, max) {
            const pct = Math.max(0, hp / max * 100);
            const color = pct > 60 ? '#43d675' : (pct > 30 ? '#ffb300' : '#ff5252');
            return {width: pct + '%', backgroundColor: color};
        },

        startGame: function () {
            duelSfx.unlock();
            this.started = true;
            this.enterFullscreenWd();
        },

        enterFullscreenWd: function () {
            const el = this.$refs.wrap;
            if (!el || document.fullscreenElement) return;
            const req = el.requestFullscreen || el.webkitRequestFullscreen;
            if (!req) return;
            try {
                const p = req.call(el);
                const lock = () => {
                    try {
                        if (screen.orientation && screen.orientation.lock) {
                            screen.orientation.lock('landscape').catch(() => {});
                        }
                    } catch (e) {}
                };
                if (p && p.then) { p.then(lock).catch(() => {}); } else { lock(); }
            } catch (e) {}
        },

        toggleFullscreen: function () {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            } else {
                this.started = true;
                this.enterFullscreenWd();
            }
        },

        answer: function (index) {
            if (this.locked || this.phase !== 'question') {
                return
            }
            this.locked = true;
            duelSfx.unlock();
            const good = this.results[index] === this.result;
            if (good) {
                successSound.play();
                updateWeightForKey(this.currentAppId, this.questionIndex, -1);
                this.score += 1;
                this.streak += 1;
                this.saveScore();
                this.refreshProgress();
                this.phase = 'anim';
                const crit = this.streak % 3 === 0;
                const dmg = (9 + Math.floor(Math.random() * 5)) * (crit ? 2 : 1);
                this.message = crit ? {value: 'רצף של ' + this.streak + '! כדור אש ענק! 🔥🔥', success: true}
                                    : {value: 'לחש מוצלח! 🔥', success: true};
                this.heroCastWd(crit, () => {
                    this.enemyHp = Math.max(0, this.enemyHp - dmg);
                    this.dmgPop(72, '-' + dmg, crit ? '#00e5ff' : '#ffd54f');
                    this.shakeWd();
                    duelSfx.boom();
                    if (this.enemyHp <= 0) {
                        this.later(() => this.endBattle(true), 600);
                    } else {
                        this.later(() => { this.message = {}; this.nextQuestion(); }, 900);
                    }
                });
            } else {
                failureSound.play();
                this.score = Math.max(0, this.score - 1);
                this.streak = 0;
                updateWeightForKey(this.currentAppId, this.questionIndex, 1);
                this.saveScore();
                this.refreshProgress();
                this.phase = 'anim';
                const dmg = 7 + Math.floor(Math.random() * 6);
                this.message = {value: 'אופס! התשובה הנכונה: ' + this.result, error: true};
                this.bossAttackWd(() => {
                    this.playerHp = Math.max(0, this.playerHp - dmg);
                    this.dmgPop(24, '-' + dmg, '#ff8a80');
                    this.shakeWd();
                    duelSfx.hurt();
                    if (this.playerHp <= 0) {
                        this.later(() => this.endBattle(false), 600);
                    } else {
                        this.later(() => { this.message = {}; this.nextQuestion(); }, 1700);
                    }
                });
            }
        },

        endBattle: function (won) {
            this.phase = won ? 'victory' : 'defeat';
            if (won) {
                duelSfx.fanfare();
                successSound.play();
                const lastBoss = this.bossIndex === this.bosses.length - 1;
                this.score += lastBoss ? 10 : 5;
                this.saveScore();
                setLocalStorage(`${this.currentAppId}_wizard_boss`, (this.bossIndex + 1) % this.bosses.length);
                this.makeConfetti();
                if (this._wd && this._wd.enemy) this._wd.enemy.alive = false;
                this.setClipWd(this._wd && this._wd.enemy, 'death', true);
                this.setClipWd(this._wd && this._wd.hero, 'cheer');
                this.message = lastBoss
                    ? {value: 'אלוף הקוסמים!! ניצחת את כולם! 🏆👑', success: true}
                    : {value: 'ניצחון! ' + this.boss.name + ' מובס! 🏆', success: true};
            } else {
                duelSfx.sad();
                if (this._wd && this._wd.hero) this._wd.hero.alive = false;
                this.setClipWd(this._wd && this._wd.hero, 'death', true);
                this.setClipWd(this._wd && this._wd.enemy, 'cheer');
                this.message = {value: 'הפעם ' + this.boss.name + ' ניצח... ננסה שוב! 💪', error: true};
            }
            this.later(() => {
                if (this.reloadProgress()) {
                    this.create();
                }
            }, 3400);
        },

        makeConfetti: function () {
            const colors = ['#ffd54f', '#4fc3f7', '#81c784', '#f06292', '#ba68c8', '#ff8a65'];
            this.confetti = Array.from({length: 40}, (_, i) => ({
                id: i, left: Math.random() * 100, delay: Math.random() * 1.2,
                color: colors[i % colors.length],
            }));
        },

        dmgPop: function (x, text, color) {
            const id = ++this.fxId;
            this.dmgPops.push({id: id, x: x, text: text, color: color});
            this.later(() => { this.dmgPops = this.dmgPops.filter(d => d.id !== id); }, 1000);
        },

        shakeWd: function () {
            this.arenaShake = false;
            this.later(() => { this.arenaShake = true; }, 20);
            this.later(() => { this.arenaShake = false; }, 470);
        },

        later: function (fn, ms) {
            this.timeouts.push(setTimeout(fn, ms));
        },

        clearTimers: function () {
            this.timeouts.forEach(clearTimeout);
            this.timeouts = [];
        },

        // ------------------------------------------------------------------
        // 3D layer: transparent canvas with the two animated characters over a
        // painted cartoon backdrop. Callbacks always fire even without WebGL.
        // ------------------------------------------------------------------

        initStageWd: function () {
            if (typeof THREE === 'undefined' || !this.$refs.stage) return false;
            const area = this.$refs.stage;
            const g = this._wd = {
                area: area, clock: new THREE.Clock(), tweens: [], bursts: [], mixers: [],
            };
            g.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
            g.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            g.renderer.setSize(area.clientWidth, area.clientHeight);
            g.renderer.outputEncoding = THREE.sRGBEncoding;
            g.renderer.setClearColor(0x000000, 0);
            area.appendChild(g.renderer.domElement);

            g.scene = new THREE.Scene();
            g.camera = new THREE.PerspectiveCamera(38, area.clientWidth / area.clientHeight, 0.1, 50);
            g.camera.position.set(0, 1.9, 8.0);
            g.camera.lookAt(0, 1.2, 0);

            g.scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x9c8452, 1.05));
            const sun = new THREE.DirectionalLight(0xfff2cc, 0.9);
            sun.position.set(-4, 8, 6);
            g.scene.add(sun);

            // Soft blob shadows so the characters sit on the painted grass
            g.shadowTex = this.makeGlowTexWd('rgba(0,0,0,0.4)', 'rgba(0,0,0,0)');
            g.blobs = [-1.7, 1.7].map(x => {
                const blob = new THREE.Sprite(new THREE.SpriteMaterial({map: g.shadowTex, depthWrite: false}));
                blob.position.set(x, 0.05, 0);
                blob.scale.set(2.0, 0.55, 1);
                g.scene.add(blob);
                return blob;
            });

            g.hero = {group: new THREE.Group(), spec: this.hero, alive: true};
            g.hero.group.position.set(-1.7, 0, 0);
            g.hero.group.rotation.y = Math.PI / 2;
            g.scene.add(g.hero.group);
            this.loadCharWd(g.hero, this.hero, m => {
                m.traverse(o => { if ((o.name || '').toLowerCase() === this.hero.muzzleMesh) g.heroMuzzle = o; });
            });

            g.enemy = null;
            this.loadBossWd();

            g.bolt = this.makeBoltWd(0xff8c1a);
            g.orb = this.makeBoltWd(0xc45cff);
            this.layoutWd();

            this._onResizeWd = () => {
                if (!this._wd) return;
                const w = area.clientWidth, h = area.clientHeight;
                g.renderer.setSize(w, h);
                g.camera.aspect = w / h;
                g.camera.updateProjectionMatrix();
                this.layoutWd();
            };
            window.addEventListener('resize', this._onResizeWd);
            this._onFsWd = () => this.later(() => this._onResizeWd && this._onResizeWd(), 80);
            document.addEventListener('fullscreenchange', this._onFsWd);

            const loop = () => {
                if (!this._wd) return;
                g.raf = requestAnimationFrame(loop);
                const dt = Math.min(g.clock.getDelta(), 0.05);
                g.mixers.forEach(m => m.update(dt));
                // tweens
                for (let i = g.tweens.length - 1; i >= 0; i--) {
                    const tw = g.tweens[i];
                    tw.t += dt;
                    let k = Math.min(1, tw.t / tw.dur);
                    if (tw.ease === 'in') k = k * k;
                    else if (tw.ease !== 'linear') k = k * k * (3 - 2 * k);
                    tw.obj[tw.prop] = tw.from + (tw.to - tw.from) * k;
                    if (tw.t >= tw.dur) {
                        g.tweens.splice(i, 1);
                        if (tw.onDone) tw.onDone();
                    }
                }
                // particle bursts
                for (let i = g.bursts.length - 1; i >= 0; i--) {
                    const b = g.bursts[i];
                    b.t += dt;
                    b.parts.forEach(p => {
                        p.userData.vel.y -= 6 * dt;
                        p.position.addScaledVector(p.userData.vel, dt);
                        p.material.opacity = Math.max(0, 1 - b.t / b.life);
                    });
                    if (b.t >= b.life) {
                        b.parts.forEach(p => { g.scene.remove(p); p.material.dispose(); });
                        g.bursts.splice(i, 1);
                    }
                }
                g.renderer.render(g.scene, g.camera);
            };
            loop();
            return true;
        },

        // Fit both fighters in frame on any aspect ratio: pull the camera back
        // on narrow (portrait phone) screens and bring the fighters inward so
        // the question circle never hides them.
        layoutWd: function () {
            const g = this._wd;
            if (!g) return;
            const aspect = g.camera.aspect || 1;
            const dist = aspect >= 1.4 ? 7.6 : (aspect >= 0.9 ? 9.2 : 11.5);
            g.camera.position.set(0, 1.85, dist);
            g.camera.lookAt(0, 1.25, 0);
            const halfW = Math.tan(THREE.MathUtils.degToRad(g.camera.fov / 2)) * dist * aspect;
            g.sideX = Math.min(2.3, halfW * 0.62);
            if (g.hero) g.hero.group.position.x = -g.sideX;
            if (g.enemy) g.enemy.group.position.x = g.sideX;
            (g.blobs || []).forEach((b, i) => { b.position.x = i === 0 ? -g.sideX : g.sideX; });
        },

        // Paint the cartoon backdrop (sky, clouds, hills, ruins, grass) once
        paintBackdropWd: function () {
            if (!this.$refs.wrap) return;
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 640;
            const ctx = canvas.getContext('2d');
            const sky = ctx.createLinearGradient(0, 0, 0, 460);
            sky.addColorStop(0, '#5db4f0');
            sky.addColorStop(0.7, '#a8dcf7');
            sky.addColorStop(1, '#d9f0fb');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, 1200, 460);
            // sun glow
            const sun = ctx.createRadialGradient(180, 90, 6, 180, 90, 120);
            sun.addColorStop(0, 'rgba(255,250,210,0.95)');
            sun.addColorStop(1, 'rgba(255,250,210,0)');
            ctx.fillStyle = sun;
            ctx.fillRect(0, 0, 460, 260);
            // clouds
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            [[260, 110, 1], [640, 70, 1.3], [960, 130, 0.9], [80, 210, 0.7], [1120, 250, 0.65]].forEach(c => {
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.ellipse(c[0] + i * 34 * c[2] - 50 * c[2], c[1] + (i % 2) * 10, 42 * c[2], 26 * c[2], 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            // distant hills
            ctx.fillStyle = '#8fce7c';
            ctx.beginPath();
            ctx.ellipse(200, 480, 420, 90, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = '#7dbf6a';
            ctx.beginPath();
            ctx.ellipse(1000, 490, 460, 110, 0, Math.PI, 0);
            ctx.fill();
            // stone ruins: arches left + tower right
            const stone = '#b9b3a5', stoneDark = '#948e80';
            ctx.fillStyle = stone;
            ctx.fillRect(60, 300, 34, 160);
            ctx.fillRect(190, 300, 34, 160);
            ctx.fillRect(46, 280, 192, 30);
            ctx.fillStyle = stoneDark;
            ctx.fillRect(46, 280, 192, 8);
            ctx.fillStyle = stone;
            ctx.fillRect(980, 220, 150, 240);
            ctx.fillStyle = stoneDark;
            ctx.fillRect(980, 220, 150, 14);
            ctx.fillRect(1005, 260, 26, 36);
            ctx.fillRect(1075, 260, 26, 36);
            ctx.fillRect(1005, 320, 26, 36);
            ctx.fillRect(1075, 320, 26, 36);
            // grass
            const grass = ctx.createLinearGradient(0, 440, 0, 640);
            grass.addColorStop(0, '#8ed468');
            grass.addColorStop(1, '#5da944');
            ctx.fillStyle = grass;
            ctx.fillRect(0, 440, 1200, 200);
            ctx.fillStyle = 'rgba(255,255,255,0.16)';
            ctx.beginPath();
            ctx.ellipse(600, 452, 640, 26, 0, 0, Math.PI * 2);
            ctx.fill();
            this.$refs.wrap.style.backgroundImage = 'url(' + canvas.toDataURL() + ')';
            this.$refs.wrap.style.backgroundSize = 'cover';
            this.$refs.wrap.style.backgroundPosition = 'center';
        },

        makeGlowTexWd: function (inner, outer) {
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

        makeBoltWd: function (color) {
            const g = this._wd;
            const bolt = new THREE.Group();
            bolt.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8),
                                    new THREE.MeshBasicMaterial({color: 0xffffff})));
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: this.makeGlowTexWd('rgba(255,255,255,1)', 'rgba(255,255,255,0)'),
                color: color, blending: THREE.AdditiveBlending, depthWrite: false,
            }));
            glow.scale.setScalar(0.85);
            bolt.add(glow);
            bolt.visible = false;
            g.scene.add(bolt);
            return bolt;
        },

        loadCharWd: function (entity, spec, onModel) {
            const g = this._wd;
            if (typeof THREE.GLTFLoader === 'undefined' || typeof THREE.AnimationMixer === 'undefined') return;
            new THREE.GLTFLoader().load(spec.url, gltf => {
                if (!this._wd || this._wd !== g) return;
                const model = gltf.scene;
                model.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
                let box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                model.scale.setScalar(spec.height / (size.y || 1));
                box = new THREE.Box3().setFromObject(model);
                model.position.y -= box.min.y;
                model.position.x -= (box.min.x + box.max.x) / 2;
                model.position.z -= (box.min.z + box.max.z) / 2;
                model.position.y += spec.y || 0;
                entity.group.add(model);
                entity.model = model;
                entity.spec = spec;
                entity.mixer = new THREE.AnimationMixer(model);
                g.mixers.push(entity.mixer);
                entity.actions = {};
                gltf.animations.forEach(clip => {
                    entity.actions[clip.name.toLowerCase().split('|').pop()] = entity.mixer.clipAction(clip);
                });
                this.setClipWd(entity, 'idle');
                if (onModel) onModel(model);
            }, undefined, err => console.warn('Wizard duel model failed to load.', err));
        },

        loadBossWd: function () {
            const g = this._wd;
            if (!g) return;
            if (g.enemy) {
                g.scene.remove(g.enemy.group);
                if (g.enemy.mixer) g.mixers = g.mixers.filter(m => m !== g.enemy.mixer);
            }
            g.enemy = {group: new THREE.Group(), spec: this.boss, alive: true};
            g.enemy.group.position.set(g.sideX || 1.7, 0, 0);
            g.enemy.group.rotation.y = -Math.PI / 2;
            g.scene.add(g.enemy.group);
            this.loadCharWd(g.enemy, this.boss);
        },

        setClipWd: function (entity, name, oneShot) {
            if (!entity || !entity.actions) return;
            let key = (name || '').toLowerCase();
            const clips = entity.spec && entity.spec.clips;
            if (clips && clips[key]) key = clips[key];
            if (!entity.actions[key]) {
                const candidates = [clips && clips.idle, 'idle', 'idle_combat', 'flying_idle'];
                key = candidates.find(c => c && entity.actions[c]) ||
                      Object.keys(entity.actions).find(k => k.indexOf('death') < 0);
            }
            if (!key || !entity.actions[key] || entity.current === key) return;
            const action = entity.actions[key];
            const prev = entity.current && entity.actions[entity.current];
            action.reset();
            action.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat);
            action.clampWhenFinished = !!oneShot;
            action.fadeIn(0.18).play();
            if (prev) prev.fadeOut(0.18);
            entity.current = key;
            if (oneShot && entity.mixer) {
                const onDone = e => {
                    if (e.action !== action) return;
                    entity.mixer.removeEventListener('finished', onDone);
                    if (this._wd && entity.alive && entity.current === key) {
                        entity.current = null;
                        this.setClipWd(entity, 'idle');
                    }
                };
                entity.mixer.addEventListener('finished', onDone);
            }
        },

        tweenWd: function (obj, prop, to, dur, opts) {
            opts = opts || {};
            if (!this._wd) {
                if (opts.onDone) this.later(opts.onDone, dur * 1000);
                return;
            }
            this._wd.tweens.push({obj: obj, prop: prop, from: obj[prop], to: to, dur: dur, t: 0,
                                  ease: opts.ease, onDone: opts.onDone});
        },

        burstWd: function (pos, color, count) {
            const g = this._wd;
            if (!g) return;
            const geo = new THREE.SphereGeometry(0.06, 6, 5);
            const parts = [];
            for (let i = 0; i < (count || 16); i++) {
                const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
                    color: color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
                }));
                m.position.copy(pos);
                const a = Math.random() * Math.PI * 2;
                const v = 3.2 * (0.4 + Math.random() * 0.6);
                m.userData.vel = new THREE.Vector3(Math.cos(a) * v, 1.6 * Math.random() * v * 0.8, Math.sin(a) * v * 0.4);
                g.scene.add(m);
                parts.push(m);
            }
            g.bursts.push({parts: parts, life: 0.6, t: 0});
        },

        flyBoltWd: function (bolt, from, to, dur, onHit) {
            const g = this._wd;
            if (!g) {
                this.later(onHit, dur * 1000);
                return;
            }
            bolt.position.copy(from);
            bolt.visible = true;
            const state = {k: 0};
            g.tweens.push({obj: state, prop: 'k', from: 0, to: 1, dur: dur, t: 0, ease: 'linear',
                onDone: () => { bolt.visible = false; onHit(); }});
            const drive = () => {
                if (!this._wd || !bolt.visible) return;
                bolt.position.lerpVectors(from, to, state.k);
                bolt.position.y += Math.sin(Math.min(1, state.k) * Math.PI) * 0.5;
                requestAnimationFrame(drive);
            };
            drive();
        },

        heroCastWd: function (crit, onHit) {
            const g = this._wd;
            this.setClipWd(g && g.hero, 'attack', true);
            if (!g) {
                this.later(onHit, 700);
                return;
            }
            duelSfx.superPew();
            this.later(() => {
                if (!this._wd) { onHit(); return; }
                let from = new THREE.Vector3(g.hero.group.position.x + 0.4, 1.6, 0);
                if (g.heroMuzzle) {
                    g.hero.group.updateMatrixWorld(true);
                    g.heroMuzzle.getWorldPosition(from);
                }
                const spec = g.enemy ? g.enemy.spec : {height: 2, y: 0};
                const to = new THREE.Vector3(g.enemy ? g.enemy.group.position.x - 0.1 : 1.6, (spec.y || 0) + spec.height * 0.55, 0);
                g.bolt.children[1].scale.setScalar(crit ? 1.5 : 0.85);
                this.flyBoltWd(g.bolt, from, to, 0.4, () => {
                    this.burstWd(to, crit ? 0x66eaff : 0xff8c1a, crit ? 30 : 18);
                    this.setClipWd(g.enemy, 'hit', true);
                    onHit();
                });
            }, 450);
        },

        bossAttackWd: function (onHit) {
            const g = this._wd;
            this.setClipWd(g && g.enemy, 'attack', true);
            if (!g) {
                this.later(onHit, 700);
                return;
            }
            duelSfx.enemyPew();
            this.later(() => {
                if (!this._wd) { onHit(); return; }
                const spec = g.enemy ? g.enemy.spec : {height: 2, y: 0};
                const from = new THREE.Vector3(g.enemy.group.position.x - 0.4, (spec.y || 0) + spec.height * 0.5, 0);
                const to = new THREE.Vector3(g.hero.group.position.x + 0.1, 1.1, 0);
                this.flyBoltWd(g.orb, from, to, 0.4, () => {
                    this.burstWd(to, 0xc45cff, 16);
                    this.setClipWd(g.hero, 'hit', true);
                    onHit();
                });
            }, 450);
        },

        resetStageWd: function () {
            const g = this._wd;
            if (!g) return;
            g.tweens = [];
            g.hero.alive = true;
            g.hero.current = null;
            this.setClipWd(g.hero, 'idle');
            const swapBoss = !g.enemy || (g.enemy.spec && g.enemy.spec.key !== this.boss.key) || !g.enemy.alive;
            if (swapBoss) {
                this.loadBossWd();
            } else {
                g.enemy.current = null;
                this.setClipWd(g.enemy, 'idle');
            }
        },
    },

    mounted: function () {
        this.paintBackdropWd();
        this.initStageWd();
        this.resetStageWd();
    },

    beforeDestroy() {
        this.clearTimers();
        const g = this._wd;
        this._wd = null;
        if (this._onResizeWd) window.removeEventListener('resize', this._onResizeWd);
        if (this._onFsWd) document.removeEventListener('fullscreenchange', this._onFsWd);
        if (g) {
            cancelAnimationFrame(g.raf);
            if (g.renderer) {
                g.renderer.dispose();
                if (g.renderer.domElement && g.renderer.domElement.parentNode) {
                    g.renderer.domElement.parentNode.removeChild(g.renderer.domElement);
                }
            }
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
      <!-- Adventure mode is intentionally NOT linked here — it is reachable only
           by its direct URL (#/adventure) while it is still work in progress. -->
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
    {path: '/play/word_link/:currentAppId', component: WordLinkComponent, props: true },
    {path: '/play/balloon_shooter/:currentAppId', component: BalloonShooterComponent, props: true },
    {path: '/play/platformer/:currentAppId', component: PlatformerComponent, props: true },
    {path: '/play/treasure_maze/:currentAppId', component: TreasureMazeComponent, props: true },
    {path: '/play/duel_shooter/:currentAppId', component: DuelShooterComponent, props: true },
    {path: '/play/wizard_duel/:currentAppId', component: WizardDuelComponent, props: true },
    {path: '/display/news/:currentAppId', component: DisplayComponent, props: true },
    {path: '/display/all/:currentAppId', component: DisplayComponent, props: true },
    {path: '/display/item/:currentAppId/:itemId', component: DisplayComponent, props: true },
    {path: '/display/key/:currentAppId/:key/:value', component: DisplayComponent, props: true },
    { path: '/play/s2t/:currentAppId', component: SpeechToTextComponent, props: true },
    {path: '/signUp', component: SignUp},
    {path: '/login', component: Login },
]

// Adventure mode routes (adventure.js) — appended only when the module is loaded
if (typeof getAdventureRoutes === 'function') {
    getAdventureRoutes().forEach(route => routes.push(route));
}

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

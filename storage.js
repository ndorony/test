
function getUser() {
    user =  sessionStorage.getItem('username');
    if (! user && !localStorage.getItem('users')){
        localStorage.setItem('users', JSON.stringify([,'אורח']));
        sessionStorage.setItem('username', 'אורח');
        user = 'אורח';
    }
    return user;
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

function getProgress(key, total){
    return getLocalStorage(`${key}_Progress`, {progress:0,
                                               total:total});
}

function setProgress(key, total, progress){
    return setLocalStorage(`${key}_Progress`, {progress: progress,
                                               total: total});
}

function getScore(currentAppId){
    return getLocalStorage(`score${currentAppId}`, 0);
}

function setTheme(themeKey){
    console.log(`themeKey ${themeKey}`)
    return setLocalStorage('theme', themeKey);
}

function getTheme(){
    return themeOptions[getLocalStorage('theme', 'base')];
}

function setActivityMode(activityMode){
    return setLocalStorage('activityMode', activityMode);
}

function getActivityMode(){
    return getLocalStorage('activityMode', 'learn');
}

function getWeightsKey(key){
    return getKey(`${getActivityMode()}_${key}_Weights`)
}

function recordAttemptResult(key, index, isSuccess, limit=5){
    if (index === undefined || index === null){
        return;
    }
    const storageKey = getKey(`${key}_attemptHistory`);
    const history = getLocalStorage(`${key}_attemptHistory`, {});
    const itemHistory = history[index] || [];
    itemHistory.push(isSuccess);
    history[index] = itemHistory.slice(-limit);
    localStorage.setItem(storageKey, JSON.stringify(history));
}

function getAttemptHistory(key){
    return getLocalStorage(`${key}_attemptHistory`, {});
}

function setVoice(lang, uri){
    console.log(`Set ${lang} ${uri}`)
    localStorage.setItem(`${lang}_voice`, uri);
}

let voices = [];

function getVoice(lang){
    let voice;
       // Check if the voices array is empty and load voices if needed
    if (voices.length === 0) {
        console.log('Loading voices...');
        let synth = window.speechSynthesis;

        // Load voices asynchronously and populate the global voices array
        synth.onvoiceschanged = () => {
            voices = synth.getVoices();
        };

        // Force the voices to load if they haven't yet
        synth.getVoices();
    }
    uri = localStorage.getItem(`${lang}_voice`, null)
    console.log(`Get ${uri} ${lang} uri`)
    console.log(`${lang}_voice ${voices.length}`)
    if (uri) {
        voice = voices.find(v => v.voiceURI == uri);
        console.log(`Get ${voice} voice`)
    } else {
        rVoices = voices.filter(v => v.lang.startsWith(lang));

        if (rVoices.length > 0) {
            voice = rVoices[0];
       }
    }
    return voice
}

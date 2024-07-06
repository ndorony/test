
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

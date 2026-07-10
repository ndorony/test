# How to Add New Games

## Project Structure

The app has 3 main files for adding games:

| File | Purpose |
|------|---------|
| `data.js` | All learning data (word lists, questions, etc.) |
| `apps.js` | Menu structure and game configuration |
| `tester.js` | Game components and logic (usually no changes needed) |

---

## Step 1: Add Data to `data.js`

All data lives inside the `DATA` object in `data.js`. Each data list is an array of items.

### Basic Item Structure

Every item follows this format:

```javascript
{
  "field_name": {
    "type": "text",          // or "text_to_speech" or "audio"
    "value": "the content"
  }
}
```

### Field Types

| Type | Description |
|------|-------------|
| `text` | Plain text displayed on screen |
| `text_to_speech` | Text that is read aloud when clicked |
| `audio` | URL to an audio file |

### Example: Adding a Vocabulary List

Add a new array inside the `DATA` object:

```javascript
const DATA = {
    // ... existing data ...

    MY_NEW_LIST: [
        {
            "name": {"type": "text", "value": "the hebrew word"},
            "english_name": {"type": "text_to_speech", "value": "The English Word"},
            "hebrew_english_name": {"type": "text", "value": "transliteration"}
        },
        {
            "name": {"type": "text", "value": "another hebrew word"},
            "english_name": {"type": "text_to_speech", "value": "Another English Word"},
            "hebrew_english_name": {"type": "text", "value": "transliteration"}
        }
    ],

    // ... rest of data ...
};
```

### Example: Adding a Quiz / Question List

```javascript
MY_QUIZ: [
    {
        "question": {"type": "text", "value": "What is 2+2?"},
        "answer": {"type": "text", "value": "4"}
    },
    {
        "question": {"type": "text", "value": "What is 3+3?"},
        "answer": {"type": "text", "value": "6"}
    }
],
```

---

## Step 2: Add the Game to the Menu in `apps.js`

### How the Menu Works

The menu is a **tree structure** defined in the `apps` variable in `apps.js`.

```
apps (root)
  |-- menu: "main"
       |-- menu: "english"
       |    |-- app: "colors"
       |    |-- app: "animals"
       |    |-- menu: "songs"
       |         |-- app: "five little ducks"
       |         |-- app: "old macdonald"
       |
       |-- menu: "math"
       |    |-- app: "addition"
       |    |-- app: "subtraction"
```

### Menu Item Types

There are 2 types of items:

#### 1. `type: 'menu'` - A folder/submenu

```javascript
{
    name: 'Menu Display Name',    // shown in Hebrew
    type: 'menu',
    items: [
        // child items go here (can be apps or more menus)
    ]
}
```

#### 2. `type: 'app'` - A game/activity

```javascript
{
    icon: 'format_shapes',        // Material icon name
    name: 'Game Display Name',    // shown in Hebrew
    type: 'app',
    appType: 'mcq',               // game type (see below)
    listName: 'MY_NEW_LIST',      // name of the data array in DATA
    questionIndex: 'english_name',// which field to show as question
    resultIndex: 'name',          // which field is the correct answer
    setItems: 3                   // number of questions per round
}
```

### Available Game Types (`appType`)

| appType | Description | Use Case |
|---------|-------------|----------|
| `mcq` | Multiple Choice Quiz | Show a question, pick from 4 answers |
| `spell` | Spelling Game | Type the correct spelling |
| `common` | Match Game | Match pairs of related items |
| `draw_letter` | Draw Letter | Draw a letter on canvas |
| `falling_answers` | Falling Answers | Click the right answer as it falls |
| `word_link` | Word Link | Build or connect the answer from word/letter choices |
| `s2t` | Speech to Text | Say the answer out loud |
| `balloon_shooter` | 3D Balloon Range | First-person shooting range (Three.js) - shoot the balloon with the right answer |
| `platformer` | Learning Platformer | 2D Mario-style level (Phaser 3) - run and jump into the block with the right answer |
| `treasure_maze` | 3D Treasure Maze | First-person night maze (Three.js) - 3 gates, pick the door with the right answer to advance |
| `duel_shooter` | 3D Duel Shooter | Fullscreen 3D showdown (Three.js): crouch behind sandbags while the boss lays suppressing fire, pick answer-bullets off an in-world ammo rack (correct = golden bolt, 3-streak = double-damage super bolt, wrong = dud), then sprint out of cover for the duel against animated KayKit skeleton bosses + dragon. Switchable hero (mage/rogue/knight/robot). Duds fizzle and give the boss a shot back. 10 HP per side |
| `wizard_duel` | Wizard Duel | Prodigy-style turn battle: painted cartoon scene, animated 3D mage vs monster bosses (orc/ghost/dragon), question in a burning magic circle, big answer buttons. Correct = fireball at the boss (3-streak = critical x2), wrong = the boss strikes you. Hero 100 HP, bosses 30/45/60 |
| `water_pipeline` | Water Journey | Full-screen segment-based pipe journey with three generated-question blockages |

For a new interaction type, do not extend this table as your first step. Start at
`AGENTS.md`, complete `NEW_GAME_TEMPLATE.md`, and follow `NEW_GAME_WORKFLOW.md`.

### Key Configuration Fields

| Field | Description |
|-------|-------------|
| `listName` | Must match the array name in `data.js` (e.g., `'MY_NEW_LIST'`) |
| `questionIndex` | The field name shown as the question (e.g., `'english_name'`) |
| `resultIndex` | The field name that is the correct answer (e.g., `'name'`) |
| `setItems` | Number of questions per round (default varies, use 3-10) |
| `icon` | Material Design icon name (see https://fonts.google.com/icons) |

---

## Complete Example: Adding a New Song

### 1. Add Song Data in `data.js`

```javascript
MY_SONG: [
    {"name": {"type": "text", "value": "hebrew"}, "english_name": {"type": "text_to_speech", "value": "English"}, "hebrew_english_name": {"type": "text", "value": "transliteration"}},
    // ... more words
],
```

### 2. Add to Menu in `apps.js`

Find the songs section and add:

```javascript
{
    name: 'songs',
    type: 'menu',
    items: [
        // ... existing songs ...
        {icon: 'format_shapes', name:'Song Name', type: 'app', appType: 'mcq', listName: 'MY_SONG', questionIndex: 'english_name', resultIndex:'name', setItems: 3},
    ]
},
```

### 3. Splitting a Song into Verses

Create separate data arrays for each verse:

```javascript
MY_SONG_1: [ /* verse 1 words */ ],
MY_SONG_2: [ /* verse 2 words */ ],
MY_SONG_3: [ /* verse 3 words */ ],
```

Then create a submenu in `apps.js`:

```javascript
{
    name: 'Song Name',
    type: 'menu',
    items: [
        {icon: 'format_shapes', name:'all', type: 'app', appType: 'mcq', listName: 'MY_SONG', questionIndex: 'english_name', resultIndex:'name', setItems: 3},
        {icon: 'format_shapes', name:'verse 1', type: 'app', appType: 'mcq', listName: 'MY_SONG_1', questionIndex: 'english_name', resultIndex:'name', setItems: 3},
        {icon: 'format_shapes', name:'verse 2', type: 'app', appType: 'mcq', listName: 'MY_SONG_2', questionIndex: 'english_name', resultIndex:'name', setItems: 3},
        {icon: 'format_shapes', name:'verse 3', type: 'app', appType: 'mcq', listName: 'MY_SONG_3', questionIndex: 'english_name', resultIndex:'name', setItems: 3},
    ]
},
```

---

## Quick Checklist

1. Add your data array to `data.js` inside the `DATA` object
2. Make sure the array name in `data.js` matches the `listName` in `apps.js`
3. Make sure `questionIndex` and `resultIndex` match actual field names in your data items
4. Add the app entry to the correct menu section in `apps.js`
5. Test in the browser

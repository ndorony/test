apps =  {
    name: 'main',
    type: 'menu',
    items: [
    {
      name: 'אנגלית',
      type: 'menu',
      items: [
        {icon: 'format_shapes', name:'צבעים', type: 'app', appType: 'mcq', listName: 'COLORS', questionIndex: 'english_name', resultIndex: 'emoji' },
        {icon: 'format_shapes', name:'פעולות', type: 'app', appType: 'mcq', listName: 'VERBS', questionIndex: 'english_name', resultIndex: 'verb_hebrew'},
        {icon: 'format_shapes', name:'רגשות', type: 'app', appType: 'mcq', listName: 'FEELING', questionIndex: 'english_name', resultIndex: 'emoji'},
        {icon: 'format_shapes', name:'רגשות', type: 'app', appType: 'mcq', listName: 'FEELING', questionIndex: 'name', resultIndex: 'hebrew_english_name'},
        {icon: 'format_shapes', name:'מילות שאלה', type: 'app', appType: 'mcq', listName: 'QUESTION', questionIndex: 'english_name', resultIndex: 'question_word_hebrew' },
        {icon: 'format_shapes', name:'שם לאות', type: 'app', appType: 'mcq', listName: 'ABC', questionIndex: 'hebrewTransliteration', resultIndex: 'englishLowerCase' },
        {icon: 'format_shapes', name:'אות לשם', type: 'app', appType: 'mcq', listName: 'ABC', questionIndex: 'englishLowerCase', resultIndex: 'hebrewTransliteration' },
        {icon: 'volume_up', name:'שמע לאות גדולה', type: 'app', appType: 'mcq', listName: 'ABC', questionIndex: 'audio', resultIndex: 'englishUpperCase' },
        {icon: 'volume_up', name:'שמע לאות קטנה', type: 'app', appType: 'mcq', listName: 'ABC', questionIndex: 'audio', resultIndex: 'englishLowerCase' },
        {icon: 'format_size', name:'אות קטנה לגדולה', type: 'app', appType: 'mcq', listName: 'ABC', questionIndex: 'englishLowerCase', resultIndex: 'englishUpperCase' },
        {icon: 'format_size', name:'אות גדולה לקטנה', type: 'app', appType: 'mcq', listName: 'ABC', questionIndex: 'englishUpperCase', resultIndex: 'englishUpperCase' },
        {icon: 'format_shapes', name:'חיות', type: 'app', appType: 'mcq', listName: 'ANIMALS', questionIndex: 'english_name', resultIndex: 'hebrew'},
        {icon: 'format_shapes', name:'חלקי גוף', type: 'app', appType: 'mcq', listName: 'BODY_PARTS', questionIndex: 'english_name', resultIndex: 'hebrew'},
        {icon: 'format_shapes', name:'מספרים', type: 'app', appType: 'mcq', listName: 'NUMBERS', questionIndex: 'english_name', resultIndex: 'hebrew'},
        {icon: 'format_shapes', name:'צורות', type: 'app', appType: 'mcq', listName: 'SHAPES', questionIndex: 'english_name', resultIndex: 'hebrew'},
        {icon: 'format_shapes', name:'ימי השבוע', type: 'app', appType: 'mcq', listName: 'DAYS_OF_WEEK', questionIndex: 'english_name', resultIndex: 'hebrew'},
        {icon: 'format_shapes', name:'פירות וירקות', type: 'app', appType: 'mcq', listName: 'FRUITS_AND_VEGETABLES', questionIndex: 'english_name', resultIndex: 'hebrew'},
        {icon: 'format_shapes', name:'הכתבת חיות', type: 'app', appType: 'spell', listName: 'ANIMALS', questionIndex: 'english_name', setItems: 3},
        {icon: 'format_shapes', name:'אות חוזרת', type: 'app', appType: 'common', listName: 'ABC', a: 'englishUpperCase', b:'englishLowerCase', setItems: 10},
        {icon: 'format_shapes', name:'אותיות מבלבלות', type: 'app', appType: 'mcq', listName: 'CONFUSING_LETTERS', questionIndex: 'letter', resultIndex:'confusingLetter', setItems: 5},
        {icon: 'format_shapes', name:'אותיות מבלבלות משמיעה', type: 'app', appType: 'mcq', listName: 'CONFUSING_LETTERS', questionIndex: 'audio', resultIndex:'confusingLetter', setItems: 5},
        {icon: 'format_shapes', name:'משפחה', type: 'app', appType: 'mcq', listName: 'FAMILY', questionIndex: 'english_name', resultIndex:'hebrew', setItems: 3},
        {icon: 'format_shapes', name:'מזג אוויר', type: 'app', appType: 'mcq', listName: 'WEATHER', questionIndex: 'english_name', resultIndex:'hebrew', setItems: 3},
        {icon: 'format_shapes', name:'מילות יחס', type: 'app', appType: 'mcq', listName: 'PREPOSITIONS', questionIndex: 'english_name', resultIndex:'hebrew', setItems: 3},
        {icon: 'format_shapes', name:'מילים חדשות', type: 'app', appType: 'mcq', listName: 'COLUMN_WORDS', questionIndex: 'english_name', resultIndex:'hebrew', setItems: 10},
        {icon: 'record_voice_over', name: 'אמור את שם האות', type: 'app', appType: 's2t', listName: 'ABC', questionIndex: 'englishUpperCase', resultIndex: 'englishUpperCase', setItems: 5, title: 'אמור בקול את שם האות'},
        {
          name: 'אוצר מילים לפי נושאים',
          type: 'menu',
          items: [
            {icon: 'format_shapes', name:'אוכל', type: 'app', appType: 'mcq', listName: 'ENGLISH_VOCAB_FOOD', questionIndex: 'english_name', resultIndex: 'hebrew'},
            {icon: 'format_shapes', name:'אנשים ומשפחה', type: 'app', appType: 'mcq', listName: 'ENGLISH_VOCAB_PEOPLE_AND_FAMILY', questionIndex: 'english_name', resultIndex: 'hebrew'},
            {icon: 'format_shapes', name:'חפצים ומקומות', type: 'app', appType: 'mcq', listName: 'ENGLISH_VOCAB_OBJECTS_AND_PLACES', questionIndex: 'english_name', resultIndex: 'hebrew'},
            {icon: 'format_shapes', name:'ימים ומילות זמן', type: 'app', appType: 'mcq', listName: 'ENGLISH_VOCAB_DAYS_AND_TIMEWORDS', questionIndex: 'english_name', resultIndex: 'hebrew'},
            {icon: 'format_shapes', name:'מספרים', type: 'app', appType: 'mcq', listName: 'ENGLISH_VOCAB_NUMBERS', questionIndex: 'english_name', resultIndex: 'hebrew'},
            {icon: 'format_shapes', name:'רגשות וצרכים', type: 'app', appType: 'mcq', listName: 'ENGLISH_VOCAB_FEELINGS_AND_NEEDS', questionIndex: 'english_name', resultIndex: 'hebrew'},
            {icon: 'format_shapes', name:'מושגי זמן כלליים', type: 'app', appType: 'mcq', listName: 'ENGLISH_VOCAB_TIME_GENERAL', questionIndex: 'english_name', resultIndex: 'hebrew'},
            {icon: 'format_shapes', name:'פעולות יומיות', type: 'app', appType: 'mcq', listName: 'ENGLISH_VOCAB_DAILY_ACTIONS', questionIndex: 'english_name', resultIndex: 'hebrew'},
            {icon: 'format_shapes', name:'חלקי גוף', type: 'app', appType: 'mcq', listName: 'ENGLISH_VOCAB_BODY_PARTS', questionIndex: 'english_name', resultIndex: 'hebrew'},
            {icon: 'format_shapes', name:'שונות', type: 'app', appType: 'mcq', listName: 'ENGLISH_VOCAB_MISC', questionIndex: 'english_name', resultIndex: 'hebrew'},
            {icon: 'format_shapes', name:'הכל', type: 'app', appType: 'mcq', listName: 'ENGLISH_VOCAB_ALL', questionIndex: 'english_name', resultIndex: 'hebrew'},
          ]
        },


         {
      name: 'שירים',
      type: 'menu',
      items: [
        {icon: 'format_shapes', name:'חמש ברווזים', type: 'app', appType: 'mcq', listName: 'FIVE_LITTLE_DUCKS', questionIndex: 'english_name', resultIndex:'name', setItems: 3},
        {icon: 'format_shapes', name:'לדוד משה', type: 'app', appType: 'mcq', listName: 'OLD_MACDONALD', questionIndex: 'english_name', resultIndex:'name', setItems: 3},
        {icon: 'format_shapes', name:'חמש קופים קפצו על המיטה', type: 'app', appType: 'mcq', listName: 'FIVE_LITTLE_MONKEYS', questionIndex: 'english_name', resultIndex:'name', setItems: 3},
        {icon: 'format_shapes', name:'קפיצה', type: 'app', appType: 'mcq', listName: 'JUMP', questionIndex: 'english_name', resultIndex:'name', setItems: 3},
        {icon: 'format_shapes', name:'הנסיך', type: 'app', appType: 'mcq', listName: 'PRINCE', questionIndex: 'english_name', resultIndex:'name', setItems: 3},
        {icon: 'format_shapes', name:'גברים', type: 'app', appType: 'mcq', listName: 'MAN', questionIndex: 'english_name', resultIndex:'name', setItems: 3},
        {icon: 'format_shapes', name:'החופש הגדול', type: 'app', appType: 'mcq', listName: 'SUMMER_VACATION', questionIndex: 'english_name', resultIndex:'hebrew_english_name', setItems: 3},
        {icon: 'format_shapes', name:'שלג', type: 'app', appType: 'mcq', listName: 'SNOW', questionIndex: 'english_name', resultIndex:'name', setItems: 3},
       ]
      },
        {
          name: 'מילים לחזרה למבחן',
          type: 'menu',
          items: [
            {
              name: 'אנגלית לעברית',
              type: 'menu',
              items: [
                {icon: 'format_shapes', name:'בגדים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_CLOTHING', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'אוכל ושתייה', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_FOOD_AND_DRINK', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'פעולות וביטויים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_ACTIONS_AND_PHRASES', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'מספרים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_NUMBERS', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'תיאורים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_DESCRIPTIONS', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'מקומות וחדרים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_PLACES_AND_ROOMS', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'שונות', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_MISC', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'הכל', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_ALL', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 10},
              ]
            },
            {
              name: 'עברית לאנגלית',
              type: 'menu',
              items: [
                {icon: 'format_shapes', name:'בגדים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_CLOTHING', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'אוכל ושתייה', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_FOOD_AND_DRINK', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'פעולות וביטויים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_ACTIONS_AND_PHRASES', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'מספרים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_NUMBERS', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'תיאורים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_DESCRIPTIONS', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'מקומות וחדרים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_PLACES_AND_ROOMS', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'שונות', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_MISC', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'הכל', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_28_ALL', questionIndex: 'hebrew', resultIndex: 'english', setItems: 10},
              ]
            },
          ]
        },
        {
          name: 'מבחן חדש',
          type: 'menu',
          items: [
            {
              name: 'אנגלית לעברית',
              type: 'menu',
              items: [
                {icon: 'format_shapes', name:'זמן ותזכורות', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_TIME_AND_REMINDERS', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'בריאות וכושר', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_HEALTH_AND_FITNESS', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'חלקי גוף', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_BODY_PARTS', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'ספורט ותחרות', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_SPORTS_AND_COMPETITION', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'אוכל', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_FOOD', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'סדר ותיאורים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_ORDER_AND_DESCRIPTIONS', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'פעולות ואנשים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_VERBS_AND_PEOPLE', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 3},
                {icon: 'format_shapes', name:'הכל', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_ALL', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 10},
              ]
            },
            {
              name: 'עברית לאנגלית',
              type: 'menu',
              items: [
                {icon: 'format_shapes', name:'זמן ותזכורות', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_TIME_AND_REMINDERS', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'בריאות וכושר', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_HEALTH_AND_FITNESS', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'חלקי גוף', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_BODY_PARTS', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'ספורט ותחרות', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_SPORTS_AND_COMPETITION', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'אוכל', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_FOOD', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'סדר ותיאורים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_ORDER_AND_DESCRIPTIONS', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'פעולות ואנשים', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_VERBS_AND_PEOPLE', questionIndex: 'hebrew', resultIndex: 'english', setItems: 3},
                {icon: 'format_shapes', name:'הכל', type: 'app', appType: 'mcq', listName: 'ENGLISH_0_29_ALL', questionIndex: 'hebrew', resultIndex: 'english', setItems: 10},
              ]
            },
         {
          name: 'דקדוק - to be',
          type: 'menu',
          items: [
            {icon: 'format_shapes', name:'to be – הווה', type: 'app', appType: 'mcq', listName: 'ENGLISH_TO_BE_PRESENT', questionIndex: 'question', resultIndex: 'answer', setItems: 5},
            {icon: 'format_shapes', name:'to be – שלילה', type: 'app', appType: 'mcq', listName: 'ENGLISH_TO_BE_NEGATIVE', questionIndex: 'question', resultIndex: 'answer', setItems: 5},
            {icon: 'format_shapes', name:'Find and match', type: 'app', appType: 'mcq', listName: 'ENGLISH_TO_BE_MATCH', questionIndex: 'question', resultIndex: 'answer', setItems: 5},
            {icon: 'format_shapes', name:'Choose: am / is / are', type: 'app', appType: 'mcq', listName: 'ENGLISH_TO_BE_CHOOSE', questionIndex: 'question', resultIndex: 'answer', setItems: 5},
            {icon: 'format_shapes', name:'Complete', type: 'app', appType: 'mcq', listName: 'ENGLISH_TO_BE_COMPLETE', questionIndex: 'question', resultIndex: 'answer', setItems: 5},
          ]
        },

          ]
        },
      ]
    },
    {
      name: 'חשבון',
      type: 'menu',
      items: [
        {icon: 'add_circle_outline', name:'חיבור', type: 'app', appType: 'mcq', listName: 'ADDITION', questionIndex: 'question', resultIndex: 'answer', setItems: 10},
        {icon: 'remove_circle_outline', name:'חיסור', type: 'app', appType: 'mcq', listName: 'SUBTRACTION', questionIndex: 'question', resultIndex: 'answer', setItems: 10 },
        {icon: 'add_circle_outline', name:'כפל', type: 'app', appType: 'mcq', listName: 'MULTIPLICATION', questionIndex: 'question', resultIndex: 'answer', setItems: 10},
        {icon: 'remove_circle_outline', name:'חילוק', type: 'app', appType: 'mcq', listName: 'DIVISION', questionIndex: 'question', resultIndex: 'answer', setItems: 10},
        {icon: 'format_list_numbered', name:'ספירה', type: 'app', appType: 'mcq', listName: 'COUNT', questionIndex: 'question', resultIndex: 'answer'},
      ]
    },
    {
      name: 'ידע כללי',
      type: 'menu',
      items: [
        {icon: 'format_size', name:'חודשי השנה', type: 'app', appType: 'mcq', listName: 'MONTHS', questionIndex: 'name', resultIndex: 'month_number'},
        {icon: 'format_size', name:'ערי בירה', type: 'app', appType: 'mcq', listName: 'COUNTRIES', questionIndex: 'name', resultIndex: 'capital'},
        {icon: 'format_size', name:'אתרים מפורסמים', type: 'app', appType: 'mcq', listName: 'COUNTRIES', questionIndex: 'name', resultIndex: 'monument'},
        {icon: 'format_size', name:'סופרים', type: 'app', appType: 'mcq', listName: 'AUTHORS', questionIndex: 'name', resultIndex: 'book'},
        {icon: 'format_size', name:'מדענים', type: 'app', appType: 'mcq', listName: 'SCIENTISTS', questionIndex: 'name', resultIndex: 'theory'},
        {icon: 'format_size', name:'ציירים', type: 'app', appType: 'mcq', listName: 'PAINTERS', questionIndex: 'name', resultIndex: 'artwork'},
      ]
    },
    {
      name: 'עברית',
      type: 'menu',
      items: [
        {icon: 'format_size', name:'אותיות', type: 'app', appType: 'mcq', listName: 'hebrewAlphabet', questionIndex: 'letterName', resultIndex: 'letter'},
        {icon: 'format_size', name:'אותיות עם ניקוד', type: 'app', appType: 'mcq', listName: 'HEBREW_LETTERS_WITH_NIKUD', questionIndex: 'letter', resultIndex: 'letter', questionType: 'speech'},
        {icon: 'format_size', name:'השם שלי', type: 'app', appType: 'mcq', listName: 'NAME', questionIndex: 'letterName', resultIndex: 'letter'},
      ]
    },
    {
      name: 'תרגול',
      type: 'menu',
      items: [
        {icon: 'volume_up', name:' שמע לאות גדולה', type: 'app', appType: 'mcq', listName: 'practiceABC', questionIndex: 'audio', resultIndex: 'englishUpperCase', setItems: 4},
        {icon: 'record_voice_over', name: 'אמור את שם האות', type: 'app', appType: 's2t', listName: 'practiceABC', questionIndex: 'englishUpperCase', resultIndex: 'englishUpperCase', setItems: 5, title: 'אמור בקול את שם האות'},
        {icon: 'volume_up', name:' מה הצבע', type: 'app', appType: 'mcq', listName: 'FAVORITE_COLOR_LESSON', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 1},
      ]
    },
  ]
};

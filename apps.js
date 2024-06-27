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
        {icon: 'volume_up', name:'שמע לאות', type: 'app', appType: 'mcq', listName: 'ABC', questionIndex: 'audio', resultIndex: 'englishLowerCase' },
        {icon: 'format_size', name:'אות קטנה לגדולה', type: 'app', appType: 'mcq', listName: 'ABC', questionIndex: 'englishLowerCase', resultIndex: 'englishUpperCase' },
        {icon: 'format_size', name:'אות גדולה לקטנה', type: 'app', appType: 'mcq', listName: 'ABC', questionIndex: 'englishUpperCase', resultIndex: 'englishUpperCase' },
        {icon: 'format_shapes', name:'חיות', type: 'app', appType: 'mcq', listName: 'ANIMALS', questionIndex: 'english_name', resultIndex: 'hebrew'},
        {icon: 'format_shapes', name:'חלקי גוף', type: 'app', appType: 'mcq', listName: 'BODY_PARTS', questionIndex: 'english_name', resultIndex: 'hebrew'},
        {icon: 'format_shapes', name:'מספרים', type: 'app', appType: 'mcq', listName: 'NUMBERS', questionIndex: 'english_name', resultIndex: 'hebrew'},
        {icon: 'format_shapes', name:'צורות', type: 'app', appType: 'mcq', listName: 'SHAPES', questionIndex: 'english_name', resultIndex: 'hebrew'},
        {icon: 'format_shapes', name:'ימי השבוע', type: 'app', appType: 'mcq', listName: 'DAYS_OF_WEEK', questionIndex: 'english_name', resultIndex: 'hebrew'},
        {icon: 'format_shapes', name:'פירות וירקות', type: 'app', appType: 'mcq', listName: 'FRUITS_AND_VEGETABLES', questionIndex: 'english_name', resultIndex: 'hebrew'},
        {icon: 'format_shapes', name:'הכתבת חיות', type: 'app', appType: 'spell', listName: 'ANIMALS', questionIndex: 'english_name', setItems: 3},
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
    }
  ]
};

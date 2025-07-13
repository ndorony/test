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
  ]
};

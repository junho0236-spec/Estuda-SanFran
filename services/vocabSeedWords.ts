/**
 * Lista seed das ~500 palavras mais frequentes do inglês.
 * Usada no bootstrap do gerador i+1: quando o usuário ainda não tem
 * vocabulário 'known'/'learning' suficiente, assumimos que estas palavras
 * básicas já são compreendidas (o i+1 real vem da palavra nova).
 * Dado de módulo novo — não altera nada existente.
 */
export const VOCAB_SEED_WORDS: string[] = [
  // Function words / determiners / pronouns / auxiliaries
  'the', 'be', 'to', 'of', 'and', 'a', 'an', 'in', 'that', 'have', 'i', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but',
  'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'will', 'my',
  'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
  'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like',
  'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year',
  'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
  'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
  'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is',
  'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did', 'am', 'may',
  'might', 'must', 'shall', 'should', 'each', 'those', 'many', 'very', 'too',
  'here', 'where', 'why', 'such', 'own', 'same', 'off', 'while', 'during',
  'before', 'between', 'through', 'under', 'again', 'still', 'both', 'every',
  'few', 'more', 'much', 'little', 'long', 'great', 'old', 'right', 'big',
  'high', 'different', 'small', 'large', 'next', 'early', 'young', 'important',
  'public', 'bad', 'able',

  // Top verbs
  'keep', 'let', 'begin', 'seem', 'help', 'talk', 'turn', 'start', 'show',
  'hear', 'play', 'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen',
  'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include',
  'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch',
  'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend',
  'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider',
  'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay',
  'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass',
  'sell', 'require', 'report', 'decide', 'pull', 'feel', 'leave', 'call',
  'need', 'become', 'mean', 'tell', 'ask', 'try', 'put', 'find', 'carry',
  'close', 'drive', 'eat', 'sleep', 'drink', 'choose', 'catch', 'teach',
  'forget', 'hope', 'agree', 'receive', 'produce', 'fight', 'break', 'draw',
  'answer', 'explain', 'study', 'plan', 'prepare', 'improve', 'practice',
  'repeat', 'review', 'test', 'check', 'save', 'join', 'visit', 'enjoy',
  'finish', 'miss', 'wish', 'arrive', 'return', 'travel', 'happen', 'mind',
  'sound', 'wonder', 'smile', 'laugh', 'cry', 'dance', 'sing', 'cook', 'clean',

  // Top nouns
  'man', 'woman', 'child', 'children', 'person', 'friend', 'family', 'home',
  'house', 'room', 'door', 'window', 'table', 'chair', 'book', 'word',
  'sentence', 'question', 'answer', 'story', 'name', 'place', 'thing',
  'something', 'anything', 'nothing', 'everything', 'someone', 'anyone',
  'world', 'life', 'hand', 'part', 'eye', 'head', 'body', 'face', 'hair',
  'heart', 'water', 'food', 'money', 'street', 'city', 'country', 'school',
  'student', 'teacher', 'class', 'course', 'lesson', 'job', 'company',
  'business', 'office', 'team', 'group', 'case', 'point', 'fact', 'idea',
  'problem', 'number', 'kind', 'side', 'end', 'week', 'month', 'night',
  'morning', 'afternoon', 'evening', 'today', 'tomorrow', 'yesterday',
  'hour', 'minute', 'moment', 'system', 'program', 'line', 'area', 'power',
  'government', 'law', 'court', 'judge', 'right', 'war', 'peace', 'car',
  'bus', 'train', 'plane', 'road', 'park', 'sea', 'sun', 'moon', 'star',
  'tree', 'flower', 'dog', 'cat', 'bird', 'fish', 'music', 'song', 'movie',
  'game', 'ball', 'art', 'picture', 'color', 'light', 'air', 'fire', 'paper',
  'letter', 'note', 'phone', 'computer', 'internet', 'news', 'information',
  'example', 'reason', 'result', 'level', 'experience', 'skill', 'knowledge',
  'language', 'english', 'vocabulary', 'grammar', 'practice', 'progress',

  // Top adjectives / adverbs / numbers / misc
  'another', 'last', 'really', 'always', 'never', 'often', 'sometimes',
  'usually', 'soon', 'already', 'yet', 'almost', 'together', 'alone',
  'today', 'away', 'far', 'near', 'inside', 'outside', 'above', 'below',
  'behind', 'front', 'left', 'fast', 'slow', 'easy', 'hard', 'simple',
  'difficult', 'possible', 'impossible', 'true', 'false', 'real', 'sure',
  'certain', 'whole', 'half', 'full', 'empty', 'free', 'busy', 'happy',
  'sad', 'angry', 'tired', 'ready', 'afraid', 'sorry', 'glad', 'beautiful',
  'nice', 'fine', 'okay', 'wrong', 'strong', 'weak', 'rich', 'poor', 'hot',
  'cold', 'warm', 'cool', 'dry', 'wet', 'dark', 'bright', 'heavy', 'short',
  'tall', 'deep', 'wide', 'round', 'straight', 'red', 'blue', 'green',
  'white', 'black', 'yellow', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'hundred', 'thousand', 'million',
];

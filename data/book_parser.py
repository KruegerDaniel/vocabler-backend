import nltk
import ebooklib
import re
from ebooklib import epub
from nltk.corpus import wordnet as wn
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import MWETokenizer, word_tokenize
from datetime import datetime
import pymongo
import os

absolute_path = os.path.dirname(__file__)
relative_path = "books"
full_path = os.path.join(absolute_path, relative_path)

#!!!!!!!!!!!!!!!!!!!SET MANUALLY!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
START_PAGE = 0
END_PAGE = 6
GENRES = ["Fantasy", "Horror"]
BOOK_TITLE = 'The King in Yellow'
epub_path = f'{full_path}/{BOOK_TITLE}.epub'
book = epub.read_epub(epub_path)

COVER_IMAGE = './images/book-cover/' + 'the_king_in_yellow.jpg' #make sure image matches that in ./public/images/book-cover
LEXILE_SCORE = 1030 #https://hub.lexile.com/find-a-book/search
AUTHOR = book.get_metadata('DC', 'creator')[0][0]
DATE = book.get_metadata('DC', 'date')[0][0]
#!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

def get_wordnet_pos(tokens):
    '''Map POS tag to first character lemmatize() accepts'''
    pos = nltk.pos_tag(tokens)
    tag_dict = {'J': wn.ADJ,
                'S': wn.ADJ_SAT,
                'N': wn.NOUN,
                'V': wn.VERB,
                'R': wn.ADV}
    wn_pos_tags = []
    for token, pos_tag in pos:
        first_char = pos_tag[0].upper()
        wn_tag = tag_dict.get(first_char, None)
        wn_pos_tags.append((token, wn_tag))
        
    return wn_pos_tags

def clean_content(text):
    clean_text = re.sub(r'<[^>]+>', ' ', text.decode('utf-8'))
    clean_text = re.sub(r'&[^;]+', '', clean_text)
    clean_text = re.sub(r'\s+', ' ', clean_text)
    clean_text = re.sub(r'\xa0', '', clean_text)
    return clean_text

#levels loosely based on https://lexile.com/wp-content/uploads/2018/09/Lexile-Educator-Guide-MM0066W.pdf
def convert_lexile_score_to_scale(lexile_score):
    if lexile_score <= 295:
        return 1
    elif lexile_score <= 545:
        return 2
    elif lexile_score <= 760:
        return 3
    elif lexile_score <= 950:
        return 4
    elif lexile_score <= 1080:
        return 5
    elif lexile_score <= 1165:
        return 6
    elif lexile_score <= 1235:
        return 7
    elif lexile_score <= 1295:
        return 8
    elif lexile_score <= 1350:
        return 9
    else:
        return 10

published_date = datetime.strptime(DATE, '%Y-%m-%d')

# Extract all text
book_text = ''
items = list(book.get_items_of_type(ebooklib.ITEM_DOCUMENT))[START_PAGE : END_PAGE + 1]
page = 0
for item in items:
    page += 1
    content = clean_content(item.get_content())
    book_text += content

f = open(f'{absolute_path}/generated-texts/{BOOK_TITLE}.txt', 'w', encoding='utf-8')
f.write(book_text)
f.close()
print('EPub file content extracted')
#set up mongodb client
client = pymongo.MongoClient('mongodb://localhost:27017/')
db = client['vocablerDB']
book_collection = db['books']
wn_collection = db['lexicalentries']

#Set multi-word rules for mwetokenizer
multi_words = [x for x in wn.all_lemma_names() if re.search(r".+_.+", x)]
mwe_rules = [tuple(x.split("_")) for x in multi_words]

# initialize the lemmatizer and POS tagger
lemmatizer = WordNetLemmatizer()
mwetokenizer = MWETokenizer(mwe_rules)

sentences = nltk.sent_tokenize(book_text) 

vocabulary_list = []
unmatched_vocab_list = set()
total_word_count = 0
matched_word_count = 0

print('Word matching commencing')
for sentence in sentences:
    sentence = re.sub(r'\.(?!\s)', " ", sentence)
    # tokenize the text into non-empty words
    tokens = mwetokenizer.tokenize(word_tokenize(sentence.lower()))
    tokens = [x for x in tokens if len(x) > 1]
    
    token_pos_tags = get_wordnet_pos(tokens)
    # POS tag the tokens and lemmatize each verb
    for token, pos in token_pos_tags:
        total_word_count += 1
        print("word: ", token)
        #filter out POS not included in wordnet
        if pos == None:
            continue
        
        lemma = lemmatizer.lemmatize(token, pos)
        
        
        #index of token in the vocab
        index = next((i for i, obj in enumerate(vocabulary_list) if obj['lemma'] == lemma), None)
        
        if index is not None:
            vocabulary_list[index]['freq'] += 1
            matched_word_count += 1
            continue
        
        wn_entry = wn_collection.find_one({'lemma': lemma})
        if wn_entry == None:
            unmatched_vocab_list.add(lemma)
            continue
        wn_entry_id = wn_entry['_id']
        
        vocabulary_list.append({'lexicalEntryId': wn_entry_id, 'lemma': lemma, 'pos': pos, 'freq': 1})
        matched_word_count += 1
        
print('Book object creation commencing')
sorted_vocabulary = sorted(vocabulary_list, key=lambda x: x['freq'], reverse=True)

#insert into books collection
#published_date = datetime.strptime(DATE, '%Y-%m-%dT%H:%M:%S+00:00')

# map
difficulty = convert_lexile_score_to_scale(LEXILE_SCORE)

book_object = {
    'title': BOOK_TITLE, 
    'author': AUTHOR,
    'coverImage': COVER_IMAGE,
    'pages': int((total_word_count / 500) * 1.8),
    'publicationDate': published_date,
    'difficulty': difficulty,
    'genres': GENRES,
    'uniqueWords': len(sorted_vocabulary),
    'totalWords': matched_word_count,
    'vocabList': sorted_vocabulary,
    'reviews': [],
    'activity': [],
    'createdAt': datetime.now()
    }

book_collection.insert_one(book_object)

#Log unknown words
f = open(f'{absolute_path}/generated-texts/{BOOK_TITLE}_unknown_words.txt', 'w', encoding='utf-8')
for unknown_word in unmatched_vocab_list:
    f.write(f'{unknown_word}\n')
f.close()


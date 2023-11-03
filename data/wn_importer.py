import pymongo
import pandas as pd
from nltk.corpus import wordnet as wn
import os

#set up mongodb client
client = pymongo.MongoClient('mongodb://localhost:27017/')
db = client['vocablerDB']
wn_collection = db['lexicalentries']

#open frequency excel
df = pd.read_excel('dics/lemmas_60k.xlsx')

lemma_to_def = {}

#loop over all synsets
for lemma in wn.all_lemma_names():
    vocab_object = {"lemma": lemma}
    if lemma not in lemma_to_def.keys():
        print(lemma)
        lemma_to_def[f"{lemma}"] = []
        synsets = wn.synsets(lemma)
        for synset in synsets:
            pos = synset.pos()
            definition = synset.definition()
            examples = synset.examples()
            if pos not in vocab_object:
                vocab_object[pos] = {"definitions": [], "examples": [], "freqRank": -1}
            
            freq = -1
            index = (df["lemma"] == lemma) & (df['PoS'] == pos)
            if any(index):
                freq = int(df.loc[index, 'rank'])
            vocab_object[pos]['definitions'].append(definition)
            vocab_object[pos]['examples'] += examples
            vocab_object[pos]['freqRank'] = freq
            lemma_to_def[f"{lemma}"].append((pos, definition, examples))
    wn_collection.insert_one(vocab_object)
            
#An extra txt file
f = open("generated-texts/wn_list.txt", "w")
for lemma, info in lemma_to_def.items():
    string = str(info)
    f.write(f"{lemma}: {string}\n")
f.close()
client.close()
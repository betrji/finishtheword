// Membership bits reference the existing merged dictionary without shipping it twice.
import fs from 'node:fs';
const words=JSON.parse(fs.readFileSync('data/words.json','utf8')),bits=new Map();
for(const [lang,bit] of [['en',1],['es',2],['de',4]])for(const line of fs.readFileSync(`data/${lang}.txt`,'utf8').split(/\r?\n/)){
 if(!line||/^\s/.test(line))continue;
 const word=line.split('/')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').trim();
 if(/^[a-z]+$/.test(word))bits.set(word,(bits.get(word)||0)|bit);
}
fs.writeFileSync('data/word-languages.json',JSON.stringify(words.map(w=>bits.get(w)||0).join(''))+'\n');

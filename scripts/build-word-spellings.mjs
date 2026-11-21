// Lookup spellings only. Never changes the accepted word list or its language bits.
// Original ES/DE spellings retain the licenses in data/LICENSE-es and LICENSE-de.
import fs from 'node:fs';
const accepted=new Set(JSON.parse(fs.readFileSync('data/words.json','utf8')));
const output={};
for(const language of ['es','de']){
 const forms=new Map();
 for(const line of fs.readFileSync(`data/${language}.txt`,'utf8').split(/\r?\n/)){
  if(!line||/^\s/.test(line))continue;
  const spelling=line.split('/')[0].trim();
  const word=spelling.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');
  if(!accepted.has(word))continue;
  if(!forms.has(word))forms.set(word,new Set());
  forms.get(word).add(spelling);
 }
 // Identity-only entries need no extra data. Keep every variant when accents collapse.
 output[language]=Object.fromEntries([...forms].filter(([word,spellings])=>spellings.size>1||!spellings.has(word)).sort(([a],[b])=>a<b?-1:1).map(([word,spellings])=>[word,[...spellings].sort((a,b)=>a===word?-1:b===word?1:a<b?-1:1)]));
}
fs.writeFileSync('data/word-spellings.json',JSON.stringify(output)+'\n');
console.log(`Lookup spellings: ${Object.values(output).reduce((n,language)=>n+Object.keys(language).length,0)} normalized entries; accepted list unchanged.`);

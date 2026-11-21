import type {Language} from './daily';
export const definitionLanguages:Record<Language,string>={en:'English',es:'Español',de:'Deutsch'};
export const dictionarySection:Record<Language,string>={en:'English',es:'Spanish',de:'German'};
export type DefinitionSense={partOfSpeech:string,meaning:string};
export type WordDefinition={word:string,language:Language,languages:Language[],headword:string,spellings:string[],sourceUrl:string,searchUrl:string,status:'found'|'missing'|'unavailable'|'roman',senses:DefinitionSense[],license?:'3.0'|'4.0',romanValue?:number};
export const dictionaryUrl=(word:string,language:Language='en')=>`https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#${dictionarySection[language]}`;
export const dictionarySearchUrl=(word:string)=>`https://en.wiktionary.org/wiki/Special:Search?search=${encodeURIComponent(word)}`;

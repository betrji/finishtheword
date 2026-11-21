import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('lib/chat-filter.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText;
const filterURL='data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const moduleURL=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText).toString('base64');
const gameURL=moduleURL(fs.readFileSync('lib/game.ts','utf8'));
const submissionURL=moduleURL(fs.readFileSync('lib/word-submission.ts','utf8').replace("'./game'",JSON.stringify(gameURL)));
export function withChatFilter(source){return source.replace(/from ['"](?:\.\.?\/)+(?:lib\/)?chat-filter['"]/g,`from '${filterURL}'`).replace("'../../../lib/word-submission'",JSON.stringify(submissionURL));}

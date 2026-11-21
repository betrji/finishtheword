import fs from 'node:fs';import Module,{createRequire} from 'node:module';import ts from 'typescript';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);Module._extensions['.tsx']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2023}}).outputText,file);
const {connectionLabel}=require('../app/connection-status.tsx');
assert.equal(connectionLabel(1000,6500,true),'Connected','A normal five-second poll interval is not a disconnect');
assert.equal(connectionLabel(1000,12000,true),'Connected','One slow request does not flicker the warning');
assert.equal(connectionLabel(1000,17000,true),'Reconnecting','Sustained missing responses remain visible');
assert.equal(connectionLabel(17000,17001,false),'Offline','Known offline status is immediate');
assert.equal(connectionLabel(17000,17001,true),'Connected','Successful recovery clears the warning');
console.log('PASS: normal polling, slow response grace, sustained failures, offline and recovery states.');

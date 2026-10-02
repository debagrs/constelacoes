import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { DatabaseSync } from 'node:sqlite';
import { expandSearchTerms } from '../src/lib/search-dictionary.ts';
import { submissionImageSrc } from '../src/lib/image-url.ts';
const moduleUrl = code => `data:text/javascript;base64,${Buffer.from(ts.transpile(code, { module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022 })).toString('base64')}`;
const dict = moduleUrl(readFileSync(new URL('../src/lib/search-dictionary.ts', import.meta.url),'utf8'));
const source = readFileSync(new URL('../src/lib/multilingual-search.server.ts', import.meta.url),'utf8').replace('"./search-dictionary"', JSON.stringify(dict));
const { multilingualSearchTerms, interleaveUnique } = await import(moduleUrl(source));
for (const q of ['cão','dog','perro','犬','狗','كلب','개']) {
  const terms = expandSearchTerms(q,64);
  for (const expected of ['dog','perro','犬','狗','كلب','개']) assert(terms.includes(expected), `${q} => ${expected}`);
}
assert.deepEqual(expandSearchTerms('Andy Warhol'), ['Andy Warhol','andy warhol']);
assert(!expandSearchTerms('犬').includes('cat'));
assert.equal(submissionImageSrc('id','data:image/png;base64,YQ=='),'data:image/png;base64,YQ==');
assert.equal(submissionImageSrc('id','https://photos.app.goo.gl/example'),'/api/media?submissionId=id');
assert.deepEqual(interleaveUnique([[{id:'a'},{id:'b'}],[{id:'c'},{id:'a'}],[{id:'d'}]],4).map(x=>x.id),['a','c','d','b']);
const originalFetch = globalThis.fetch;
globalThis.fetch = async url => {
 const p = new URL(url).searchParams;
 return Response.json(p.get('action') === 'wbsearchentities' ? {search:[{id:'Qtest',label:'ponte',match:{text:'ponte'}}]} : {entities:{Qtest:{labels:{en:{value:'bridge'},ja:{value:'橋'},ar:{value:'جسر'}}}}});
};
const translated = await multilingualSearchTerms('ponte');
assert(translated.includes('橋') && translated.includes('bridge'));
globalThis.fetch = async () => { throw Error('offline'); };
assert((await multilingualSearchTerms('desconhecido')).includes('desconhecido'));
globalThis.fetch = originalFetch;
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE e(title TEXT, description TEXT, metadata TEXT)');
db.prepare('INSERT INTO e VALUES (?,?,?)').run('Retrato com cão','A dog in Japan 犬','{"autoria_nome":"Andy Warhol"}');
for(const term of ['dog','犬','Andy Warhol']) {
 const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
 assert.equal(db.prepare("SELECT count(*) n FROM e WHERE title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR metadata LIKE ? ESCAPE '\\'").get(pattern,pattern,pattern).n,1);
}
console.log('PASS: multilingual aliases, Unicode, full artist names, Wikidata expansion/outage, balanced results, uploaded photo URL, SQL metadata/substring matching.');

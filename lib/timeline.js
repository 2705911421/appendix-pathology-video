export function createTimeline(script,data) {
 const rows=script.sentences, entries=data.sentences;
 if(!Array.isArray(entries)||entries.length!==77||rows.length!==77)throw Error('Timeline requires 77 sentences');
 const map=new Map();let previous=0;
 entries.forEach((e,i)=>{const id=String(i+1).padStart(2,'0');if(e.id!==id||rows[i].id!==id||e.zh!==rows[i].zh||!Number.isFinite(e.start)||!Number.isFinite(e.end)||e.start<previous||e.start<0||e.end<=e.start||map.has(id))throw Error(`Invalid timeline/text at ${id}`);map.set(id,e);previous=e.end;});
 const get=id=>{if(typeof id!=='string'||!map.has(id))throw Error(`Unknown sentence ID: ${id}`);return map.get(id);};
 return Object.freeze({status:data.status,duration:previous,atId:(id,offset=0)=>get(id).start+offset,endId:(id,offset=0)=>get(id).end+offset,fracId:(id,f)=>{if(!Number.isFinite(f)||f<0||f>1)throw Error('Fraction must be 0..1');const e=get(id);return e.start+(e.end-e.start)*f;},sentenceAt:t=>{if(!Number.isFinite(t))throw Error('Invalid render time');return entries.find(e=>t>=e.start&&t<e.end)||entries[t<0?0:76];}});
}
export async function loadTimeline(script,url='./data/timeline.preview.json') { const r=await fetch(url);if(!r.ok)throw Error(`Timeline fetch failed: ${url}`);return createTimeline(script,await r.json()); }

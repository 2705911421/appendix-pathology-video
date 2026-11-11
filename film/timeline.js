export const sentences=Array.from({length:6},(_,i)=>({id:29+i,start:i*6,end:(i+1)*6}));
export const T={at:id=>sentences[id-29].start,end:id=>sentences[id-29].end,frac:(id,f)=>sentences[id-29].start+6*f};

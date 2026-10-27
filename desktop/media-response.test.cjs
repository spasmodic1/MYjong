const {test}=require('node:test'),assert=require('node:assert/strict');
const {mediaResponse}=require('./media-response.cjs');
test('local Ogg responses support metadata tail reads, seeking and HEAD',async()=>{
 const bytes=Buffer.from('0123456789'),request=range=>new Request('https://local/music',{headers:range?{Range:range}:{}});
 for(const [range,status,text] of [[null,200,'0123456789'],['bytes=3-5',206,'345'],['bytes=7-',206,'789'],['bytes=-3',206,'789']]){
  const r=mediaResponse(bytes,request(range));assert.equal(r.status,status);assert.equal(await r.text(),text);assert.equal(r.headers.get('Accept-Ranges'),'bytes');
 }
 for(const range of ['bytes=20-','bytes=5-2','bytes=-0','bytes=','nonsense'])assert.equal(mediaResponse(bytes,request(range)).status,416);
 const head=mediaResponse(bytes,new Request('https://local/music',{method:'HEAD'}));assert.equal(head.headers.get('Content-Length'),'10');assert.equal(await head.text(),'');
});

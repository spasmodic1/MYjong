// A seekable local audio response lets Chromium read the final Ogg duration page.
function mediaResponse(bytes,request){
  const headers={'Content-Type':'audio/ogg','Accept-Ranges':'bytes'},range=request.headers.get('range');
  let start=0,end=bytes.length-1,status=200;
  if(range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${bytes.length}`}});
    start=match[1]?Number(match[1]):Math.max(0,bytes.length-Number(match[2]));
    end=match[1]&&match[2]?Math.min(end,Number(match[2])):end;
    if(start>end||start>=bytes.length)return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${bytes.length}`}});
    status=206;headers['Content-Range']=`bytes ${start}-${end}/${bytes.length}`;
  }
  headers['Content-Length']=String(end-start+1);
  return new Response(request.method==='HEAD'?null:bytes.subarray(start,end+1),{status,headers});
}
module.exports={mediaResponse};

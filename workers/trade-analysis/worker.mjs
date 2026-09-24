// Retired paid endpoint: old tabs must never trigger a paid model request.
export default {
 async fetch(request){
  const headers={'Access-Control-Allow-Origin':'https://hungjurors.com',
   'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type',
   'Vary':'Origin','Cache-Control':'no-store'};
  if(request.headers.get('Origin')!=='https://hungjurors.com')return new Response(null,{status:403});
  return new Response(null,{status:request.method==='OPTIONS'?204:410,headers});
 }
};

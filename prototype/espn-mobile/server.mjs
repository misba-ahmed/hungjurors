import express from 'express';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openBrowser} from './browser.mjs';
const TTL=20*60*1000;
export function validAction(a){
 if(a?.type==='tap')return Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.x>=0&&a.x<390&&a.y>=0&&a.y<700;
 if(a?.type==='scroll')return Number.isFinite(a.y)&&Math.abs(a.y)<=650;
 if(a?.type==='key')return ['Enter','Tab','Backspace','ControlOrMeta+A','Escape'].includes(a.key);
 if(a?.type==='text')return typeof a.text==='string'&&a.text.length>0&&a.text.length<=512;
 return false;
}
export function createApp({code,origin,browserFactory=openBrowser,now=Date.now}){
 if(typeof code!=='string'||code.length<20)throw Error('Set TEST_ACCESS_CODE to at least 20 characters.');
 const app=express();let session=null,opening=false;let attempts=[];
 const token=()=>randomBytes(32).toString('hex');
 const matches=(a,b)=>typeof a==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
 const end=async()=>{const old=session;session=null;if(old?.browser)await old.browser.close().catch(()=>{});};
 const timer=setInterval(()=>{if(session&&now()>session.until)end();},15000);timer.unref();
 app.disable('x-powered-by');
 app.use((req,res,next)=>{
   res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});
   if(req.method==='POST'&&req.headers.origin!==origin)return res.status(403).json({error:'Open the private test URL directly and try again.'});
   next();
 });
 app.use(express.json({limit:'4kb',type:'application/json'}));
 app.get('/health',(_,res)=>res.json({ready:true,mode:'READ_ONLY'}));
 app.use(express.static(fileURLToPath(new URL('./public/',import.meta.url)),{etag:false,lastModified:false}));
 app.post('/api/login',async(req,res)=>{
   attempts=attempts.filter(t=>t>now()-60000);if(attempts.length>=5)return res.status(429).json({error:'Wait one minute before trying again.'});attempts.push(now());
   if(!matches(req.body?.code,code))return res.status(401).json({error:'Incorrect private access code.'});
   if(opening||session&&now()<session.until)return res.status(409).json({error:'A test session is already open. Finish it or wait 20 minutes.'});
   if(session)await end();const id=token();session={id,csrf:token(),until:now()+TTL,browser:null,busy:false};
   res.setHeader('Set-Cookie','hj_test='+id+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1200');
   res.json({csrf:session.csrf});
 });
 app.use('/api',(req,res,next)=>{
   const id=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('hj_test='))?.slice(8);
   if(!session||now()>session.until||!matches(id,session.id))return res.status(401).json({error:'Private session expired. Sign in to the test again.'});
   if(req.method==='POST'&&!matches(req.headers['x-test-csrf'],session.csrf))return res.status(403).json({error:'Session check failed. Reload the private test.'});
   next();
 });
 app.get('/api/session',(_,res)=>res.json({csrf:session.csrf,started:Boolean(session.browser)}));
 app.post('/api/start',async(_,res)=>{
   if(session.browser)return res.json({started:true});
   if(opening)return res.status(409).json({error:'Browser is starting.'});
   opening=true;const current=session;
   try{const b=await browserFactory();if(session!==current){await b.close();return res.status(401).json({error:'Session ended.'});}
     current.browser=b;res.json({started:true});
   }catch{res.status(502).json({error:'Cloud browser could not start. No ESPN connection has been made.'});}
   finally{opening=false;}
 });
 async function useBrowser(req,res,fn){
   const current=session;
   if(!current?.browser)return res.status(409).json({error:'Start the ESPN sign-in window first.'});
   if(current.busy)return res.status(409).json({error:'Previous action is still running.'});
   current.busy=true;
   try{const result=await fn(current.browser);if(session!==current)return res.status(401).json({error:'Session ended.'});res.json(result);}
   catch(e){res.status(502).json({error:req.path==='/api/roster'?e.message:'Browser action failed. Refresh the view or reconnect.'});}
   finally{current.busy=false;}
 }
 app.get('/api/frame',(req,res)=>useBrowser(req,res,b=>b.frame()));
 app.post('/api/input',(req,res)=>{
   if(!validAction(req.body))return res.status(400).json({error:'Invalid input.'});
   return useBrowser(req,res,async b=>{await b.input(req.body);return {ok:true};});
 });
 app.post('/api/roster',(req,res)=>{
   const {league,season}=req.body||{};
   if(!/^[1-9]\d{0,11}$/.test(String(league))||!Number.isInteger(Number(season))||Number(season)<2018||Number(season)>2100)return res.status(400).json({error:'Enter a valid league ID and season.'});
   return useBrowser(req,res,b=>b.roster(String(league),Number(season)));
 });
 app.post('/api/end',async(_,res)=>{await end();res.setHeader('Set-Cookie','hj_test=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');res.json({ended:true});});
 app.use((err,req,res,next)=>res.status(400).json({error:'Invalid request.'}));
 app.locals.shutdown=async()=>{clearInterval(timer);await end();};
 return app;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const origin=process.env.PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL;
 if(!origin||!origin.startsWith('https://'))throw Error('Set PUBLIC_ORIGIN to the private HTTPS URL.');
 const app=createApp({code:process.env.TEST_ACCESS_CODE,origin});
 const server=app.listen(process.env.PORT||3000,'0.0.0.0');
 process.on('SIGTERM',async()=>{await app.locals.shutdown();server.close();});
}

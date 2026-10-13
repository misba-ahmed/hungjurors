import {readFileSync} from 'node:fs';
const stack=readFileSync(new URL('./nested-cards.js',import.meta.url),'utf8');
export function prepareNestedCards(html){
 const replace=(from,to)=>{if(!html.includes(from))throw Error('Nested card source changed: '+from.slice(0,70));html=html.replace(from,()=>to)};
 for(const kind of ['Season','Award','Manager']){
  const variable='active'+kind+'Modal',parents='parent'+kind+'Modals';
  const declaration=new RegExp('let '+variable+'\\s*=\\s*null;');
  html=html.replace(declaration,`let ${variable}=null;const ${parents}=[];`);
  html=html.replace(new RegExp(`if\\(${variable}\\)\\s*close${kind}Modal\\(true\\);`),`if(${variable})${parents}.push(${variable});`);
  // Restore the previous instance's native close callback, rather than losing it.
  html=html.replace(new RegExp(variable+'\\s*=\\s*null;(?=\\s*(?:const \\{|\\n))'),`${variable}=${parents}.pop()||null;`);
  replace(`document.body.classList.remove('${kind.toLowerCase()}-modal-open');`,`if(!${variable})document.body.classList.remove('${kind.toLowerCase()}-modal-open');`);
 }
 replace("let pcSchedulePromise=null,pcScheduleValue=new Map(),pcActive=null,pcProfileRequestId=0,pcPrefetchTimer=0,pcStatPopover=null;","let pcSchedulePromise=null,pcScheduleValue=new Map(),pcActive=null,pcProfileRequestId=0,pcPrefetchTimer=0,pcStatPopover=null;const pcParentCards=[];");
 replace('  pcActive=null;','  pcActive=pcParentCards.pop()||null;');
 replace("document.body.classList.remove('pc-modal-open');","if(!pcActive)document.body.classList.remove('pc-modal-open');");
 replace('  pcClose();\n  const teamLogo=', '  if(pcActive)pcParentCards.push(pcActive);\n  const teamLogo=');
 replace('closeManagerModal();setTimeout(()=>document.querySelector(`.history-jump[data-year="${year}"]`)?.click(),700);','document.querySelector(`.history-jump[data-year="${year}"]`)?.click();');
 replace('const next=mgr.dataset.manager;closeManagerModal(true);setTimeout(()=>openManagerModal(next,mgr),0);','const next=mgr.dataset.manager;openManagerModal(next,mgr);');
 // Store exact rendered parents, including horizontal rails and nested scrollers.
 html=html.replace('</head>','<script id="hj-nested-cards">'+stack+'</script></head>');
 return html;
}

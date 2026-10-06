// Manager portraits can use cacheable files while older avatars remain embedded.
export function prepareManagerAvatars(html){
 const mapPattern=/const AV = (\{[^\n]+\});/g;
 if([...html.matchAll(mapPattern)].length!==1)throw Error('Manager avatar map changed');
 html=html.replace(mapPattern,(_,json)=>{
  const avatars=JSON.parse(json);
  if(!avatars.MISBA)throw Error('Misba avatar missing');
  avatars.MISBA='/assets/avatars/misba-20260929-v2.png';
  avatars.JARRETT='/assets/avatars/jarrett-20261006-circle-v3.svg';
  return 'const AV = '+JSON.stringify(avatars)+';';
 });
 let count=0;
 html=html.replace(/data:image\/png;base64,\$\{AV\[([^\]]+)\]\s*\|\|\s*AV_DEFAULT\}/g,(_,manager)=>{
  count++;
  return '${managerAvatarSrc('+manager+')}';
 });
 if(count<3)throw Error('Manager portrait renderers changed');
 const marker=/const av\s*= /g;
 if([...html.matchAll(marker)].length!==1)throw Error('Shared avatar renderer changed');
 return html.replace(marker,()=>`const managerAvatarSrc = manager => {
 const portrait=AV[manager]||AV_DEFAULT;
 return portrait.startsWith('/')?portrait:'data:image/png;base64,'+portrait;
};
const av = `).replace('</head>','<style id="manager-avatar-framing">.av[data-manager="MISBA"],img.av[src*="/assets/avatars/misba-"],.lms-natural-head{filter:saturate(.8)}</style>\n</head>');
}

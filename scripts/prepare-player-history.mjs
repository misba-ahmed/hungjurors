export function preparePlayerHistory(html){
 html=html.replaceAll("['splits','Splits'],['news','News']","['splits','Splits'],['history','History'],['news','News']");
 html=html.replace('const markup=()=>defense?pcDstProfileHTML(active.player,season,state.entries,state.schedule,state.rows):pcProfileHTML(active.player,season,state.rows,state.snaps,state.schedule);','const markup=()=>pcHistoryShell(defense?pcDstProfileHTML(active.player,season,state.entries,state.schedule,state.rows):pcProfileHTML(active.player,season,state.rows,state.snaps,state.schedule),season);');
 html=html.replace("'[data-pc-section=\"news\"]','[data-pc-section=\"splits\"]'","'[data-pc-section=\"news\"]','[data-pc-section=\"history\"]','[data-pc-section=\"splits\"]'");
 html=html.replace("const news=template.content.querySelector('[data-pc-section=\"news\"]');","const news=template.content.querySelector('[data-pc-section=\"history\"], [data-pc-section=\"news\"]');");
 html=html.replace('pcRenderPlayerNews(active.player,scroll,token).catch(()=>{});','pcRenderPlayerNews(active.player,scroll,token).catch(()=>{});\n    pcRenderHistory(active.player,season,scroll,token).catch(()=>{});');
 html=html.replace("(root.querySelector('[data-pc-section=\"news\"]')||root).insertAdjacentElement(root.querySelector('[data-pc-section=\"news\"]')?","(root.querySelector('[data-pc-section=\"history\"], [data-pc-section=\"news\"]')||root).insertAdjacentElement(root.querySelector('[data-pc-section=\"history\"], [data-pc-section=\"news\"]')?");
 return html.replace('</body>','<link rel="stylesheet" href="styles/player-history.css?v=1"><script src="scripts/player-history.js?v=1"></script>\n</body>');
}

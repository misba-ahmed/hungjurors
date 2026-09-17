import {readFile,writeFile} from 'node:fs/promises';
export function prepareSite(html){
 const old='Date.now()-at<60*60*1000&&data.updated';
 if(html.split(old).length!==2)throw Error('Projection freshness setting changed; review site preparation');
 return html.replace(old,'Date.now()-at<90*60*1000&&data.updated');
}
if(process.argv[2])await writeFile(process.argv[2],prepareSite(await readFile(process.argv[2],'utf8')));

for(const id of [4685247,4569559,4711533,4682745]){
 const r=await fetch('https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes/'+id);const data=await r.json();const a=data.athlete;
 console.log('PLAYER '+JSON.stringify({id,name:a.displayName,height:a.displayHeight,heightInches:a.height,weight:a.displayWeight,jersey:a.jersey,team:a.team,headshot:a.headshot}));
 const image=await fetch(a.headshot.href);if(!image.ok)throw Error('Headshot missing '+id);
 console.log('HEADSHOT '+id+' '+Buffer.from(await image.arrayBuffer()).toString('base64'));
}
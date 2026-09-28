// ESPN sends probabilities as fractions. Preserve legitimate zero and one values.
function hjEspnWinProbability(game,week,data){
 const percent=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=1?Math.round(Number(value)*100):null;
 if(Number(week)<Number(hjCurrentWeek(data))){
  const a=hjSideScore(game?.home,week),b=hjSideScore(game?.away,week);
  return a===null||b===null?null:a>b?100:a<b?0:50;
 }
 const home=percent(game?.home?.winProbability),away=percent(game?.away?.winProbability);
 return home??(away===null?null:100-away);
}

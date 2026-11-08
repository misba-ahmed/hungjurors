/* Side bets in the Wire carousel: one rule for every bet, current and future (Nov 8, 2026).
 *
 * A side bet announced for the week being played (or an upcoming week) keeps its own "Side Bet" place near the
 * front of the carousel. Once its week is over (that week's recap is showing), the bet's card moves into the recap
 * group, after every recap card of that week. Before this, each bet file placed its own card, so every new bet
 * repeated the mistake (the Week 7 free-throw bet was fixed on Oct 27; the Week 8 casino bet still led the
 * carousel in Week 9).
 *
 * The bet's week comes from the card ({section:'sidebet',week:N}); a card without it is read from its tag
 * ("Week 8 · …"). This runs after the carousel's own section sort (hjWireOrdered), so the order a bet file
 * inserts its card in does not matter.
 */
(function(){
 if(typeof hjWireOrdered!=='function'||typeof WIRE==='undefined')return;
 function betWeek(card){
  const own=Number(card?.week);if(own>0)return own;
  const html=String(card?.html||''),m=/class="wc-kicker"><span>[^<]*<\/span><small>\s*Week\s+(\d+)/i.exec(html)||/data-sidebet-week="(\d+)"/.exec(html);
  return m?Number(m[1]):0;
 }
 const base=hjWireOrdered;
 hjWireOrdered=function(cards){
  const recapWeek=Number(WIRE.recapWeek)||0,finished=new Set();
  const marked=(cards||[]).map(card=>{
   if(card?.section!=='sidebet')return card;
   const week=betWeek(card);if(!(week>0&&recapWeek>0&&week<=recapWeek))return card;
   const moved={...card,section:'recap'};finished.add(moved);return moved;
  });
  const sorted=base.call(this,marked);if(!finished.size)return sorted;
  // Inside the recap group: the ordinary recap cards first, then the finished bets.
  const first=sorted.findIndex(card=>card.section==='recap');if(first<0)return sorted;
  const group=sorted.filter(card=>card.section==='recap');
  const ordered=[...group.filter(card=>!finished.has(card)),...group.filter(card=>finished.has(card))];
  return [...sorted.filter((card,i)=>i<first&&card.section!=='recap'),...ordered,...sorted.slice(first).filter(card=>card.section!=='recap')];
 };
})();

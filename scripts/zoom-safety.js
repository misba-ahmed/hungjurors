/* Keep native pinch zoom enabled. Small list portraits use small source images;
   the player-card portrait retains its full-resolution source. */
function hjHeadshotSrc(source){
 const value=String(source||'');
 const match=value.match(/^https:\/\/a\.espncdn\.com(\/i\/headshots\/nfl\/players\/full\/\d+\.png)(?:\?.*)?$/);
 return match?'https://a.espncdn.com/combiner/i?img='+match[1]+'&w=160&h=116':value;
}

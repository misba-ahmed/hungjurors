function pcNewsBody(updates,loading=false){
 if(loading&&!updates.length)return '<div class="pc-news-loading">Loading player updates…</div>';
 const list=updates.length?`<div class="pc-news-list">${updates.map(item=>`<article class="pc-news-item"><span class="ffn-tag ${esc(String(item.category||'update').toLowerCase())}">${esc(item.category||'update')}</span><div><p>${esc(item.text||item.headline||'')}</p>${ffnSpinHTML(item)}<span class="pc-news-time">${esc(ffnRelative(item.published_at,item.time_precision||'time'))}</span></div></article>`).join('')}</div>`:'<div class="pc-news-loading">No updates found for this player.</div>';
 return `${list}${loading&&updates.length<4?'<div class="pc-news-loading">Loading older updates…</div>':''}`;
}

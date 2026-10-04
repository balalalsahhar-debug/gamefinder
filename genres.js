(function(root){'use strict';
 const terms={puzzle:/puzzle|escape.room|ألغاز|الغاز/i,simulation:/simulat|محاكي|محاكاة/i,racing:/racing|race\b|motorsport|سباق|سباقات/i,sports:/sports?|football|soccer|basketball|رياضة|كرة/i,survival:/surviv|zombie|بقاء/i,building:/build|construct|craft|city.?builder|tycoon|بناء/i,action:/action|shooter|battle|combat|أكشن|اكشن/i,relaxing:/relax|cozy|cosy|peaceful|calm|meditat|هادئ|مريح|stardew valley|townscaper|unpacking|sky: children/i};
 function genreMatch(game,genre){if(!genre)return true;const text=[game.name,...(Array.isArray(game.genres)?game.genres:[]),...(game.genreTags||[]),game.description||'',game.descriptionAr||''].join(' ');return Boolean(terms[genre]?.test(text));}
 if(typeof module!=='undefined'&&module.exports)module.exports=genreMatch;else root.genreMatch=genreMatch;
})(typeof window==='undefined'?globalThis:window);

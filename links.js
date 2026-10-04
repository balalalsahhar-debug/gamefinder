(function(root){'use strict';
 function repairGameURL(value){try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol))return null;if(url.hostname==='www.ea.com'&&/^\/games\/FC\/?$/i.test(url.pathname))return 'https://www.ea.com/games/ea-sports-fc';if(url.hostname==='play.google.com'&&url.pathname==='/store/apps/details'&&!url.searchParams.has('gl')){url.searchParams.set('gl','US');url.searchParams.set('hl','en');}return url.href;}catch{return null;}}
 if(typeof module!=='undefined'&&module.exports)module.exports=repairGameURL;else root.repairGameURL=repairGameURL;
})(typeof window==='undefined'?globalThis:window);

'use strict';
let installPrompt=null;
const installButton=document.getElementById('install-button'),installDialog=document.getElementById('install-dialog');
if(!['127.0.0.1','localhost',''].includes(location.hostname))installDialog.querySelector('[data-i18n="installLocal"]').hidden=true;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
window.addEventListener('appinstalled',()=>{installPrompt=null;installDialog.close();installButton.hidden=true;});
if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone)installButton.hidden=true;
installButton.addEventListener('click',async()=>{if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;}else installDialog.showModal();});
document.getElementById('install-done').addEventListener('click',()=>installDialog.close());
const APP_VERSION='2026.10.04.10',updateButton=document.getElementById('app-update');let appRegistration=null;
updateButton.addEventListener('click',()=>{if(chatBusy||window.hasGameFinderVoiceActive?.()){aiStatus('updateBusy');return;}location.reload();});
async function checkAppUpdate(){if(document.visibilityState==='hidden')return;try{const response=await fetch('/api/status',{cache:'no-store',signal:AbortSignal.timeout(4000)});const status=await response.json();if(status.version&&status.version!==APP_VERSION)updateButton.hidden=false;await appRegistration?.update();}catch{}}
if('serviceWorker' in navigator&&location.protocol!=='file:'){
 const wasControlled=Boolean(navigator.serviceWorker.controller);
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(wasControlled)updateButton.hidden=false;});
 navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(registration=>{appRegistration=registration;registration.update();registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)updateButton.hidden=false;});});}).catch(()=>{});
}
document.addEventListener('visibilitychange',checkAppUpdate);setInterval(checkAppUpdate,60000);

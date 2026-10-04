'use strict';
let voiceRecorder=null,voiceStream=null,voiceContext=null,voiceTimers=[],voiceUpload=null,voiceGeneration=0,voicePhase='idle';
const micButton=document.getElementById('mic-button'),voiceInline=document.getElementById('voice-inline');
const MIC_ICON='<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>';
const STOP_ICON='<svg viewBox="0 0 24 24" width="23" height="23" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>';
function voiceState(phase,key){voicePhase=phase;micButton.innerHTML=phase==='recording'?STOP_ICON:phase==='uploading'?'<span class="voice-spinner" aria-hidden="true"></span>':MIC_ICON;micButton.classList.toggle('listening',phase==='recording');micButton.disabled=phase==='requesting';micButton.setAttribute('aria-label',t(phase==='recording'?'voiceStopConvert':phase==='uploading'?'voiceCancel':'mic'));micButton.title=micButton.getAttribute('aria-label');micButton.setAttribute('aria-pressed',String(phase==='recording'));voiceInline.hidden=phase!=='recording';document.getElementById('ai-send').disabled=phase!=='idle'||chatBusy;if(key)aiStatus(key);}
function releaseVoice(){voiceTimers.forEach(clearTimeout);voiceTimers.forEach(clearInterval);voiceTimers=[];voiceStream?.getTracks().forEach(track=>track.stop());voiceStream=null;voiceContext?.close().catch(()=>{});voiceContext=null;}
function cancelVoice(){voiceGeneration++;voiceUpload?.abort();voiceUpload=null;if(voiceRecorder?.state==='recording')voiceRecorder.stop();releaseVoice();voiceState('idle','aiReady');}
window.hasGameFinderVoiceActive=()=>voicePhase!=='idle';
document.getElementById('voice-cancel').addEventListener('click',cancelVoice);
async function convertVoice(blob,generation){
 voiceState('uploading','voiceConverting');const controller=new AbortController();voiceUpload=controller;const timer=setTimeout(()=>controller.abort(),60000);
 try{const response=await fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':blob.type||'audio/webm'},body:blob,signal:controller.signal});const data=await response.json();if(generation!==voiceGeneration)return;if(!response.ok){voiceState('idle',translations.en[data.error]?data.error:'micFailed');return;}const input=document.getElementById('ai-question');input.value=[input.value.trim(),data.text].filter(Boolean).join(' ').slice(0,2000);voiceState('idle','voiceTextReady');input.focus();}
 catch(error){if(generation===voiceGeneration)voiceState('idle',error.name==='AbortError'?'aiTimeout':'aiOffline');}
 finally{clearTimeout(timer);if(voiceUpload===controller)voiceUpload=null;}
}
async function startVoice(){
 if(chatBusy)return;
 if(!window.isSecureContext){aiStatus('micSecure');return;}if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){aiStatus('micUnsupported');return;}
 const generation=++voiceGeneration;voiceState('requesting','micPermission');
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(generation!==voiceGeneration){stream.getTracks().forEach(track=>track.stop());return;}voiceStream=stream;
  let soundFrames=0,levelsAvailable=false;
  try{const AudioContext=window.AudioContext||window.webkitAudioContext;if(AudioContext){voiceContext=new AudioContext();await voiceContext.resume();if(generation!==voiceGeneration)return;const analyser=voiceContext.createAnalyser();analyser.fftSize=1024;voiceContext.createMediaStreamSource(stream).connect(analyser);const samples=new Uint8Array(analyser.fftSize);levelsAvailable=voiceContext.state==='running';voiceTimers.push(setInterval(()=>{analyser.getByteTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,v)=>sum+((v-128)/128)**2,0)/samples.length);if(rms>.008)soundFrames++;document.getElementById('voice-meter').style.setProperty('--voice-level',String(Math.min(1,rms*12)));},100));}}catch{}
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type));const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);voiceRecorder=recorder;const parts=[];let size=0,tooLarge=false;const started=Date.now();
  recorder.ondataavailable=event=>{if(!event.data.size)return;size+=event.data.size;if(size>2000000){tooLarge=true;if(recorder.state==='recording')recorder.stop();}else parts.push(event.data);};
  recorder.onerror=()=>{if(generation===voiceGeneration){voiceGeneration++;releaseVoice();voiceState('idle','micFailed');}};
  recorder.onstop=()=>{if(generation!==voiceGeneration)return;releaseVoice();if(tooLarge){voiceState('idle','voiceTooLarge');return;}if(levelsAvailable&&soundFrames<2){voiceState('idle','voiceEmpty');return;}const blob=new Blob(parts,{type:recorder.mimeType||'audio/webm'});if(!blob.size){voiceState('idle','voiceEmpty');return;}convertVoice(blob,generation);};
  recorder.start(250);voiceState('recording','voiceRecordingInline');document.getElementById('voice-elapsed').textContent='0:00';voiceTimers.push(setInterval(()=>{document.getElementById('voice-elapsed').textContent='0:'+String(Math.min(30,Math.floor((Date.now()-started)/1000))).padStart(2,'0');},250));voiceTimers.push(setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},30000));
 }catch(error){if(generation===voiceGeneration){releaseVoice();voiceState('idle',['NotAllowedError','PermissionDeniedError'].includes(error.name)?'micDenied':error.name==='NotFoundError'?'micMissing':error.name==='NotReadableError'?'micInUse':'micFailed');}}
}
micButton.addEventListener('click',()=>{if(voicePhase==='recording'){voiceRecorder.stop();return;}if(voicePhase==='uploading'){cancelVoice();return;}if(voicePhase==='idle')startVoice();});
window.addEventListener('pagehide',cancelVoice);
window.addEventListener('hashchange',()=>{if(location.hash!=='#assistant'&&voicePhase!=='idle')cancelVoice();});
voiceState('idle');

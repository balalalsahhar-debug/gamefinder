'use strict';
// Audio stays in memory until the user explicitly chooses to send it to Gemini.
let voiceRecorder=null,voiceStream=null,voiceBlob=null,voicePreviewURL='',voiceTimer=null,voiceUpload=null,voicePending=false,voiceGeneration=0;
let voiceAudioContext=null,voiceLevelTimer=null,voiceSoundFrames=0,voiceLevelAvailable=false;
const voiceDialog=document.getElementById('voice-dialog'),voicePreview=document.getElementById('voice-preview');
function voiceStatus(key){document.getElementById('voice-status').textContent=t(key);}
function releaseMicrophone(){clearTimeout(voiceTimer);clearInterval(voiceLevelTimer);voiceAudioContext?.close().catch(()=>{});voiceAudioContext=null;voiceStream?.getTracks().forEach(track=>track.stop());voiceStream=null;}
function clearRecording(){if(voicePreviewURL)URL.revokeObjectURL(voicePreviewURL);voicePreviewURL='';voiceBlob=null;voicePreview.removeAttribute('src');voicePreview.hidden=true;document.getElementById('voice-transcribe').disabled=true;}
function closeVoice(){voiceGeneration++;voicePending=false;voiceUpload?.abort();if(voiceRecorder?.state==='recording')voiceRecorder.stop();releaseMicrophone();clearRecording();document.getElementById('voice-start').disabled=false;document.getElementById('voice-stop-record').disabled=true;voiceDialog.close();}
document.getElementById('mic-button').addEventListener('click',()=>{voiceDialog.showModal();voiceStatus(!window.isSecureContext?'micSecure':!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder?'micUnsupported':'voiceReady');});
document.getElementById('voice-close').addEventListener('click',closeVoice);
voiceDialog.addEventListener('cancel',event=>{event.preventDefault();closeVoice();});
document.getElementById('voice-start').addEventListener('click',async()=>{
 if(voicePending||voiceUpload||voiceRecorder?.state==='recording')return;
 if(!window.isSecureContext){voiceStatus('micSecure');return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){voiceStatus('micUnsupported');return;}
 voicePending=true;const generation=++voiceGeneration;const start=document.getElementById('voice-start');start.disabled=true;clearRecording();voiceStatus('micPermission');
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(generation!==voiceGeneration||!voicePending||!voiceDialog.open){stream.getTracks().forEach(track=>track.stop());return;}voiceStream=stream;
  voiceSoundFrames=0;voiceLevelAvailable=false;
  try{const AudioContext=window.AudioContext||window.webkitAudioContext;if(AudioContext){voiceAudioContext=new AudioContext();await voiceAudioContext.resume();if(generation!==voiceGeneration)return;const analyser=voiceAudioContext.createAnalyser();analyser.fftSize=1024;voiceAudioContext.createMediaStreamSource(stream).connect(analyser);const levels=new Uint8Array(analyser.fftSize);voiceLevelAvailable=voiceAudioContext.state==='running';voiceLevelTimer=setInterval(()=>{analyser.getByteTimeDomainData(levels);const rms=Math.sqrt(levels.reduce((sum,v)=>sum+((v-128)/128)**2,0)/levels.length);if(rms>.008)voiceSoundFrames++;},100);}}catch{}
  const type=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg;codecs=opus'].find(m=>MediaRecorder.isTypeSupported(m));
  voiceRecorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);const parts=[];let size=0,tooLarge=false;
  voiceRecorder.ondataavailable=event=>{if(event.data.size){size+=event.data.size;if(size>2000000){tooLarge=true;if(voiceRecorder.state==='recording')voiceRecorder.stop();}else parts.push(event.data);}};
  voiceRecorder.onerror=()=>{if(generation!==voiceGeneration)return;releaseMicrophone();voiceStatus('micFailed');};
  voiceRecorder.onstop=()=>{if(generation!==voiceGeneration)return;releaseMicrophone();document.getElementById('voice-stop-record').disabled=true;start.disabled=false;if(!voiceDialog.open)return;if(tooLarge){voiceStatus('voiceTooLarge');return;}if(voiceLevelAvailable&&voiceSoundFrames<2){voiceStatus('voiceEmpty');return;}voiceBlob=new Blob(parts,{type:voiceRecorder.mimeType||'audio/webm'});if(!voiceBlob.size){voiceStatus('voiceEmpty');return;}voicePreviewURL=URL.createObjectURL(voiceBlob);voicePreview.src=voicePreviewURL;voicePreview.hidden=false;document.getElementById('voice-transcribe').disabled=false;voiceStatus('voiceReview');};
  voiceRecorder.start(500);document.getElementById('voice-stop-record').disabled=false;voiceStatus('voiceRecording');voiceTimer=setTimeout(()=>{if(voiceRecorder?.state==='recording')voiceRecorder.stop();},30000);
 }catch(error){if(generation===voiceGeneration){releaseMicrophone();voiceStatus(['NotAllowedError','PermissionDeniedError'].includes(error.name)?'micDenied':error.name==='NotFoundError'?'micMissing':error.name==='NotReadableError'?'micInUse':'micFailed');}}
 finally{if(generation===voiceGeneration){voicePending=false;if(voiceRecorder?.state!=='recording')start.disabled=false;}}
});
document.getElementById('voice-stop-record').addEventListener('click',()=>{if(voiceRecorder?.state==='recording')voiceRecorder.stop();});
document.getElementById('voice-transcribe').addEventListener('click',async()=>{
 if(!voiceBlob||voiceUpload)return;voiceUpload=new AbortController();const button=document.getElementById('voice-transcribe');button.disabled=true;document.getElementById('voice-start').disabled=true;voiceStatus('voiceConverting');
 const timeout=setTimeout(()=>voiceUpload?.abort(),60000);
 try{const response=await fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':voiceBlob.type||'audio/webm'},body:voiceBlob,signal:voiceUpload.signal});const data=await response.json();if(!response.ok){voiceStatus(translations.en[data.error]?data.error:'micFailed');return;}document.getElementById('ai-question').value=data.text;aiStatus('micReady');voiceDialog.close();clearRecording();document.getElementById('ai-question').focus();}
 catch(error){if(voiceDialog.open)voiceStatus(error.name==='AbortError'?'aiTimeout':'aiOffline');}
 finally{clearTimeout(timeout);voiceUpload=null;button.disabled=!voiceBlob;document.getElementById('voice-start').disabled=false;}
});
window.addEventListener('pagehide',()=>{if(voiceRecorder?.state==='recording')voiceRecorder.stop();releaseMicrophone();voiceUpload?.abort();});

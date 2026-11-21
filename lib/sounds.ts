// One gesture-unlocked context avoids gaps and browser autoplay failures between turns.
let context:AudioContext|undefined;
let noise:AudioBuffer|undefined,hatNoise:AudioBuffer|undefined;
export function unlockAudio(){try{context??=new AudioContext();if(context.state==='suspended')void context.resume().catch(()=>{});}catch{}}
function ready(){return context?.state==='running'?context:undefined}
export function typingSound(remote=false){const ac=ready();if(!ac)return;const now=ac.currentTime;
if(!noise){noise=ac.createBuffer(1,Math.ceil(ac.sampleRate*.065),ac.sampleRate);const channel=noise.getChannelData(0);for(let i=0;i<channel.length;i++)channel[i]=Math.random()*2-1;}
// Rounded switch body, followed by a small filtered click: no sharp treble spike.
const body=ac.createOscillator(),bodyGain=ac.createGain();body.type='sine';body.frequency.setValueAtTime(190+Math.random()*35,now);body.frequency.exponentialRampToValueAtTime(85,now+.055);bodyGain.gain.setValueAtTime(0,now);bodyGain.gain.linearRampToValueAtTime(remote?.047:.06,now+.003);bodyGain.gain.exponentialRampToValueAtTime(.0001,now+.07);body.connect(bodyGain);bodyGain.connect(ac.destination);body.start(now);body.stop(now+.075);body.onended=()=>{body.disconnect();bodyGain.disconnect()};
const source=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();source.buffer=noise;filter.type='bandpass';filter.frequency.value=1200+Math.random()*350;filter.Q.value=.65;gain.gain.setValueAtTime(remote?.065:.085,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.045);source.connect(filter);filter.connect(gain);gain.connect(ac.destination);source.start(now);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};}
export function acceptedSound(bonusSeconds=0){const ac=ready();if(!ac)return;const now=ac.currentTime;const notes=bonusSeconds===2?[659.25,830.61,1046.5]:bonusSeconds===1?[880]:[523.25,783.99];for(const [i,freq] of notes.entries()){const o=ac.createOscillator(),g=ac.createGain(),start=now+i*.065;o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.055,start+.008);g.gain.exponentialRampToValueAtTime(.0001,start+.2);o.connect(g);g.connect(ac.destination);o.start(start);o.stop(start+.21);o.onended=()=>{o.disconnect();g.disconnect()};}}
export function explosionSound(){const ac=ready();if(!ac)return;const now=ac.currentTime;
const sub=ac.createOscillator(),subGain=ac.createGain();sub.type='sine';sub.frequency.setValueAtTime(150,now);sub.frequency.exponentialRampToValueAtTime(30,now+.65);subGain.gain.setValueAtTime(.0001,now);subGain.gain.linearRampToValueAtTime(.22,now+.009);subGain.gain.exponentialRampToValueAtTime(.0001,now+1);sub.connect(subGain);subGain.connect(ac.destination);sub.start();sub.stop(now+1.02);sub.onended=()=>{sub.disconnect();subGain.disconnect()};
const buffer=ac.createBuffer(1,ac.sampleRate,ac.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;const hit=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();hit.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(2800,now);filter.frequency.exponentialRampToValueAtTime(110,now+.8);gain.gain.setValueAtTime(.18,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.9);hit.connect(filter);filter.connect(gain);gain.connect(ac.destination);hit.start();hit.onended=()=>{hit.disconnect();filter.disconnect();gain.disconnect()};}

// Original procedural battle score: minor-key bass, arpeggio, kick and hats.
let musicBus:GainNode|undefined,musicTimer:ReturnType<typeof setInterval>|undefined,nextBeat=0,beat=0,intensity=0;
function musicTone(ac:AudioContext,frequency:number,time:number,length:number,volume:number,type:OscillatorType='triangle'){
const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(.0001,time);g.gain.linearRampToValueAtTime(volume,time+.008);g.gain.exponentialRampToValueAtTime(.0001,time+length);o.connect(g);g.connect(musicBus!);o.start(time);o.stop(time+length+.01);o.onended=()=>{o.disconnect();g.disconnect()};}
function musicTick(){const ac=ready();if(!ac)return;if(!musicBus){musicBus=ac.createGain();musicBus.gain.value=.16;musicBus.connect(ac.destination)}
if(nextBeat<ac.currentTime-.15)nextBeat=ac.currentTime+.02;
while(nextBeat<ac.currentTime+.09){const t=nextBeat,root=[55,65.406,49,58.27][Math.floor(beat/16)%4];
if(beat%4===0){const kick=ac.createOscillator(),g=ac.createGain();kick.frequency.setValueAtTime(140,t);kick.frequency.exponentialRampToValueAtTime(42,t+.13);g.gain.setValueAtTime(.27,t);g.gain.exponentialRampToValueAtTime(.0001,t+.19);kick.connect(g);g.connect(musicBus);kick.start(t);kick.stop(t+.2);kick.onended=()=>{kick.disconnect();g.disconnect()};}
if(beat%2===0)musicTone(ac,root*(beat%8===6?2:1),t,.19,.15);
const intervals=[0,7,12,15,12,7,19,15];musicTone(ac,root*4*Math.pow(2,intervals[beat%8]/12),t,.09,.055+intensity*.025,'sine');
if(beat%2===1||intensity>.5){const hat=ac.createBufferSource(),g=ac.createGain(),f=ac.createBiquadFilter();if(!hatNoise){hatNoise=ac.createBuffer(1,Math.ceil(ac.sampleRate*.035),ac.sampleRate);const v=hatNoise.getChannelData(0);for(let i=0;i<v.length;i++)v[i]=Math.random()*2-1;}hat.buffer=hatNoise;f.type='highpass';f.frequency.value=6500;g.gain.setValueAtTime(.065,t);g.gain.exponentialRampToValueAtTime(.0001,t+.03);hat.connect(f);f.connect(g);g.connect(musicBus);hat.start(t);hat.onended=()=>{hat.disconnect();f.disconnect();g.disconnect()};}
beat++;nextBeat+=60/(108+intensity*48)/4;}}
export function setBattleMusic(enabled:boolean,pressure=0){intensity=Math.max(0,Math.min(1,pressure));if(!enabled){if(musicTimer)clearInterval(musicTimer);musicTimer=undefined;if(musicBus){const old=musicBus;musicBus=undefined;old.gain.setTargetAtTime(0,context!.currentTime,.025);setTimeout(()=>old.disconnect(),200)}nextBeat=0;beat=0;return;}if(!musicTimer){nextBeat=0;beat=0;musicTimer=setInterval(musicTick,50);musicTick();}}

// Two descending notes distinguish rejection from the ascending accepted chime.
export function rejectedSound(){const ac=ready();if(!ac)return;const now=ac.currentTime;for(const [i,freq] of [240,155].entries()){const o=ac.createOscillator(),g=ac.createGain(),start=now+i*.11;o.type='triangle';o.frequency.setValueAtTime(freq,start);o.frequency.exponentialRampToValueAtTime(freq*.8,start+.12);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.09,start+.008);g.gain.exponentialRampToValueAtTime(.0001,start+.16);o.connect(g);g.connect(ac.destination);o.start(start);o.stop(start+.17);o.onended=()=>{o.disconnect();g.disconnect()};}}

// One gentle cue near the deadline; the clock owns per-turn deduplication.
export function timeWarningSound(){const ac=ready();if(!ac)return;const now=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=440;g.gain.setValueAtTime(.0001,now);g.gain.linearRampToValueAtTime(.045,now+.01);g.gain.exponentialRampToValueAtTime(.0001,now+.14);o.connect(g);g.connect(ac.destination);o.start(now);o.stop(now+.15);o.onended=()=>{o.disconnect();g.disconnect()};}

// Three rising, rounded notes for the last three rematch seconds.
export function rematchCountdownSound(seconds:number){const ac=ready();if(!ac||seconds<1||seconds>3)return;const now=ac.currentTime;for(const [i,freq] of (seconds===1?[784,1047]:[seconds===3?392:523]).entries()){const o=ac.createOscillator(),g=ac.createGain(),start=now+i*.08;o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(.06,start+.008);g.gain.exponentialRampToValueAtTime(.0001,start+.18);o.connect(g);g.connect(ac.destination);o.start(start);o.stop(start+.19);o.onended=()=>{o.disconnect();g.disconnect()};}}

// Original rising signal tones for the solo countdown.
export function dailyStartSound(go: boolean) {
 playMelody(go?[660,880,1100]:[392],.055,.17,.085,'triangle');
}

export function dailyResultSound(won:boolean,delay=0) {
 if(won)playMelody([523.25,659.25,783.99,1046.5],.12,.32,.075,'triangle',delay);
 else playMelody([392,329.63,261.63,196],.14,.36,.065,'sine',delay);
}

function playMelody(notes:number[],spacing:number,length:number,volume:number,type:OscillatorType,delay=0) {
 const ac=ready();
 if(!ac)return;
 const start=ac.currentTime+delay;
 for(const [index,frequency] of notes.entries()){
  const tone=ac.createOscillator(),gain=ac.createGain(),at=start+index*spacing;
  tone.type=type;
  tone.frequency.value=frequency;
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.linearRampToValueAtTime(volume,at+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  tone.connect(gain);
  gain.connect(ac.destination);
  tone.start(at);
  tone.stop(at+length+.01);
  tone.onended=()=>{tone.disconnect();gain.disconnect();};
 }
}

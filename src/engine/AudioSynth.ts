import type { Act, Effect } from '../data/storyboard';

/** Quiet, entirely synthesized ambience. No network requests or audio assets. */
export class AudioSynth {
  private context?: AudioContext;
  private master?: GainNode;
  private drone?: GainNode;
  private voices: OscillatorNode[] = [];
  private filter?: BiquadFilterNode;
  private timer?: ReturnType<typeof setInterval>;
  private act: Act = 1;
  private step = 0;
  private running = false;
  private muted = false;
  private volume = .45;
  async unlock() {
    if (!this.context) this.create();
    await this.context!.resume();
    this.running = true;
    this.setAct(this.act);
    this.applyVolume();
  }
  private create() {
    const context = new AudioContext(); this.context = context;
    const master = context.createGain(); this.master = master; master.gain.value = 0;
    const limiter = context.createDynamicsCompressor(); limiter.threshold.value = -18; limiter.ratio.value = 5;
    master.connect(limiter); limiter.connect(context.destination);
    const drone = context.createGain(); drone.gain.value = .13; this.drone = drone;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700; this.filter = filter;
    drone.connect(filter); filter.connect(master);
    for (let i=0;i<4;i++) {
      const voice = context.createOscillator(); voice.type = i===0?'sine':'triangle';
      const gain = context.createGain(); gain.gain.value = [.6,.16,.08,.04][i];
      voice.frequency.value = 55 * [1,1.5,2,3][i]; voice.detune.value=(i-1.5)*2;
      voice.connect(gain);gain.connect(drone);voice.start();this.voices.push(voice);
    }
    // Air passing through machinery, made from a reusable two-second noise buffer.
    const buffer = context.createBuffer(1,context.sampleRate*2,context.sampleRate);
    const samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()-.5)*.12;
    const air=context.createBufferSource();air.buffer=buffer;air.loop=true;
    const airFilter=context.createBiquadFilter();airFilter.type='lowpass';airFilter.frequency.value=220;
    const airGain=context.createGain();airGain.gain.value=.15;
    air.connect(airFilter);airFilter.connect(airGain);airGain.connect(master);air.start();
    this.timer=setInterval(()=>this.clock(),1100);
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)void context.suspend();
      else if(this.running)void context.resume().catch(()=>{});
    });
  }
  setAct(act: Act) {
    this.act=act;
    if(!this.context)return;
    const base=[55,41.203,65.406,73.416][act-1];
    const ratios=act===3?[1,2,3,5]:act===4?[1,1.5,2.5,3]:[1,1.5,2,3];
    this.voices.forEach((voice,i)=>voice.frequency.setTargetAtTime(base*ratios[i],this.context!.currentTime,2));
    this.filter!.frequency.setTargetAtTime([450,320,1200,850][act-1],this.context.currentTime,2);
  }
  setVolume(volume:number,muted:boolean) {this.volume=Math.max(0,Math.min(1,volume));this.muted=muted;this.applyVolume();}
  private applyVolume() {
    if(this.context)this.master!.gain.setTargetAtTime(this.running&&!this.muted?this.volume*.55:0,this.context.currentTime,.15);
  }
  pause() {this.running=false;this.applyVolume();}
  private note(frequency:number,duration:number,volume:number,type:OscillatorType='sine',offset=0) {
    const c=this.context;if(!c || !this.master || !this.running)return;
    const at=c.currentTime+offset,voice=c.createOscillator(),gain=c.createGain();
    voice.type=type;voice.frequency.value=frequency;
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.025);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    voice.connect(gain);gain.connect(this.master);voice.start(at);voice.stop(at+duration+.1);
    voice.onended=()=>{voice.disconnect();gain.disconnect();};
  }
  private clock() {
    if(!this.running || document.hidden || this.muted || this.context?.state!=='running')return;
    this.step++;
    if(this.act===1)this.note(this.step%2?660:880,.055,.017,'triangle');
    if(this.step%[8,6,5,4][this.act-1]===0) {
      const root=[220,164.81,261.63,293.66][this.act-1];
      this.note(root*[1,1.5,2,1.25][Math.floor(this.step/4)%4],3,.025);
    }
  }
  trigger(effect:Effect) {
    const root=effect==='dissolve_particles'?293.66:effect==='overheat_flash'?82.4:220;
    [1,1.5,2,3].forEach((ratio,i)=>this.note(root*ratio,4+i*.3,.025/(i+1),'sine',i*.13));
  }
  destroy() {clearInterval(this.timer);void this.context?.close();}
}

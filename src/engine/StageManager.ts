import { Application, Container, Graphics, Sprite, Texture, Filter, Rectangle } from 'pixi.js';
import { gsap } from 'gsap';
import type { Beat, Mood, Effect } from '../data/storyboard';
import { Choreographer } from './Choreographer';

const palettes: Record<Mood, [string, string, string]> = {
  warm_amber: ['#101d19', '#354632', '#d3ad63'],
  cerulean_crisis: ['#071a22', '#18445b', '#84e6f5'],
  void_rift: ['#111326', '#322e54', '#a8d9e8'],
  steam_brass: ['#141e20', '#3f4937', '#d4a45b'],
  divine_awe: ['#101d2a', '#334c55', '#bad5d3'],
  solemn_focus: ['#111d23', '#33454c', '#c9b685'],
  dissolution: ['#192026', '#565345', '#e7d8b3'],
  melancholy_silver: ['#0e1924', '#304251', '#b0c7da'],
  hopeful_gold: ['#17251f', '#48513a', '#e7bf74'],
};
const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
void main(){
 vec2 p = aPosition * uOutputFrame.zw + uOutputFrame.xy;
 p.x = p.x * (2.0/uOutputTexture.x) - 1.0;
 p.y = p.y * (2.0*uOutputTexture.z/uOutputTexture.y) - uOutputTexture.z;
 gl_Position = vec4(p,0.0,1.0);
 vTextureCoord = aPosition * (uOutputFrame.zw*uInputSize.zw);
}`;
const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uAberration;
uniform float uTime;
void main(){
 vec2 uv=vTextureCoord;
 vec4 c=texture(uTexture,uv);
 c.r=texture(uTexture,uv+vec2(uAberration,0.0)).r;
 c.b=texture(uTexture,uv-vec2(uAberration,0.0)).b;
 float grain=fract(sin(dot(uv+uTime*.001,vec2(12.9898,78.233)))*43758.5453);
 float vignette=smoothstep(.85,.18,distance(uv,vec2(.58,.44)));
 c.rgb *= .62+.38*vignette;
 c.rgb += (grain-.5)*.025*c.a;
 finalColor=c;
}`;
type Particle = { sprite: Sprite; x: number; y: number; speed: number; phase: number; steam: boolean };
type Gear = { graphic: Graphics; speed: number };

export class StageManager {
  readonly app = new Application();
  readonly choreographer = new Choreographer();
  private root = new Container();
  private scenery = new Container();
  private particles = new Container();
  private effects = new Container();
  private current?: Container;
  private gears: Gear[] = [];
  private motes: Particle[] = [];
  private glowTexture!: Texture;
  private filter!: Filter;
  private elapsed = 0;
  private location = '';
  private mood: Mood = 'warm_amber';
  private pointer = { x: 0, y: 0 };
  private scale = 1;
  private active = true;
  private effectState = { aberration: 0 };
  async init(host: HTMLElement) {
    await this.app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true, resolution: Math.min(devicePixelRatio, 1.5), autoDensity: true, preference: 'webgl', powerPreference: 'low-power' });
    host.append(this.app.canvas);
    this.app.canvas.setAttribute('aria-hidden', 'true');
    this.app.stage.addChild(this.root);
    this.root.addChild(this.scenery, this.particles, this.effects);
    this.root.filterArea = new Rectangle(0, 0, 1600, 1000);
    this.filter = Filter.from({ gl: { vertex, fragment }, resources: { atmosphere: { uAberration: { value: 0, type: 'f32' }, uTime: { value: 0, type: 'f32' } } } });
    this.root.filters = [this.filter];
    this.glowTexture = this.makeGlow();
    this.seedParticles();
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onPointer);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.app.ticker.maxFPS = 60;
    this.app.ticker.add(ticker => this.tick(Math.min(ticker.deltaMS / 1000, .05)));
    this.setScene('torin_workshop_warm', 'warm_amber');
  }
  private makeGlow() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,245,214,1)'); g.addColorStop(.12,'rgba(255,230,171,.6)'); g.addColorStop(.45,'rgba(255,217,140,.13)'); g.addColorStop(1,'rgba(255,217,140,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,128,128);
    return Texture.from(canvas);
  }
  private background(palette: [string,string,string]) {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1000;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = palette[0]; ctx.fillRect(0,0,1600,1000);
    const g = ctx.createRadialGradient(1120,420,0,1060,450,900);
    g.addColorStop(0,palette[1]); g.addColorStop(1,palette[0]);
    ctx.fillStyle=g; ctx.fillRect(0,0,1600,1000);
    // Fine engraved ruling gives the scenery the texture of an old scientific plate.
    ctx.strokeStyle=palette[2]; ctx.globalAlpha=.035; ctx.lineWidth=1;
    for(let x=0;x<1600;x+=48){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,1000);ctx.stroke(); }
    for(let y=0;y<1000;y+=48){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1600,y);ctx.stroke(); }
    return new Sprite(Texture.from(canvas));
  }
  private gear(parent: Container, x: number, y: number, radius: number, color: string, speed = .025) {
    const g = new Graphics(); g.position.set(x,y);
    const teeth = Math.round(radius / 8) + 12;
    const points: number[] = [];
    for(let i=0;i<teeth*4;i++) {
      const angle = i/(teeth*4)*Math.PI*2; const r = radius * (i%4===0 || i%4===3 ? .9 : 1);
      points.push(Math.cos(angle)*r,Math.sin(angle)*r);
    }
    g.poly(points).fill({color: '#101c19',alpha:.8}).stroke({ color, width: 1.5, alpha: .48 });
    g.circle(0,0,radius*.77).stroke({color,width:1,alpha:.36});
    g.circle(0,0,radius*.68).stroke({color,width:1,alpha:.18});
    g.circle(0,0,radius*.16).fill('#17231f').stroke({color,width:2,alpha:.6});
    for(let i=0;i<6;i++) {const a=i*Math.PI/3;g.moveTo(Math.cos(a)*radius*.2,Math.sin(a)*radius*.2).lineTo(Math.cos(a)*radius*.68,Math.sin(a)*radius*.68).stroke({color,width:radius*.055,alpha:.3});}
    parent.addChild(g); this.gears.push({graphic:g,speed});
    return g;
  }
  private glow(parent: Container, x: number, y: number, size: number, color: string, alpha: number) {
    const sprite = new Sprite(this.glowTexture); sprite.anchor.set(.5); sprite.position.set(x,y); sprite.width=sprite.height=size; sprite.tint=color; sprite.alpha=alpha; sprite.blendMode='add'; parent.addChild(sprite); return sprite;
  }
  private instrument(parent: Container, color: string, rift = false) {
    const instrument = new Container(); instrument.position.set(1110,460); parent.addChild(instrument);
    this.glow(instrument,0,0,850,color,.22);
    const g = new Graphics(); instrument.addChild(g);
    for (const r of [258,248,230,191,183,120,110]) g.circle(0,0,r).stroke({color,width:r===248?3:1,alpha:r===248?.7:.28});
    for(let i=0;i<120;i++) {
      const a=i/120*Math.PI*2; const inner=i%5===0?236:242;
      g.moveTo(Math.cos(a)*inner,Math.sin(a)*inner).lineTo(Math.cos(a)*248,Math.sin(a)*248).stroke({color,width:1,alpha:.65});
    }
    for(let i=0;i<4;i++) {
      const a=i*Math.PI/2+Math.PI/4;
      const x=Math.cos(a)*200,y=Math.sin(a)*200;
      this.gear(instrument,x,y,52,color,i%2?-.04:.04);
    }
    const orbit = new Graphics(); orbit.ellipse(0,0,210,65).stroke({color,width:1.2,alpha:.7});orbit.rotation=-.6;instrument.addChild(orbit);this.gears.push({graphic:orbit,speed:.014});
    const orbit2 = new Graphics(); orbit2.ellipse(0,0,74,210).stroke({color,width:1.2,alpha:.5});orbit2.rotation=.5;instrument.addChild(orbit2);this.gears.push({graphic:orbit2,speed:-.018});
    this.glow(instrument,0,0,320,color,.9);
    g.circle(0,0,47).fill({color,alpha:.08}).stroke({color,width:1,alpha:.8});
    g.circle(0,0,34).stroke({color,width:1,alpha:.4});
    for(let i=0;i<7;i++) {const h=12+Math.sin(i*.9)*20;g.moveTo((i-3)*8,-h).lineTo((i-3)*8,h).stroke({color,width:2,alpha:.8});}
    if(!rift) {
      g.moveTo(-180,210).lineTo(-205,290).lineTo(205,290).lineTo(180,210).stroke({color,width:2,alpha:.5});
      g.rect(-150,290,300,14).fill({color,alpha:.13}).stroke({color,width:1,alpha:.4});
      for(const x of [-120,120])g.rect(x-7,305,14,100).fill({color:'#10201b',alpha:.9}).stroke({color,width:1,alpha:.35});
    } else {
      for(let i=0;i<6;i++){const ring=new Graphics().ellipse(0,0,140+i*21,200+i*17).stroke({color,width:1,alpha:.22});ring.rotation=i*.23;instrument.addChild(ring);this.gears.push({graphic:ring,speed:(i%2?1:-1)*.05});}
    }
  }
  private architecture(parent: Container, location: string, color: string) {
    const g = new Graphics(); parent.addChild(g);
    const city = location === 'underworld_city' || location === 'castle_gates' || location === 'molten_plains';
    if(city) {
      for(let i=0;i<18;i++) {
        const x=590+i*65; const h=90+((i*73)%230); const y=790-h;
        g.rect(x,y,53,h+180).fill({color:'#0c1718',alpha:.8}).stroke({color,width:1,alpha:.19});
        g.poly([x-8,y,x+26,y-38,x+61,y]).fill({color:'#111e1d',alpha:.9}).stroke({color,width:1,alpha:.3});
        for(let j=0;j<4;j++) g.roundRect(x+18,y+20+j*48,13,24,6).fill({color,alpha:.16});
        if(i%3===0)this.gear(parent,x+26,y+85,35,color,.03);
      }
      if(location==='castle_gates') {
        g.moveTo(900,950).lineTo(900,380).bezierCurveTo(900,230,1110,140,1110,140).bezierCurveTo(1110,140,1320,230,1320,380).lineTo(1320,950).stroke({color,width:12,alpha:.35});
        for(const x of [855,1365]) this.figure(parent,x,690,color,1.8);
      }
      if(location==='molten_plains') {
        for(let i=0;i<5;i++) g.moveTo(600,820+i*22).bezierCurveTo(900,660+i*22,1100,1010+i*22,1700,750+i*22).stroke({color,width:8-i,alpha:.2});
      }
    } else {
      for(let i=0;i<5;i++) {
        const x=650+i*240;
        g.moveTo(x,1000).lineTo(x,230).bezierCurveTo(x,130,x+100,85,x+100,85).bezierCurveTo(x+100,85,x+200,130,x+200,230).lineTo(x+200,1000).stroke({color,width:2,alpha:.17});
        g.moveTo(x+12,1000).lineTo(x+12,235).bezierCurveTo(x+12,155,x+100,108,x+100,108).bezierCurveTo(x+100,108,x+188,155,x+188,235).lineTo(x+188,1000).stroke({color,width:1,alpha:.12});
      }
      if(location==='archivists_hall')for(let i=0;i<9;i++) {
        const x=740+i%3*230,y=260+Math.floor(i/3)*200;
        g.circle(x,y,60).stroke({color,width:2,alpha:.5});g.circle(x,y,54).stroke({color,width:1,alpha:.25});g.moveTo(x,y-40).lineTo(x,y).lineTo(x+25,y+10).stroke({color,width:2,alpha:.6});
      }
      if(location==='tarnished_gear_tavern') {
        g.rect(650,710,1000,18).fill({color,alpha:.2});
        for(let i=0;i<6;i++) this.figure(parent,730+i*155,630,color,.65+(i%2)*.12);
      }
    }
    if(location==='throne_room') {
      for(const [x,s] of [[950,1.1],[1280,1.45]])this.figure(parent,x,530,color,s);
      for(let i=0;i<4;i++){const ring=new Graphics().ellipse(1120,220,300-i*35,80+i*20).stroke({color,width:1,alpha:.25});parent.addChild(ring);}
    }
    if(location==='concert_hall_aurora') {
      g.ellipse(1120,750,320,65).fill({color,alpha:.07}).stroke({color,width:1,alpha:.3});
      this.figure(parent,1120,530,color,1.3);
      for(let i=0;i<12;i++){const x=760+i*65;g.moveTo(x,100).lineTo(x,370-(i%4)*45).stroke({color,width:1,alpha:.2});this.glow(parent,x,370-(i%4)*45,90,color,.45);}
    }
  }
  private figure(parent: Container,x: number,y: number,color: string,scale: number) {
    const g=new Graphics();g.position.set(x,y);g.scale.set(scale);parent.addChild(g);
    g.circle(0,-65,23).fill({color:'#14201e',alpha:.9}).stroke({color,width:1,alpha:.6});
    g.poly([-25,-30,25,-30,42,90,-42,90]).fill({color:'#15221f',alpha:.9}).stroke({color,width:1,alpha:.5});
    g.moveTo(-25,-20).lineTo(-48,40).moveTo(25,-20).lineTo(48,40).moveTo(-17,90).lineTo(-20,150).moveTo(17,90).lineTo(20,150).stroke({color,width:5,alpha:.35});
    this.glow(parent,x,y,90*scale,color,.6);
  }
  private setScene(location: string, mood: Mood) {
    if(location===this.location && mood===this.mood)return;
    this.location=location;this.mood=mood;
    // Settle an interrupted crossfade before replacing scenery, keeping at most two scenes alive.
    for(const child of [...this.scenery.children]) {
      gsap.killTweensOf(child);
      if(child!==this.current) {this.scenery.removeChild(child);child.destroy({children:true,texture:true,textureSource:true});}
    }
    const old=this.current;
    this.gears=[];
    const scene=new Container(); scene.alpha=old?0:1;
    this.scenery.addChild(scene); this.current=scene;
    const palette=palettes[mood], color=palette[2];
    scene.addChild(this.background(palette));
    this.architecture(scene,location,color);
    if(/workshop|rift|exhibition/.test(location))this.instrument(scene,color,location==='aether_rift');
    this.gear(scene,1530,850,200,color,-.018);
    this.gear(scene,1450,140,100,color,.025);
    // Hanging lanterns, framing pipes, a low horizon and drifting atmospheric light.
    const frame = new Graphics();scene.addChild(frame);
    frame.moveTo(620,980).lineTo(620,40).lineTo(1590,40).stroke({color,width:2,alpha:.17});
    for(let i=0;i<3;i++){const x=780+i*350,y=140+(i%2)*100;frame.moveTo(x,0).lineTo(x,y).stroke({color,width:1,alpha:.24});frame.poly([x-10,y,x,y-12,x+10,y,x,y+24]).stroke({color,width:1,alpha:.5});this.glow(scene,x,y,150,color,.2);}
    this.glow(scene,1100,800,1000,color,.12);
    for(const p of this.motes)p.sprite.tint=color;
    this.choreographer.fade(scene,1);
    if(old)this.choreographer.fade(old,0,()=>{if(old.parent){old.parent.removeChild(old);old.destroy({children:true,texture:true,textureSource:true});}});
  }
  show(beat: Beat, trigger = true) {
    this.setScene(beat.location,beat.mood);this.choreographer.move(beat);
    if(trigger && beat.effectTrigger)this.trigger(beat.effectTrigger);
  }
  cover() { this.setScene('torin_workshop_warm','warm_amber'); this.choreographer.move({camera:{zoom:1,panX:0,panY:0}} as Beat); }
  private trigger(effect: Effect) {
    gsap.killTweensOf(this.effectState);
    for(const child of [...this.effects.children]){gsap.killTweensOf(child);gsap.killTweensOf(child.scale);child.destroy();}
    this.effectState.aberration=0;
    if(this.choreographer.reduced)return;
    const color=palettes[this.mood][2];
    if(effect==='overheat_flash' || effect==='rift_tear') {
      this.effectState.aberration=.012;
      gsap.to(this.effectState,{aberration:0,duration:2.5});
      const flash = new Graphics().rect(0,0,1600,1000).fill({color:effect==='rift_tear'?'#bccaff':'#d4f7ff',alpha:.7});this.effects.addChild(flash);
      gsap.to(flash,{alpha:0,duration:2,onComplete:()=>flash.destroy()});
    }
    if(effect==='dissolve_particles') {
      for(let i=0;i<95;i++){
        const p=this.glow(this.effects,940+Math.random()*330,400+Math.random()*430,12+Math.random()*18,i%2?'#fff6df':color,.8);
        gsap.to(p,{y:p.y-300-Math.random()*300,x:p.x+(Math.random()-.5)*200,alpha:0,duration:3+Math.random()*3,delay:Math.random(),onComplete:()=>p.destroy()});
      }
    } else {
      for(let i=0;i<4;i++){
        const ring=new Graphics().circle(0,0,80).stroke({color,width:1.5,alpha:.7});ring.position.set(1110,460);this.effects.addChild(ring);
        gsap.to(ring.scale,{x:5+i,y:5+i,duration:3+i,delay:i*.2,ease:'sine.out'});
        gsap.to(ring,{alpha:0,duration:3+i,delay:i*.2,onComplete:()=>ring.destroy()});
      }
      if(effect==='memory_projection') {const memory=new Container();this.effects.addChild(memory);this.figure(memory,1110,460,color,1.5);gsap.to(memory,{alpha:0,duration:6,onComplete:()=>memory.destroy({children:true})});}
    }
  }
  private seedParticles() {
    for(let i=0;i<76;i++) {
      const steam=i<12, size=steam?160+Math.random()*180:3+Math.random()*11;
      const sprite=this.glow(this.particles,0,0,size,'#d3ad63',steam?.035:.3+Math.random()*.4);
      this.motes.push({sprite,x:Math.random()*1600,y:Math.random()*1000,speed:steam?8+Math.random()*9:7+Math.random()*23,phase:Math.random()*6.28,steam});
    }
  }
  private tick(dt:number) {
    if(!this.active)return;
    const reduced=this.choreographer.reduced;
    if(!reduced)this.elapsed+=dt;
    const cam=this.choreographer.camera;
    this.root.scale.set(this.scale*cam.zoom);
    const shake=reduced?0:cam.shake;
    this.root.position.set((innerWidth-1600*this.scale*cam.zoom)/2+cam.x+(Math.random()-.5)*shake,(innerHeight-1000*this.scale*cam.zoom)/2+cam.y+(Math.random()-.5)*shake);
    this.scenery.position.set(reduced?0:this.pointer.x*9,reduced?0:this.pointer.y*6);
    this.particles.position.set(reduced?0:this.pointer.x*20,reduced?0:this.pointer.y*12);
    if(!reduced) {
      for(const gear of this.gears)gear.graphic.rotation+=gear.speed*dt;
      for(const p of this.motes){p.y-=p.speed*dt;if(p.y < -150)p.y=1150;p.sprite.position.set(p.x+Math.sin(this.elapsed*.25+p.phase)*(p.steam?70:15),p.y);}
    } else for(const p of this.motes)p.sprite.position.set(p.x,p.y);
    this.filter.resources.atmosphere.uniforms.uTime=this.elapsed;
    this.filter.resources.atmosphere.uniforms.uAberration=this.effectState.aberration;
  }
  private resize = () => {this.scale=Math.max(innerWidth/1600,innerHeight/1000);};
  private onPointer = (e: PointerEvent) => {this.pointer.x=e.clientX/innerWidth-.5;this.pointer.y=e.clientY/innerHeight-.5;};
  private onVisibility = () => {this.active=!document.hidden;if(this.active)this.app.start();else this.app.stop();};
}

import './style.css';
import { StageManager } from './engine/StageManager';
import { AudioSynth } from './engine/AudioSynth';
import { StoryReader } from './ui/StoryReader';

const stage = new StageManager();
let available = true;
try { await stage.init(document.querySelector<HTMLElement>('#stage')!); }
catch (error) {
  available = false;
  console.warn('The animated stage is unavailable; the complete reader remains available.', error);
  document.body.classList.add('static-stage');
}
new StoryReader(document.querySelector<HTMLElement>('#app')!, available ? stage : undefined, new AudioSynth());

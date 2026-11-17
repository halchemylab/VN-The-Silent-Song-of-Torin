import { gsap } from "gsap";
import type { Container } from "pixi.js";
import type { Beat } from "../data/storyboard";

export class Choreographer {
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  camera = { zoom: 1, x: 0, y: 0, shake: 0 };
  move(beat: Beat) {
    gsap.killTweensOf(this.camera);
    gsap.to(this.camera, {
      zoom: this.reduced ? 1 : beat.camera.zoom,
      x: this.reduced ? 0 : beat.camera.panX,
      y: this.reduced ? 0 : beat.camera.panY,
      shake: 0,
      duration: this.reduced ? 0 : 3,
      ease: "sine.inOut",
    });
    if (!this.reduced && beat.camera.shake) {
      this.camera.shake = beat.camera.shake;
      gsap.to(this.camera, { shake: 0, duration: 1.5 });
    }
  }
  reveal(element: HTMLElement) {
    gsap.killTweensOf(element);
    gsap.fromTo(
      element,
      { opacity: this.reduced ? 1 : 0, y: this.reduced ? 0 : 12 },
      {
        opacity: 1,
        y: 0,
        duration: this.reduced ? 0 : 0.65,
        ease: "power2.out",
      },
    );
  }
  stopScroll(element: HTMLElement) {
    gsap.killTweensOf(element);
  }
  autoScroll(element: HTMLElement, milliseconds: number) {
    const remaining = element.scrollHeight - element.clientHeight;
    if (remaining > 0)
      gsap.to(element, {
        scrollTop: remaining,
        duration: Math.max(1, milliseconds / 1000 - 4),
        delay: 2,
        ease: "none",
      });
  }
  fade(object: Container, alpha: number, done?: () => void) {
    gsap.to(object, {
      alpha,
      duration: this.reduced ? 0 : 1.2,
      onComplete: done,
    });
  }
}

/*
 * Brad & Prad signature motions for HyperFrames. Depends only on GSAP, and everything is
 * a tween on a timeline, so any frame can be seeked to directly.
 */
(function (root) {
  "use strict";

  /**
   * The channel's opening: a full orange sheet rips along one tear and flies apart.
   * Expects elements with .bp-torn-top and .bp-torn-bottom, which start out sealed.
   */
  function tornReveal(timeline, { top, bottom, at = 0.15, hold = 0.2, duration = 0.65 } = {}) {
    const openAt = at + hold;
    // A tiny shudder as the paper gives way, before it tears.
    timeline.fromTo(top, { y: 0, rotation: 0 }, { y: -10, rotation: -0.25, duration: hold, ease: "power2.in" }, at);
    timeline.fromTo(bottom, { y: 0, rotation: 0 }, { y: 10, rotation: 0.25, duration: hold, ease: "power2.in" }, at);
    timeline.to(top, { y: -1240, rotation: -2.4, duration, ease: "power3.inOut" }, openAt);
    timeline.to(bottom, { y: 1240, rotation: 2, duration, ease: "power3.inOut" }, openAt);
    return openAt + duration;
  }

  /** Words of a headline rising into place, one after another, without per-letter noise. */
  function riseIn(timeline, targets, { at = 0, stagger = 0.09, duration = 0.5 } = {}) {
    timeline.from(targets, { y: 34, opacity: 0, duration, stagger, ease: "power3.out" }, at);
    return timeline;
  }

  /**
   * Stop-motion paper: hard cuts between crumpled sheets, never a fade. The sheet shown is a
   * pure function of time, delivered through a setter so a seek always lands on the right one.
   * Cuts fall every `step` seconds and on each `accents` time; steady cuts too close to an
   * accent are dropped, so a jump on a key moment never stutters.
   */
  function paperJump(timeline, { layers, duration, step = 0.5, accents = [], gap = 0.2 } = {}) {
    const sheets = Array.from(document.querySelectorAll(layers));
    const cuts = [...accents];
    for (let time = step; time < duration; time += step) {
      if (accents.every((accent) => Math.abs(accent - time) >= gap)) cuts.push(time);
    }
    cuts.sort((first, second) => first - second);

    let driverTime = 0;
    const show = (time) => {
      const passed = cuts.filter((cut) => cut <= time).length;
      sheets.forEach((sheet, index) => {
        sheet.style.opacity = index === passed % sheets.length ? "1" : "0";
      });
    };
    const driver = {
      get time() {
        return driverTime;
      },
      set time(value) {
        driverTime = value;
        show(value);
      },
    };
    timeline.fromTo(driver, { time: 0 }, { time: duration, duration, ease: "none", immediateRender: true }, 0);
    show(0);
    return timeline;
  }

  root.BrandKit = { tornReveal, riseIn, paperJump };
})(typeof globalThis !== "undefined" ? globalThis : this);

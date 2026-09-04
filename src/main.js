/**
 * RIVO - application shell.
 *
 * Navigation, content rendering, the hero datum and the hero slider. Styles are
 * linked from <head> (src/styles/site.css), not imported here, so the first
 * paint is already styled.
 * No WebGL, no animation library: the background is CSS, the slider is CSS + a timer.
 */

import { initNavigation } from './ui/navigation.js';
import { renderProjects } from './ui/projects.js';
import { initInteractions } from './ui/interactions.js';
import { initDatum } from './ui/datum.js';
import { initSlider } from './ui/slider.js';

document.documentElement.classList.add('js');

const cards = document.querySelector('[data-projects]');
if (cards && !cards.children.length) renderProjects(cards, 'featured'); // normally prerendered by scripts/build-pages.mjs
initNavigation();
initInteractions();
const datum = initDatum();
const slider = initSlider(document.querySelector('[data-hero-slider]'));

if (import.meta.env.DEV) window.__rivo = { datum, slider }; // review handle: __rivo.slider.stop() / .show(i)

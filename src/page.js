/**
 * RIVO - shell for the generated pages (projects.html, projects/<slug>.html).
 * Navigation and the year; styles are linked from <head>, content is in the markup.
 */

import { initNavigation } from './ui/navigation.js';

document.documentElement.classList.add('js');
initNavigation();

const year = document.querySelector('[data-year]');
if (year) year.textContent = String(new Date().getFullYear());

/**
 * Hero slider: one frame per project, in the order they play.
 *
 * `image.name` is a file in assets-src/images/ run through `npm run assets:images`
 * (the manifest supplies the widths). Titles and places are taken from the
 * project folder names (RIVO-PROJECTS/<address>-<city>); nothing else is
 * asserted about the projects here.
 *
 * Frames are the ones named in the NotebookLM "RIVO" notebook, where each
 * project's photographs are numbered in the ASCII order of the folder
 * (uppercase before lowercase):
 *   260-WASHINGTON-BELLEVILLE-3 = facade-1.jpg  -> 260-washington-belleville-01
 *   301-WASHINGTON-HOBOKEN-5    = facade-3.png  -> 301-washington-hoboken-05
 *   1404-WILLOW-HOBOKEN-6       = website/facade-2.png -> 1404-willow-hoboken-08
 */
export const heroSlides = [
  {
    id: '260-washington-belleville',
    title: '260 Washington',
    place: 'Belleville',
    image: { name: '260-washington-belleville-01', alt: '260 Washington, Belleville: street elevation' },
    focus: '50% 40%',
  },
  {
    id: '301-washington-hoboken',
    title: '301 Washington',
    place: 'Hoboken',
    image: { name: '301-washington-hoboken-05', alt: '301 Washington, Hoboken: street view along the storefronts' },
    focus: '50% 45%',
  },
  {
    id: '1404-willow-hoboken',
    title: '1404 Willow',
    place: 'Hoboken',
    image: { name: '1404-willow-hoboken-08', alt: '1404 Willow, Hoboken: corner elevation' },
    focus: '50% 40%',
  },
];

/** milliseconds each frame holds before the next cut */
export const HERO_INTERVAL = 5600;
/** milliseconds the cut takes to wipe the next frame in */
export const HERO_WIPE = 1500;

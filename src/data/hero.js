/**
 * Hero slider: the frames in the order they play.
 *
 * `image.name` is a file in assets-src/images/ run through `npm run assets:images`
 * (the manifest supplies the widths). Titles and places are taken from the
 * project folder names (RIVO-PROJECTS/<address>-<city>); nothing else is
 * asserted about the projects here.
 *
 * Frames are picked by their names in the NotebookLM "RIVO" notebook. The
 * notebook numbers each project's photographs in the ASCII order of its folder
 * (website/ subfolder where there is one); `npm run index:notebook` rebuilds
 * src/data/notebook-index.json, which maps those names to the local files:
 *   FIAT HOUSE-1              = website/FIAT HOUSE-1.webp -> fiat-house-01
 *   FIAT HOUSE-2              = website/FIAT HOUSE-2.webp -> fiat-house-02
 *   1404-WILLOW-HOBOKEN-2     = website/10.png            -> 1404-willow-hoboken-02
 *   1404-WILLOW-HOBOKEN-6     = website/facade-2.png      -> 1404-willow-hoboken-06
 *   301-WASHINGTON-HOBOKEN-5  = facade-3.png              -> 301-washington-hoboken-05
 *   301-WASHINGTON-HOBOKEN-2  = Unit-2.png                -> 301-washington-hoboken-02
 */
export const heroSlides = [
  {
    id: 'fiat-house-1',
    title: 'Fiat House',
    place: '',
    image: { name: 'fiat-house-01', alt: 'Fiat House: building exterior at dusk' },
    focus: '50% 45%',
  },
  {
    id: 'fiat-house-2',
    title: 'Fiat House',
    place: '',
    image: { name: 'fiat-house-02', alt: 'Fiat House: double-height lounge with a shelving wall' },
    focus: '55% 50%',
  },
  {
    id: '1404-willow-hoboken-2',
    title: '1404 Willow',
    place: 'Hoboken',
    image: { name: '1404-willow-hoboken-02', alt: '1404 Willow, Hoboken: amenity lounge with a wood ceiling' },
    focus: '50% 50%',
  },
  {
    id: '1404-willow-hoboken-6',
    title: '1404 Willow',
    place: 'Hoboken',
    image: { name: '1404-willow-hoboken-06', alt: '1404 Willow, Hoboken: corner elevation' },
    focus: '50% 40%',
  },
  {
    id: '301-washington-hoboken-5',
    title: '301 Washington',
    place: 'Hoboken',
    image: { name: '301-washington-hoboken-05', alt: '301 Washington, Hoboken: street view along the storefronts' },
    focus: '50% 45%',
  },
  {
    id: '301-washington-hoboken-2',
    title: '301 Washington',
    place: 'Hoboken',
    image: { name: '301-washington-hoboken-02', alt: '301 Washington, Hoboken: unit kitchen, white fronts with an oak tall run' },
    focus: '50% 50%',
  },
];

/** milliseconds each frame holds before the next cut */
export const HERO_INTERVAL = 5600;
/** milliseconds the cut takes to wipe the next frame in */
export const HERO_WIPE = 1500;

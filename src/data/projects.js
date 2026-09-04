/**
 * Projects: the single source for the homepage cards, the project list page
 * (projects.html) and the project detail pages (projects/<slug>.html, generated
 * by scripts/build-pages.mjs). Plain data, no imports: Node reads this file too.
 *
 * Photography lives in assets-src/images/<slug>-NN.<ext> and goes through
 * `npm run assets:images`; the manifest supplies widths and aspect ratios.
 * `cover` is the frame used on cards. `summary` is the one or two sentences on
 * the detail page and describes what the photographs show; `location` is taken
 * from the project folder name and left empty where the folder gives none.
 *
 * The NotebookLM "RIVO" notebook numbers each project's photographs in the
 * ASCII order of its folder (uppercase before lowercase): 1404-WILLOW-HOBOKEN-7
 * is website/facade.png, 301-WASHINGTON-HOBOKEN-4 is facade-2.png. Covers follow
 * those names.
 *
 * Field names mirror the RIVO drawing title block.
 */
export const projects = [
  {
    slug: '1404-willow-hoboken',
    title: '1404 Willow',
    location: 'Hoboken',
    sector: 'Residential',
    scope: 'Lobby, mail room, stair screen, amenity spaces',
    summary:
      'Lobby, mail room and amenity floor of a residential building on Willow Avenue, Hoboken. Pale wood lines the corridors and ceilings, a lath screen runs along the stair, and the mailboxes sit in dark lacquer volumes cut into the timber.',
    featured: true,
    cover: '1404-willow-hoboken-07',
    focus: '50% 45%',
    gallery: [
      { name: '1404-willow-hoboken-07', alt: 'Street elevation, corner view' },
      { name: '1404-willow-hoboken-01', alt: 'Stair with a lath screen and a concrete column' },
      { name: '1404-willow-hoboken-02', alt: 'Lath wall along the stair, lobby' },
      { name: '1404-willow-hoboken-03', alt: 'Wood-lined corridor with artwork' },
      { name: '1404-willow-hoboken-04', alt: 'Mail room: dark lacquer mailboxes in a timber-lined space' },
      { name: '1404-willow-hoboken-05', alt: 'Amenity lounge with a wood ceiling' },
      { name: '1404-willow-hoboken-06', alt: 'Lounge corridor, dark wall panels against timber' },
      { name: '1404-willow-hoboken-08', alt: 'Corner elevation' },
    ],
  },
  {
    slug: '301-washington-hoboken',
    title: '301 Washington',
    location: 'Hoboken',
    sector: 'Residential',
    scope: 'Unit kitchens',
    summary:
      'Unit kitchens for a mixed-use building on Washington Street, Hoboken. Flat white fronts run the length of each kitchen, and a warm oak tall run frames the refrigerator and turns the corner into the island.',
    featured: true,
    cover: '301-washington-hoboken-04',
    focus: '50% 45%',
    gallery: [
      { name: '301-washington-hoboken-04', alt: 'Corner view of the building' },
      { name: '301-washington-hoboken-01', alt: 'Unit kitchen with island and oak tall cabinets' },
      { name: '301-washington-hoboken-02', alt: 'Unit kitchen, white fronts with an oak tall run' },
      { name: '301-washington-hoboken-03', alt: 'Street elevation, Washington Street' },
      { name: '301-washington-hoboken-05', alt: 'Street view along the storefronts' },
    ],
  },
  {
    slug: '260-washington-belleville',
    title: '260 Washington',
    location: 'Belleville',
    sector: 'Residential',
    scope: 'Kitchens, wardrobes, vanities',
    summary:
      'Kitchens, wardrobes and bathroom vanities for the residential units at 260 Washington, Belleville. Pale oak with flat fronts throughout, open wardrobe systems with integrated lighting, and a floating vanity under a mirrored cabinet.',
    featured: false,
    cover: '260-washington-belleville-01',
    focus: '50% 40%',
    gallery: [
      { name: '260-washington-belleville-01', alt: 'Street elevation' },
      { name: '260-washington-belleville-02', alt: 'Unit kitchen and living room in pale oak' },
      { name: '260-washington-belleville-03', alt: 'Open wardrobe system with lighting' },
      { name: '260-washington-belleville-04', alt: 'Bathroom with a floating oak vanity' },
      { name: '260-washington-belleville-05', alt: 'Building elevation, rear' },
    ],
  },
  {
    slug: 'double-tree-hilton-fort-lee',
    title: 'DoubleTree by Hilton',
    location: 'Fort Lee',
    sector: 'Hospitality',
    scope: 'Reception, lobby, bar, restaurant, boardroom, ballroom',
    summary:
      'Public areas of the DoubleTree by Hilton in Fort Lee. A stone reception desk against a paneled feature wall, the lobby stair and elevator surrounds, a back-lit bar wall, screened restaurant seating, a boardroom and the ballroom with full-height wall panels.',
    featured: false,
    cover: 'double-tree-hilton-fort-lee-01',
    focus: '50% 50%',
    gallery: [
      { name: 'double-tree-hilton-fort-lee-01', alt: 'Reception desk and feature wall' },
      { name: 'double-tree-hilton-fort-lee-02', alt: 'Lobby stair and elevator lobby' },
      { name: 'double-tree-hilton-fort-lee-03', alt: 'Bar with a back-lit shelving wall' },
      { name: 'double-tree-hilton-fort-lee-04', alt: 'Restaurant with screens and wood ceiling' },
      { name: 'double-tree-hilton-fort-lee-05', alt: 'Boardroom with wall panels' },
      { name: 'double-tree-hilton-fort-lee-06', alt: 'Ballroom with full-height panels' },
    ],
  },
  {
    slug: 'hudson-cliff',
    title: 'Hudson Cliff',
    location: '',
    sector: 'Residential',
    scope: 'Lobby, elevator hall, kitchens, vanities, wardrobes',
    summary:
      'Lobby, elevator hall and unit interiors at Hudson Cliff. A slatted ceiling carries across the reception wall, the elevator hall is lined in warm oak and stone, and the same oak returns in the unit kitchens, vanities and wardrobes.',
    featured: false,
    cover: 'hudson-cliff-02',
    focus: '50% 50%',
    gallery: [
      { name: 'hudson-cliff-02', alt: 'Lobby with reception desk and slatted ceiling' },
      { name: 'hudson-cliff-03', alt: 'Lobby lounge' },
      { name: 'hudson-cliff-04', alt: 'Lounge seating with wood wall panels' },
      { name: 'hudson-cliff-05', alt: 'Unit kitchen with island' },
      { name: 'hudson-cliff-06', alt: 'Bathroom vanity with integrated lighting' },
      { name: 'hudson-cliff-07', alt: 'Wardrobe and entry console' },
      { name: 'hudson-cliff-08', alt: 'Elevator hall in oak and stone' },
      { name: 'hudson-cliff-01', alt: 'Building exterior at dusk' },
    ],
  },
  {
    slug: 'fiat-house',
    title: 'Fiat House',
    location: '',
    sector: 'Residential',
    scope: 'Amenity lounge, kitchens, bedroom built-ins',
    summary:
      'Amenity lounge and unit interiors at Fiat House. A full-height shelving wall anchors the double-height lounge, and the units carry walnut-toned kitchens with white counters and bedroom built-ins in the same finish.',
    featured: false,
    cover: 'fiat-house-02',
    focus: '60% 50%',
    gallery: [
      { name: 'fiat-house-02', alt: 'Double-height lounge with a shelving wall' },
      { name: 'fiat-house-01', alt: 'Entrance lobby with a green wall' },
      { name: 'fiat-house-03', alt: 'Unit kitchen with island' },
      { name: 'fiat-house-04', alt: 'Unit kitchen, L-shaped' },
      { name: 'fiat-house-05', alt: 'Kitchen detail, integrated appliances' },
      { name: 'fiat-house-06', alt: 'Bedroom with built-ins and kitchen beyond' },
      { name: 'fiat-house-07', alt: 'Building exterior' },
    ],
  },
  {
    slug: 'dallas-townhomes',
    title: 'Dallas Townhomes',
    location: 'Dallas',
    sector: 'Residential',
    scope: 'Kitchens, vanities',
    summary:
      'Townhouse kitchens and baths in Dallas. Black high-gloss fronts with a black stone island and brass fittings, and oak vanities with integrated lighting in the bathrooms.',
    featured: false,
    cover: 'dallas-townhomes-02',
    focus: '50% 50%',
    gallery: [
      { name: 'dallas-townhomes-02', alt: 'Black high-gloss kitchen with island' },
      { name: 'dallas-townhomes-03', alt: 'Kitchen island in black stone' },
      { name: 'dallas-townhomes-04', alt: 'Kitchen, view along the island' },
      { name: 'dallas-townhomes-05', alt: 'Bathroom with an oak vanity' },
      { name: 'dallas-townhomes-01', alt: 'Townhouse exteriors' },
    ],
  },
  {
    slug: 'cibo-vita-office',
    title: 'Cibo Vita Office',
    location: '',
    sector: 'Commercial',
    scope: 'Tiered seating, café counter, meeting alcoves, reception',
    summary:
      'Workplace interiors for Cibo Vita. A tiered seating stair with upholstered steps opens the floor, a café counter and open shelving sit under planted lighting, and meeting alcoves and reception are set in oak against terrazzo.',
    featured: false,
    cover: 'cibo-vita-office-01',
    focus: '50% 50%',
    gallery: [
      { name: 'cibo-vita-office-01', alt: 'Tiered seating stair and reception' },
      { name: 'cibo-vita-office-02', alt: 'Café counter with open shelving' },
      { name: 'cibo-vita-office-03', alt: 'Meeting alcove in oak' },
      { name: 'cibo-vita-office-04', alt: 'Reception and lounge' },
    ],
  },
];

export const projectUrl = (p) => `/projects/${p.slug}.html`;
export const featuredProjects = () => projects.filter((p) => p.featured);

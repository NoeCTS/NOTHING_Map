export const MARKET = {
  code: "BER",
  city: "Berlin",
  locationLabel: "BERLIN, DE",
  reportTitle: "Berlin location intelligence report",
  mapTitle: "Berlin Signal Map",
  center: [52.52, 13.405] as [number, number],
  coordsLabel: "LAT: 52.5200° N | LNG: 13.4050° E",
  retailLabel: "Retail Partners",
  agenciesLabel: "Creative Agencies",
  venuesLabel: "Music Venues",
  oohLabels: {
    ubahn_poster: "U-Bahn Posters",
    ubahn_special: "U-Bahn Premium",
    bridge_banner: "Bridge Banners",
    street_furniture: "Street Furniture",
  },
  oohModeBlurb:
    "Maps 5,000+ out-of-home surfaces: U-Bahn posters, track billboards, bridge banners, street furniture.",
  hashtag: "#NothingBerlin",
  searchRegion: "DE",
} as const;

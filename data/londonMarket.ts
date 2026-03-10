export const MARKET = {
  code: "LDN",
  city: "London",
  locationLabel: "LONDON, UK",
  reportTitle: "London location intelligence report",
  mapTitle: "London Signal Map",
  center: [51.5074, -0.1278] as [number, number],
  coordsLabel: "LAT: 51.5074\u00b0 N | LNG: 0.1278\u00b0 W",
  retailLabel: "Retail Anchors",
  agenciesLabel: "Agencies + Studios",
  venuesLabel: "Venues + Nightlife",
  oohLabels: {
    ubahn_poster: "Transit Posters",
    ubahn_special: "Digital Screens",
    bridge_banner: "Large Format",
    street_furniture: "Street Furniture"
  },
  oohModeBlurb: "Maps 2,500+ London OOH surfaces: transit posters, digital screens, large-format sites, and street furniture.",
  hashtag: "#NothingLondon",
  searchRegion: "UK",
} as const;

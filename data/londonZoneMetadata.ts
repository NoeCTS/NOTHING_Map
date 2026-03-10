import { ConfidenceLevel, LocationCategory } from "@/components/types";

export const DATA_REFRESH_DATE = "2026-03-10";

export const ZONE_POLYGONS: Record<string, [number, number][]> = {
  "West End": [
    [
      51.505,
      -0.153
    ],
    [
      51.517,
      -0.153
    ],
    [
      51.517,
      -0.112
    ],
    [
      51.505,
      -0.112
    ]
  ],
  "King's Cross": [
    [
      51.518,
      -0.146
    ],
    [
      51.537,
      -0.146
    ],
    [
      51.537,
      -0.091
    ],
    [
      51.518,
      -0.091
    ]
  ],
  Camden: [
    [
      51.532,
      -0.165
    ],
    [
      51.55,
      -0.165
    ],
    [
      51.55,
      -0.123
    ],
    [
      51.532,
      -0.123
    ]
  ],
  Shoreditch: [
    [
      51.515,
      -0.102
    ],
    [
      51.532,
      -0.102
    ],
    [
      51.532,
      -0.045
    ],
    [
      51.515,
      -0.045
    ]
  ],
  "South Bank": [
    [
      51.495,
      -0.134
    ],
    [
      51.513,
      -0.134
    ],
    [
      51.513,
      -0.065
    ],
    [
      51.495,
      -0.065
    ]
  ],
  Brixton: [
    [
      51.451,
      -0.153
    ],
    [
      51.47,
      -0.153
    ],
    [
      51.47,
      -0.105
    ],
    [
      51.451,
      -0.105
    ]
  ],
  Peckham: [
    [
      51.455,
      -0.091
    ],
    [
      51.485,
      -0.091
    ],
    [
      51.485,
      -0.03
    ],
    [
      51.455,
      -0.03
    ]
  ],
  Stratford: [
    [
      51.532,
      -0.035
    ],
    [
      51.55,
      -0.035
    ],
    [
      51.55,
      0.026
    ],
    [
      51.532,
      0.026
    ]
  ]
};

export const DATA_SOURCE_META: Record<
  LocationCategory,
  {
    confidence: ConfidenceLevel;
    note: string;
    source: string;
    updatedAt: string;
  }
> = {
  retail: {
    source: "Manual London retail anchor shortlist",
    updatedAt: "2026-03-10",
    confidence: "medium",
    note: "High-footfall retail destinations used as conversion anchors rather than an exhaustive partner inventory."
  },
  galleries: {
    source: "GLA Cultural Infrastructure Map 2023 / gallery and museum resources",
    updatedAt: "2026-03-10",
    confidence: "high",
    note: "Open-data cultural inventory with geocoded venue records across London."
  },
  agencies: {
    source: "London agency starter sheet plus inferred studio placement",
    updatedAt: "2026-03-10",
    confidence: "low",
    note: "Agency names come from a starter shortlist and use deterministic central-London placement where addresses were not provided."
  },
  coworking: {
    source: "GLA Cultural Infrastructure Map 2023 / workspaces and third places",
    updatedAt: "2026-03-10",
    confidence: "high",
    note: "Creative coworking, workspaces, and public third places combined as creator-infrastructure signal."
  },
  venues: {
    source: "GLA Cultural Infrastructure Map 2023 / theatres and nightlife resources",
    updatedAt: "2026-03-10",
    confidence: "high",
    note: "Venue layer combines theatre, nightlife, and museum-adjacent cultural destinations."
  },
  schools: {
    source: "Manual London design-school shortlist",
    updatedAt: "2026-03-10",
    confidence: "medium",
    note: "Key design and arts campuses used as youth and creator touchpoints."
  },
  ubahn_poster: {
    source: "London OOH proxy workbook / poster and transport panel buckets",
    updatedAt: "2026-03-10",
    confidence: "medium",
    note: "Deduped planning-proxy inventory mapped to poster-like transit and shelter formats."
  },
  ubahn_special: {
    source: "London OOH proxy workbook / premium digital screens",
    updatedAt: "2026-03-10",
    confidence: "medium",
    note: "Digital screen and premium operator placements with heuristic weighting on flagship sites."
  },
  bridge_banner: {
    source: "London OOH proxy workbook / large-format static inventory",
    updatedAt: "2026-03-10",
    confidence: "medium",
    note: "Billboards, hoardings, and banner wraps used as the large-format corridor layer."
  },
  street_furniture: {
    source: "London OOH proxy workbook / kiosk, totem, and street-furniture formats",
    updatedAt: "2026-03-10",
    confidence: "medium",
    note: "Street-level OOH proxy focused on kiosks, phone hubs, totems, and signage surfaces."
  }
};

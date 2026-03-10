import { ConfidenceLevel, LocationCategory } from "@/components/types";

export const DATA_REFRESH_DATE = "2026-03-10";

export const ZONE_POLYGONS: Record<string, [number, number][]> = {
  Kreuzberg: [
    [52.4864, 13.3748],
    [52.4945, 13.3826],
    [52.5006, 13.3958],
    [52.5064, 13.4124],
    [52.5078, 13.4318],
    [52.5031, 13.4479],
    [52.4949, 13.4475],
    [52.4878, 13.4356],
    [52.4858, 13.4103],
  ],
  Mitte: [
    [52.5112, 13.3609],
    [52.5201, 13.3687],
    [52.5285, 13.3775],
    [52.5362, 13.3908],
    [52.5377, 13.4069],
    [52.5336, 13.4208],
    [52.5243, 13.4208],
    [52.5155, 13.4101],
    [52.5107, 13.3895],
  ],
  Friedrichshain: [
    [52.5015, 13.4296],
    [52.5051, 13.4423],
    [52.5094, 13.4578],
    [52.5147, 13.4808],
    [52.5179, 13.5049],
    [52.5154, 13.5221],
    [52.5078, 13.5168],
    [52.5029, 13.4964],
    [52.5009, 13.4562],
  ],
  Neukolln: [
    [52.4672, 13.4206],
    [52.4726, 13.4299],
    [52.4786, 13.4416],
    [52.4827, 13.4548],
    [52.4814, 13.4689],
    [52.4746, 13.4763],
    [52.4673, 13.4695],
    [52.4645, 13.4531],
    [52.4646, 13.4359],
  ],
  Charlottenburg: [
    [52.4955, 13.2837],
    [52.5019, 13.2898],
    [52.5081, 13.3014],
    [52.5152, 13.3147],
    [52.5167, 13.3329],
    [52.5114, 13.3443],
    [52.5022, 13.3408],
    [52.4967, 13.3276],
    [52.4949, 13.3041],
  ],
  "Prenzlauer Berg": [
    [52.5315, 13.3902],
    [52.5398, 13.3982],
    [52.5487, 13.4064],
    [52.5568, 13.4181],
    [52.5581, 13.4329],
    [52.5536, 13.4427],
    [52.5431, 13.4406],
    [52.5348, 13.4281],
    [52.5312, 13.4074],
  ],
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
    source: "Curated Nothing retail partner shortlist",
    updatedAt: DATA_REFRESH_DATE,
    confidence: "high",
    note: "Small hand-maintained dataset with direct partner naming.",
  },
  galleries: {
    source: "Curated cultural venue seed list",
    updatedAt: DATA_REFRESH_DATE,
    confidence: "medium",
    note: "Representative cultural anchors, not an exhaustive gallery census.",
  },
  agencies: {
    source: "Curated creative agency shortlist",
    updatedAt: DATA_REFRESH_DATE,
    confidence: "medium",
    note: "Prototype list focused on visible brand and design agencies.",
  },
  coworking: {
    source: "Curated coworking shortlist",
    updatedAt: DATA_REFRESH_DATE,
    confidence: "medium",
    note: "Selected for creator density signal rather than full inventory coverage.",
  },
  venues: {
    source: "Curated nightlife and live venue shortlist",
    updatedAt: DATA_REFRESH_DATE,
    confidence: "medium",
    note: "Activation-facing venue set, not a comprehensive nightlife database.",
  },
  schools: {
    source: "Curated design education shortlist",
    updatedAt: DATA_REFRESH_DATE,
    confidence: "medium",
    note: "Key design-school touchpoints with low overall volume.",
  },
  ubahn_poster: {
    source: "OOH inventory import / station-matched poster surfaces",
    updatedAt: DATA_REFRESH_DATE,
    confidence: "medium",
    note: "Impressions use station-specific lookup where matched, else poster default.",
  },
  ubahn_special: {
    source: "OOH inventory import / premium U-Bahn formats",
    updatedAt: DATA_REFRESH_DATE,
    confidence: "medium",
    note: "Large inventory volume with heuristic station weighting and fallback defaults.",
  },
  bridge_banner: {
    source: "OOH inventory import / corridor bridge banners",
    updatedAt: DATA_REFRESH_DATE,
    confidence: "medium",
    note: "Low-count corridor inventory with flat exposure defaults by format.",
  },
  street_furniture: {
    source: "OOH inventory import / street furniture surfaces",
    updatedAt: DATA_REFRESH_DATE,
    confidence: "medium",
    note: "Inventory weighted with default street-level exposure when station mapping is unavailable.",
  },
};

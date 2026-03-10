import { GapAnalysisResult, Neighbourhood } from "@/components/types";

const CULTURAL_WEIGHTS = {
  galleries: 1.3,
  agencies: 1.15,
  venues: 1.2,
  coworking: 0.85,
  schools: 0.7,
} as const;

const OOH_WEIGHTS = {
  ubahn_poster: 1.2,
  ubahn_special: 1.3,
  bridge_banner: 1.0,
  street_furniture: 0.8,
} as const;

export function computeGapAnalysis(
  neighbourhoods: Neighbourhood[],
): Record<string, GapAnalysisResult> {
  const culturalRaw = neighbourhoods.map((zone) =>
    zone.stats.galleries * CULTURAL_WEIGHTS.galleries +
    zone.stats.agencies * CULTURAL_WEIGHTS.agencies +
    zone.stats.venues * CULTURAL_WEIGHTS.venues +
    zone.stats.coworking * CULTURAL_WEIGHTS.coworking +
    zone.stats.schools * CULTURAL_WEIGHTS.schools,
  );
  const oohRaw = neighbourhoods.map((zone) =>
    (zone.impressions?.ubahn_poster ?? 0) * OOH_WEIGHTS.ubahn_poster +
    (zone.impressions?.ubahn_special ?? 0) * OOH_WEIGHTS.ubahn_special +
    (zone.impressions?.bridge_banner ?? 0) * OOH_WEIGHTS.bridge_banner +
    (zone.impressions?.street_furniture ?? 0) * OOH_WEIGHTS.street_furniture,
  );

  const maxCultural = Math.max(...culturalRaw, 1);
  const maxOoh = Math.max(...oohRaw, 1);

  return Object.fromEntries(
    neighbourhoods.map((zone, index) => {
      const cultural = Math.round((culturalRaw[index] / maxCultural) * 100);
      const ooh = Math.round((oohRaw[index] / maxOoh) * 100);
      const gap = cultural - ooh;
      const status =
        gap > 20 ? "opportunity" : gap < -20 ? "oversaturated" : "balanced";

      return [
        zone.name,
        {
          cultural,
          ooh,
          gap,
          status,
        },
      ];
    }),
  );
}

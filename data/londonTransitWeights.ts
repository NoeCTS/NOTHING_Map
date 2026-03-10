import { OOHCategory } from "@/components/types";

export const TRANSIT_DEFAULTS: Record<OOHCategory, number> = {
  ubahn_poster: 20000,
  ubahn_special: 28000,
  bridge_banner: 55000,
  street_furniture: 15000
};

// Heuristic daily impression estimates for premium London OOH sites.
export const TRANSIT_WEIGHTS: Record<string, number> = {
  piccadilly_lights: 180000,
  the_screen_on_leicester_square: 145000,
  the_screen_on_carnaby: 105000,
  meridian_steps_westfield_stratford_city: 110000,
  northern_ticket_hall_westfield_stratford_city: 108000,
  skyline_westfield_stratford_city: 102000,
  the_street_totem_westfield_stratford_city: 72000,
  the_gateway_westfield_london: 98000,
  the_southern_terrace_westfield_london: 84000,
  the_screens_canary_wharf_crossrail_place_landscape: 96000,
  the_screens_canary_wharf_crossrail_place_portraits: 88000,
  the_screens_canary_wharf_reuters_plaza_landscape: 90000,
  the_screens_canary_wharf_reuters_plaza_portraits: 82000,
  the_landmark_london_bridge: 85000,
  tower_bridge_dm6: 74000,
  p10_hammersmith_broadway: 68000,
  the_screen_finchley_road_london: 54000,
  the_screen_high_street_kensington: 62000,
  the_arrival_heathrow_terminal_5: 115000,
  the_eastern_lights_a13: 72000,
  the_one_knightsbridge: 78000,
  bermondsey_d96_northbound: 70000,
  richmond_portrait: 48000,
  hendon_dm6: 44000
};

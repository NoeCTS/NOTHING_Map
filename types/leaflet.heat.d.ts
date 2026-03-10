import "leaflet";

declare module "leaflet" {
  export type HeatLatLngTuple = [number, number, number?];

  export interface HeatLayerOptions extends LayerOptions {
    blur?: number;
    gradient?: Record<number, string>;
    max?: number;
    maxZoom?: number;
    minOpacity?: number;
    radius?: number;
  }

  export class HeatLayer extends Layer {
    addLatLng(latlng: HeatLatLngTuple): this;
    redraw(): this;
    setLatLngs(latlngs: HeatLatLngTuple[]): this;
    setOptions(options: HeatLayerOptions): this;
  }

  export function heatLayer(latlngs: HeatLatLngTuple[], options?: HeatLayerOptions): HeatLayer;
}

declare module "leaflet.heat";

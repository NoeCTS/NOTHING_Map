import { GroundSignalApp } from "@/components/GroundSignalApp";
import { LocationsData, Neighbourhood } from "@/components/types";
import locations from "@/data/locations.json";
import oohLocations from "@/data/ooh_locations.json";
import neighbourhoodsData from "@/data/neighbourhoods.json";

export default function Page() {
  const mergedLocations: LocationsData = {
    ...locations,
    ubahn_poster: oohLocations.ubahn_poster,
    ubahn_special: oohLocations.ubahn_special,
    bridge_banner: oohLocations.bridge_banner,
    street_furniture: oohLocations.street_furniture,
  } as LocationsData;

  return (
    <GroundSignalApp
      locations={mergedLocations}
      neighbourhoods={neighbourhoodsData.neighbourhoods as Neighbourhood[]}
    />
  );
}

import { GroundSignalApp } from "@/components/GroundSignalApp";
import { getMarketDataset, resolveMarketId } from "@/data/markets";

interface PageProps {
  searchParams: Promise<{
    market?: string | string[];
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const marketParam = Array.isArray(params.market) ? params.market[0] : params.market;
  const marketId = resolveMarketId(marketParam);
  const market = getMarketDataset(marketId);

  return (
    <GroundSignalApp
      key={marketId}
      market={market}
    />
  );
}

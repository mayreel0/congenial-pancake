import { ActivityStats } from "./ActivityStats";
import { LandingHero } from "./LandingHero";
import { SampleExchange } from "./SampleExchange";
import { LandingHeader } from "../navigation/LandingHeader";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_420px] lg:items-center lg:py-12">
        <div className="space-y-8">
          <LandingHero />
          <ActivityStats />
        </div>
        <SampleExchange />
      </main>
    </div>
  );
}

import { ActivityStats } from "./ActivityStats";
import { LandingFooter } from "./LandingFooter";
import { LandingHero } from "./LandingHero";
import { SampleExchange } from "./SampleExchange";
import { StandaloneRedirect } from "./StandaloneRedirect";
import { LandingHeader } from "../navigation/LandingHeader";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <StandaloneRedirect />
      <LandingHeader />
      <main className="onseol-fade-in mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[1fr_420px] lg:items-center lg:py-12">
        <div className="space-y-8">
          <LandingHero />
          <ActivityStats />
        </div>
        <SampleExchange />
      </main>
      <LandingFooter />
    </div>
  );
}

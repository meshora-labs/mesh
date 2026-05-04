import { useMemo, useState } from "react";
import { AppShell } from "@/app/AppShell";
import { type AppRoute, defaultRoute } from "@/app/navigation";
import { createMockRepositories } from "@/data/repositories";

export function App() {
  const repositories = useMemo(() => createMockRepositories(), []);
  const [activeRoute, setActiveRoute] = useState<AppRoute>(defaultRoute);

  return (
    <AppShell
      activeRoute={activeRoute}
      onRouteChange={setActiveRoute}
      repositories={repositories}
    />
  );
}

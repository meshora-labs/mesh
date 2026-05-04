import type { NavigationItem } from "@/app/navigation";
import { EmptyState } from "@/components/ui/empty-state";

interface PlaceholderPageProps {
  route: NavigationItem;
}

export function PlaceholderPage({ route }: PlaceholderPageProps) {
  const Icon = route.icon;

  return (
    <EmptyState
      description={`${route.label} is reserved in the shell and will be wired after the core workbench is stable.`}
      icon={<Icon size={22} />}
      title={`${route.label} prepared`}
    />
  );
}

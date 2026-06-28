import { PlaceholderScreen } from "@/src/modules/foundation/ui/PlaceholderScreen";
import { placeholderFor } from "@/src/modules/foundation/ui/placeholder-content";

const copy = placeholderFor("/accounts");

export default function AccountsPage() {
  return (
    <PlaceholderScreen title={copy.title} description={copy.description} />
  );
}

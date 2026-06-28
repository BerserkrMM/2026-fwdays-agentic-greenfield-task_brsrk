import { PlaceholderScreen } from "@/src/modules/foundation/ui/PlaceholderScreen";
import { placeholderFor } from "@/src/modules/foundation/ui/placeholder-content";

const copy = placeholderFor("/ledger");

export default function LedgerPage() {
  return (
    <PlaceholderScreen title={copy.title} description={copy.description} />
  );
}

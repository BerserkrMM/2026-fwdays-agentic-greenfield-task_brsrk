// Test-only helper: render a (sync) server-component element tree to its text.
// Function components are invoked so copy passed via props (title/description) is
// reached; host elements contribute their children and any href, so CTA targets
// like `/imports` are observable. Shared by the dashboard page smoke/state tests
// so the recursion lives in one place.

export function collectServerTreeText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectServerTreeText).join(" ");
  if (typeof node !== "object") return "";

  const el = node as { type?: unknown; props?: Record<string, unknown> };
  if (typeof el.type === "function") {
    const render = el.type as (props: unknown) => unknown;
    return collectServerTreeText(render(el.props ?? {}));
  }
  const props = el.props ?? {};
  const href = typeof props.href === "string" ? ` ${props.href} ` : "";
  return href + collectServerTreeText(props.children);
}

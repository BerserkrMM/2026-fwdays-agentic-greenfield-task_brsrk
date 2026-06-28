import { redirect } from "next/navigation";

// Home routes to the dashboard, the app's read-only overview (DESIGN.md §5).
export default function Home() {
  redirect("/dashboard");
}

import { redirect } from "next/navigation";

// Home routes to the course/demo landing page so reviewers first see the
// product narrative and agentic engineering process before entering the app.
export default function Home() {
  redirect("/about");
}

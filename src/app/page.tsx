import { redirect } from "next/navigation";

export default function Home() {
  // ponytail: single-tenant admin app — root opens the console until a public landing exists.
  redirect("/admin");
}

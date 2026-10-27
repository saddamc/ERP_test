import { redirect } from "next/navigation";

export default function BillingRoute() {
  redirect("/?tab=billing");
}

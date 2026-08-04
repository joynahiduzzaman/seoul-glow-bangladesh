import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import SettingsPage from "@/components/SettingsPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account/settings");

  return <SettingsPage initialMarketingOptIn={user.marketingOptIn} />;
}

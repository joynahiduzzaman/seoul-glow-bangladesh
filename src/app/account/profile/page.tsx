import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="bg-white rounded-xl2 shadow-soft p-6 max-w-md">
      <ProfileForm name={user.name} phone={user.phone || ""} email={user.email} />
    </div>
  );
}

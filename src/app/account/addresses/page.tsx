import { getCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";
import AddressBook from "@/components/AddressBook";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved Addresses" };

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account/addresses");

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return <AddressBook initialAddresses={addresses} />;
}

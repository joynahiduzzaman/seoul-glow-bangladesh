import { prisma } from "@/server/db";
import InstagramFeedManager from "@/components/admin/InstagramFeedManager";

export const dynamic = "force-dynamic";

export default async function AdminInstagramPage() {
  const posts = await prisma.instagramPost.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });

  return <InstagramFeedManager posts={posts} />;
}

import { MessageCircle } from "lucide-react";
import { getBusinessInfo } from "@/server/content";

// Server component so the number comes from the admin-editable Business Info at
// request time. It previously read NEXT_PUBLIC_WHATSAPP_NUMBER, which Next
// inlines at build time — changing the shop's phone number meant a redeploy.
export default async function WhatsAppButton() {
  const business = await getBusinessInfo();
  const number = business.phone.replace(/\D/g, "");
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-e3 transition-all duration-300 ease-silk hover:scale-105 hover:shadow-e4 active:scale-95"
      style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))", right: "calc(1.5rem + env(safe-area-inset-right, 0px))" }}
    >
      <MessageCircle size={26} fill="white" />
    </a>
  );
}


import { FaWhatsapp } from "react-icons/fa";
import { DEFAULT_WHATSAPP_MESSAGE,WHATSAPP_NUMBER } from "@/lib/constants";

type WhatsAppButtonProps = {
  message?: string;
  className?: string;
};

export default function WhatsAppButton({
  message = DEFAULT_WHATSAPP_MESSAGE,
  className = "",
}: WhatsAppButtonProps) {
  const phone = WHATSAPP_NUMBER.replace(/\D/g, "");

  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
    message,
  )}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Anoosha Store on WhatsApp"
      title="Chat with us on WhatsApp"
      className={`
        group
        fixed bottom-5 right-5 z-40000
        flex h-14 w-14
        items-center justify-center
        rounded-full
        border-2 border-white
        bg-[#25D366]
        text-white
        shadow-[0_6px_24px_rgba(37,211,102,0.35)]
        transition-all duration-200
        hover:scale-110
        hover:bg-[#20BD5A]
        hover:shadow-[0_8px_30px_rgba(37,211,102,0.5)]
        focus-visible:outline-none
        focus-visible:ring-4
        focus-visible:ring-green-300
        active:scale-95
        sm:bottom-7 sm:right-7
        sm:h-16 sm:w-16
        ${className}
      `}
    >
      <FaWhatsapp
        aria-hidden="true"
        className="h-8 w-8 sm:h-9 sm:w-9"
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute bottom-full right-0 mb-3
          hidden whitespace-nowrap
          rounded-xl bg-slate-900
          px-3 py-2
          text-xs font-semibold text-white
          opacity-0 shadow-lg
          transition-opacity duration-200
          group-hover:opacity-100
          group-focus-visible:opacity-100
          sm:block
        "
      >
        Chat with us
      </span>
    </a>
  );
}

import type { ChatMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const containerClass = isUser
    ? "ml-auto bg-blue-600 text-white"
    : isSystem
      ? "mr-auto bg-amber-50 border border-amber-200 text-amber-900"
      : "mr-auto bg-slate-100 text-slate-900";

  return (
    <div
      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${containerClass}`}
      aria-live="polite"
    >
      <p>{message.content}</p>
    </div>
  );
}

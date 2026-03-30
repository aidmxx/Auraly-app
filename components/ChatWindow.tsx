import MessageBubble from "@/components/MessageBubble";
import type { ChatMessage } from "@/lib/types";

interface ChatWindowProps {
  messages: ChatMessage[];
}

export default function ChatWindow({ messages }: ChatWindowProps) {
  return (
    <section className="card p-4 md:p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Conversation</h2>
      <div className="flex h-[340px] flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">
            Share a diary entry to begin the diary-to-dialogue flow.
          </p>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>
    </section>
  );
}

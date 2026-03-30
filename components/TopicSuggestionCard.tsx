import type { TopicSuggestion } from "@/lib/types";

interface TopicSuggestionCardProps {
  suggestion: TopicSuggestion;
  isLoading?: boolean;
  onContinue: () => void;
  onDismiss: () => void;
  onRegenerate: () => void;
}

export default function TopicSuggestionCard({
  suggestion,
  isLoading = false,
  onContinue,
  onDismiss,
  onRegenerate,
}: TopicSuggestionCardProps) {
  return (
    <section className="card border-blue-200 bg-blue-50/50 p-4 md:p-5">
      <h3 className="text-sm font-semibold text-blue-900">Suggested next topic</h3>
      <p className="mt-2 text-sm text-blue-950">{suggestion.topic}</p>
      <p className="mt-3 rounded-lg border border-blue-200 bg-white p-2 text-xs text-blue-900">
        <span className="font-semibold">Why this was suggested:</span> {suggestion.reason}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={onContinue}>
          Continue with this topic
        </button>
        <button type="button" className="btn btn-secondary" onClick={onDismiss}>
          Dismiss
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRegenerate}
          disabled={isLoading}
        >
          {isLoading ? "Regenerating..." : "Regenerate"}
        </button>
      </div>
    </section>
  );
}

import type { Persona } from "@/lib/types";

interface PersonaSelectorProps {
  personas: Persona[];
  selectedPersonaId: string;
  onChange: (personaId: string) => void;
}

export default function PersonaSelector({
  personas,
  selectedPersonaId,
  onChange,
}: PersonaSelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="persona" className="text-sm font-medium text-slate-800">
        Companion style
      </label>
      <select
        id="persona"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        value={selectedPersonaId}
        onChange={(event) => onChange(event.target.value)}
      >
        {personas.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {persona.name} - {persona.shortDescription}
          </option>
        ))}
      </select>
      <p className="text-xs text-slate-500">
        Kept lightweight on purpose for this study prototype.
      </p>
    </div>
  );
}

"use client";

import { deleteParticipant } from "@/app/actions";

export default function DeleteParticipantButton({ userId, loginId }: { userId: string; loginId: string }) {
  return (
    <form
      action={deleteParticipant}
      onSubmit={(event) => {
        if (!window.confirm(`Permanently delete ${loginId} and all of this participant's data? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button className="small-button danger-button">Delete</button>
    </form>
  );
}

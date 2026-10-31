// Mounts the ported Clawd companion. The engine owns its own canvas, physics
// and speech bubble; React only tells it whether Claude is working.
import { useEffect, useRef } from "react";
import { mountClawd, type PetState } from "./clawd-pet.ts";

export function ClawdCompanion({ state }: { state: PetState }) {
  const host = useRef<HTMLDivElement | null>(null);
  const api = useRef<ReturnType<typeof mountClawd> | null>(null);

  useEffect(() => {
    if (!host.current || import.meta.env.MODE === "test") return;
    api.current = mountClawd(host.current);
    return () => {
      api.current?.destroy();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    api.current?.setState(state);
  }, [state]);

  return <div ref={host} className="pointer-events-none absolute inset-0 z-10 hidden overflow-hidden lg:block" data-testid="clawd-host" />;
}

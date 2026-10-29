// Settings > About (docs/spec.md "Settings"): which versions the user runs, as selectable text for bug reports. No request of its own:
// the daemon's version comes with the `settings.get` reply the dialog already holds.
import { WEB_VERSION } from "./version.ts";

export function AboutSection({ daemonVersion }: { daemonVersion?: string }) {
  const row = (id: string, label: string, value: string) => (
    <div className="flex items-center gap-3 border-t py-2.5 first:border-t-0 first:pt-0 max-md:min-h-11">
      <span id={`settings-about-${id}-label`} className="min-w-0 flex-1 text-sm">{label}</span>
      <code aria-labelledby={`settings-about-${id}-label`} className="select-text rounded bg-muted px-1.5 py-0.5 font-mono text-xs" data-testid={`settings-about-${id}`}>{value}</code>
    </div>
  );
  return (
    <section aria-label="About" className="flex flex-col" data-testid="settings-about">
      {row("web", "Web app", WEB_VERSION)}
      {daemonVersion && row("daemon", "Daemon", daemonVersion)}
      <p className="pt-2 text-muted-foreground text-xs">Include these in a bug report.</p>
    </section>
  );
}

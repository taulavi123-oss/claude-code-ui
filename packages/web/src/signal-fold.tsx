// Signal only (GH-159): the folded row of a run of tool cards.
import type { ReactNode } from "react";
import { Tool, ToolChevron, ToolContent, toolRowClass } from "@/components/ai-elements/tool";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileCodeIcon } from "lucide-react";
import { foldFiles, foldLabel } from "./signal.ts";
import type { ToolCall } from "./store.ts";
import { useExpanded } from "./tool-card.tsx";

/** A run of tool calls as one line; clicking it shows the cards in place. */
export function FoldRow({ id, calls, children }: { id: string; calls: ToolCall[]; children: ReactNode }) {
  const files = foldFiles(calls);
  return (
    <Tool data-testid="signal-fold" {...useExpanded(id)}>
      <CollapsibleTrigger className={toolRowClass}>
        <span className="truncate font-mono text-muted-foreground text-xs">{foldLabel(calls)}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <ToolChevron />
        </span>
      </CollapsibleTrigger>
      <ToolContent className="space-y-1 pl-3">
        {files.length > 0 && (
          <ul className="flex flex-col gap-1 pt-1" data-testid="fold-files">
            {files.map((file) => (
              <li
                key={file.path}
                className="flex items-center gap-2 rounded-md border bg-card/60 px-2 py-1 text-xs"
                title={file.path}
                data-testid="fold-file"
              >
                <FileCodeIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-mono">{file.name}</span>
                <span className="shrink-0 font-mono">
                  <span className="text-success">+{file.added}</span>
                  <span className="ml-1 text-destructive">-{file.removed}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {children}
      </ToolContent>
    </Tool>
  );
}

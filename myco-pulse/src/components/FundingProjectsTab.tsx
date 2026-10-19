import React, { useCallback } from "react";
import { cn } from "../lib/utils";
import { isProjectSlug } from "../lib/mycodaoV1";
import { useQueryParam, writeQuery } from "../lib/spaQuery";
import type { PulseMycoSnapshot } from "../lib/pulseApi";
import { FundingView } from "./FundingView";
import { ProjectDetailPage } from "./ProjectDetailPage";
import type { PulseTabId } from "./PulseShellNav";

const PROJECT_HISTORY_KEY = "mycodaoProject";

/** Push `?project=<slug>` so the browser back button returns to the project list. */
function openProjectInUrl(slug: string): void {
  writeQuery({ project: slug }, "push", { [PROJECT_HISTORY_KEY]: slug });
}

interface FundingProjectsTabProps {
  mycoSnapshot: PulseMycoSnapshot | null;
  onNavigateTab?: (tab: PulseTabId, focus?: string) => void;
}

export function FundingProjectsTab({ mycoSnapshot, onNavigateTab }: FundingProjectsTabProps) {
  const projectParam = useQueryParam("project");
  const project = isProjectSlug(projectParam) ? projectParam : null;

  const closeProject = useCallback(() => {
    const state = window.history.state as Record<string, unknown> | null;
    if (state?.[PROJECT_HISTORY_KEY]) window.history.back();
    else writeQuery({ project: null });
  }, []);

  return (
    <>
      {/* The list stays mounted while a project is open so its data and scroll position survive "back". */}
      <div className={cn("flex-1 min-h-0 flex flex-col", project && "hidden")}>
        <FundingView mycoSnapshot={mycoSnapshot} onNavigateTab={onNavigateTab} onOpenProject={openProjectInUrl} />
      </div>
      {project ? <ProjectDetailPage key={project} slug={project} onBack={closeProject} /> : null}
    </>
  );
}

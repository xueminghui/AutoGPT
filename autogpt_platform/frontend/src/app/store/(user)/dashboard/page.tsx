"use client";

import * as React from "react";
import { AgentTable } from "@/components/agptui/AgentTable";
import { AgentTableRowProps } from "@/components/agptui/AgentTableRow";
import { Button } from "@/components/agptui/Button";
import { Separator } from "@/components/ui/separator";
import AutoGPTServerAPI from "@/lib/autogpt-server-api";
import { createClient } from "@/lib/supabase/client";
import { StatusType } from "@/components/agptui/Status";
import { PublishAgentPopout } from "@/components/agptui/composite/PublishAgentPopout";
import { useCallback, useEffect, useState } from "react";
import {
  StoreSubmissionsResponse,
  StoreSubmissionRequest,
} from "@/lib/autogpt-server-api/types";

async function getDashboardData() {
  const supabase = createClient();
  if (!supabase) {
    return { submissions: [] };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    console.warn("--- No session found in profile page");
    return { profile: null };
  }

  const api = new AutoGPTServerAPI(
    process.env.NEXT_PUBLIC_AGPT_SERVER_URL,
    process.env.NEXT_PUBLIC_AGPT_WS_SERVER_URL,
    supabase,
  );

  try {
    const submissions = await api.getStoreSubmissions();
    return {
      submissions,
    };
  } catch (error) {
    console.error("Error fetching profile:", error);
    return {
      profile: null,
    };
  }
}

export default function Page({
}: {
}) {
  const [submissions, setSubmissions] = useState<StoreSubmissionsResponse>();
  const [openPopout, setOpenPopout] = useState<boolean>(false);
  const [submissionData, setSubmissionData] =
    useState<StoreSubmissionRequest>();
  const [popoutStep, setPopoutStep] = useState<"select" | "info" | "review">(
    "info",
  );

  const fetchData = useCallback(async () => {
    const { submissions } = await getDashboardData();
    if (submissions) {
      setSubmissions(submissions as StoreSubmissionsResponse);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onEditSubmission = useCallback((submission: StoreSubmissionRequest) => {
    setSubmissionData(submission);
    setPopoutStep("review");
    setOpenPopout(true);
  }, []);

  const onDeleteSubmission = useCallback(
    (submission_id: string) => {
      const supabase = createClient();
      if (!supabase) {
        return;
      }
      const api = new AutoGPTServerAPI(
        process.env.NEXT_PUBLIC_AGPT_SERVER_URL,
        process.env.NEXT_PUBLIC_AGPT_WS_SERVER_URL,
        supabase,
      );
      api.deleteStoreSubmission(submission_id);
      fetchData();
    },
    [fetchData],
  );

  const onOpenPopout = useCallback(() => {
    setPopoutStep("select");
    setOpenPopout(true);
  }, []);

  return (
    <main className="flex-1 px-6 py-8 md:px-10">
      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-neue text-3xl font-medium leading-9 tracking-tight text-neutral-900 dark:text-neutral-100">
            Submit a New Agent
          </h1>
          <p className="mt-2 font-neue text-sm text-[#707070] dark:text-neutral-400">
            Select from the list of agents you currently have, or upload from
            your local machine.
          </p>
        </div>
        <PublishAgentPopout
          trigger={
            <Button variant="default" size="lg" onClick={onOpenPopout}>
              Create New Agent
            </Button>
          }
          openPopout={openPopout}
          inputStep={popoutStep}
          submissionData={submissionData}
        />
      </div>

      <Separator className="mb-8" />

      {/* Agents Section */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Your Agents
        </h2>
        <AgentTable
          agents={
            (submissions?.submissions.map((submission, index) => ({
              id: index,
              agent_id: submission.agent_id,
              agent_version: submission.agent_version,
              sub_heading: submission.sub_heading,
              date_submitted: submission.date_submitted,
              agentName: submission.name,
              description: submission.description,
              imageSrc: submission.image_urls || [""],
              dateSubmitted: new Date(
                submission.date_submitted,
              ).toLocaleDateString(),
              status: submission.status.toLowerCase() as StatusType,
              runs: submission.runs,
              rating: submission.rating,
            })) as AgentTableRowProps[]) || []
          }
          onEditSubmission={onEditSubmission}
          onDeleteSubmission={onDeleteSubmission}
        />
      </div>
    </main>
  );
}
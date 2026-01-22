"use client";

import { useState } from "react";
import PreviewStage1 from "./PreviewStage1";
import PreviewWaitlistConfirmation from "./PreviewWaitlistConfirmation";
import PreviewWaitlistInvite from "./PreviewWaitlistInvite";
import PreviewDemographics from "./PreviewDemographics";
import PreviewPayment from "./PreviewPayment";
import PreviewQuestionnaire from "./PreviewQuestionnaire";
import PreviewPhotos from "./PreviewPhotos";

const stages = [
  {
    id: "stage1",
    label: "Stage 1: Qualification",
    component: PreviewStage1,
  },
  {
    id: "waitlist",
    label: "Stage 2: Waitlist",
    component: PreviewWaitlistConfirmation,
  },
  {
    id: "invite",
    label: "Stage 3: Invite",
    component: PreviewWaitlistInvite,
  },
  {
    id: "demographics",
    label: "Stage 4: Demographics",
    component: PreviewDemographics,
  },
  {
    id: "payment",
    label: "Stage 5: Payment",
    component: PreviewPayment,
  },
  {
    id: "questionnaire",
    label: "Stage 6: Questionnaire",
    component: PreviewQuestionnaire,
  },
  {
    id: "photos",
    label: "Stage 7: Photos",
    component: PreviewPhotos,
  },
];

export default function PreviewTabContainer() {
  const [activeTab, setActiveTab] = useState("stage1");

  const ActiveComponent = stages.find((s) => s.id === activeTab)?.component;

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white rounded-t-lg">
        <nav className="-mb-px flex space-x-2 overflow-x-auto px-4">
          {stages.map((stage) => (
            <button
              key={stage.id}
              onClick={() => setActiveTab(stage.id)}
              className={`
                whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === stage.id
                    ? "border-copper text-copper"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {stage.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}

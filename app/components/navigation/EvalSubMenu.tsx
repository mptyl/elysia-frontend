"use client";

import React, { useContext, useState } from "react";
import { useEffect } from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

import { MdOutlineSpaceDashboard } from "react-icons/md";
import { MdOutlineFeedback } from "react-icons/md";

import { EvaluationContext } from "../contexts/EvaluationContext";

import { RouterContext } from "../contexts/RouterContext";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const EvalSubMenu: React.FC = () => {
  const t = useTranslations('eval');
  const searchParams = useSearchParams();

  const [currentDisplay, setCurrentDisplay] = useState<string | null>(null);

  const { changeEvalPage } = useContext(EvaluationContext);

  const { changePage, currentPage } = useContext(RouterContext);

  const toDashboard = () => {
    changePage("eval", {}, true);
  };

  const toDisplay = (display: string) => {
    changeEvalPage(null);
    changePage("display", { type: display }, true);
  };

  const displays = [
    { name: t('textResponse'), path: "text_response" },
    { name: t('initialResponse'), path: "initial_response" },
    { name: t('table'), path: "table" },
    { name: t('tickets'), path: "tickets" },
    { name: t('products'), path: "product" },
    { name: t('document'), path: "document" },
    { name: t('thread'), path: "thread" },
    { name: t('singleMessage'), path: "singleMessage" },
    { name: t('aggregation'), path: "aggregation" },
    { name: t('chart'), path: "chart" },
    { name: t('barChart'), path: "bar_chart" },
  ];

  useEffect(() => {
    const displayParam = searchParams.get("type");
    if (displayParam) {
      setCurrentDisplay(displayParam);
    }
  }, [searchParams]);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>
          <p>{t('title')}</p>
        </SidebarGroupLabel>
        <SidebarMenuItem className="list-none" key={"dashboard"}>
          <SidebarMenuButton
            variant={currentPage === "eval" ? "active" : "default"}
            onClick={toDashboard}
          >
            <MdOutlineSpaceDashboard />
            <p>{t('dashboard')}</p>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className="list-none" key={"Feedback Button"}>
          <SidebarMenuButton
            variant={currentPage === "feedback" ? "active" : "default"}
            onClick={() => changePage("feedback", {}, true)}
          >
            <MdOutlineFeedback />
            <p>{t('feedback')}</p>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarGroup>
      {process.env.NODE_ENV === "development" && (
        <SidebarGroup>
          <SidebarGroupLabel>
            <p>{t('displays')}</p>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {displays.map((display) => (
              <SidebarMenuItem className="list-none" key={display.path}>
                <SidebarMenuButton
                  variant={
                    currentDisplay === display.path ? "active" : "default"
                  }
                  className="text-secondary text-sm"
                  onClick={() => toDisplay(display.path)}
                >
                  {display.name}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </>
  );
};

export default EvalSubMenu;

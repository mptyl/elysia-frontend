"use client";

import React, { useContext } from "react";
import { TbPackageImport } from "react-icons/tb";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

import { MdOutlineSpaceDashboard } from "react-icons/md";

import { RouterContext } from "../contexts/RouterContext";
import { useTranslations } from "next-intl";

const DataSubMenu: React.FC = () => {
  const t = useTranslations('data');
  const ts = useTranslations('sidebar');
  const { changePage, currentPage } = useContext(RouterContext);

  const toDashboard = () => {
    changePage("data", {}, true);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <p>{ts('data')}</p>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenuItem className="list-none" key={"dashboard"}>
          <SidebarMenuButton
            variant={currentPage === "data" ? "active" : "default"}
            onClick={toDashboard}
          >
            <MdOutlineSpaceDashboard />
            <p>{t('dashboard')}</p>
          </SidebarMenuButton>
          <SidebarMenuButton variant="default">
            <TbPackageImport />
            <p>{t('importData')}</p>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default DataSubMenu;

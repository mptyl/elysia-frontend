"use client";

import React, { useContext } from "react";
import { FaCircle } from "react-icons/fa";

import { ConversationContext } from "../contexts/ConversationContext";

import { FaPlus } from "react-icons/fa6";
import { GoTrash } from "react-icons/go";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenuAction,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SlOptionsVertical } from "react-icons/sl";
import { useTranslations } from "next-intl";

const HomeSubMenu: React.FC = () => {
  const t = useTranslations('conversations');
  const tc = useTranslations('common');
  const {
    startNewConversation,
    currentConversation,
    removeConversation,
    selectConversation,
    conversationPreviews,
    loadingConversations,
    creatingNewConversation,
    loadingConversation,
  } = useContext(ConversationContext);

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between">
        <SidebarGroupLabel className="flex items-center">
          <div
            className={`flex items-center ${loadingConversations || creatingNewConversation || loadingConversation ? "shine" : ""}`}
          >
            {creatingNewConversation && (
              <FaCircle className="text-secondary pulsing mr-2" />
            )}
            {loadingConversations ||
              (loadingConversation && <p>{t('loading')}</p>)}
            {!loadingConversations && !loadingConversation && (
              <p>
                {creatingNewConversation
                  ? t('initializing')
                  : t('title')}
              </p>
            )}
          </div>
        </SidebarGroupLabel>
        <SidebarGroupAction
          title={t('addConversation')}
          onClick={() => startNewConversation()}
          disabled={creatingNewConversation}
        >
          <FaPlus /> <span className="sr-only">{t('addConversation')}</span>
        </SidebarGroupAction>
      </div>
      <SidebarGroupContent>
        {/* TODO Add Timestamp Sorting when backend supports it */}
        {Object.entries(conversationPreviews)
          ?.sort(
            ([, a], [, b]) =>
              new Date(b.last_update_time).getTime() -
              new Date(a.last_update_time).getTime()
          )
          .map(([key, value]) => (
            <SidebarMenuItem className="list-none fade-in" key={key}>
              <SidebarMenuButton
                variant={currentConversation === key ? "active" : "default"}
                onClick={() => selectConversation(key)}
              >
                <p className="truncate max-w-[13rem]">{value.title}</p>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction>
                    <SlOptionsVertical />
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                  <DropdownMenuItem onClick={() => removeConversation(key)}>
                    <GoTrash className="text-error" />
                    <span className="text-error">{tc('delete')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default HomeSubMenu;

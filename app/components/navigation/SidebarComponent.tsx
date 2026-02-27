"use client";

import React, { useContext, useEffect, useRef, useState } from "react";

import { SocketContext } from "../contexts/SocketContext";

import { MdChatBubbleOutline } from "react-icons/md";
import { GoDatabase } from "react-icons/go";
import { AiOutlineExperiment } from "react-icons/ai";
import { FaCircle, FaSquareXTwitter } from "react-icons/fa6";
import { MdOutlineSettingsInputComponent } from "react-icons/md";
import { IoIosWarning } from "react-icons/io";

import HomeSubMenu from "@/app/components/navigation/HomeSubMenu";
import DataSubMenu from "@/app/components/navigation/DataSubMenu";
import EvalSubMenu from "@/app/components/navigation/EvalSubMenu";

import { CgFileDocument } from "react-icons/cg";

import { CgWebsite } from "react-icons/cg";
import { IoNewspaperOutline } from "react-icons/io5";
import { FaGithub } from "react-icons/fa";
import { FaLinkedin } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa";

import { RiRobot2Line } from "react-icons/ri";
import { TbReportAnalytics } from "react-icons/tb";
import { MdAutoFixHigh } from "react-icons/md";

import { public_path } from "@/app/components/host";
import { useAuth } from "@/app/components/contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuItem,
  SidebarMenu,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

import { Separator } from "@/components/ui/separator";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SettingsSubMenu from "./SettingsSubMenu";
import { RouterContext } from "../contexts/RouterContext";
import { CollectionContext } from "../contexts/CollectionContext";
import { SessionContext } from "../contexts/SessionContext";
import packageJson from "../../../package.json";
import { BRANDING } from "@/app/config/branding";

const SidebarComponent: React.FC = () => {
  const { socketOnline } = useContext(SocketContext);
  const { changePage, currentPage } = useContext(RouterContext);
  const { collections, loadingCollections } = useContext(CollectionContext);
  const { unsavedChanges } = useContext(SessionContext);
  const { session } = useAuth();

  const [items, setItems] = useState<
    {
      title: string;
      mode: string[];
      icon: React.ReactNode;
      warning?: boolean;
      loading?: boolean;
      onClick: () => void;
    }[]
  >([]);

  useEffect(() => {
    const _items = [
      {
        title: "Chat",
        mode: ["chat"],
        icon: <MdChatBubbleOutline />,
        onClick: () => changePage("chat", {}, true, unsavedChanges),
      },
      {
        title: "Data",
        mode: ["data", "collection"],
        icon: !collections?.some((c) => c.processed === true) ? (
          <IoIosWarning className="text-warning" />
        ) : (
          <GoDatabase />
        ),
        warning: !collections?.some((c) => c.processed === true),
        loading: loadingCollections,
        onClick: () => changePage("data", {}, true, unsavedChanges),
      },
      {
        title: "Settings",
        mode: ["settings", "elysia"],
        icon: <MdOutlineSettingsInputComponent />,
        onClick: () => changePage("settings", {}, true, unsavedChanges),
      },
      {
        title: "Evaluation",
        mode: ["eval", "feedback", "display"],
        icon: <AiOutlineExperiment />,
        onClick: () => changePage("eval", {}, true, unsavedChanges),
      },
      {
        title: "Reportistica",
        mode: ["reportistica"],
        icon: <TbReportAnalytics />,
        onClick: () => changePage("reportistica", {}, true, unsavedChanges),
      },
      {
        title: "Prompt Enhancer",
        mode: ["prompt-enhancer"],
        icon: <MdAutoFixHigh />,
        onClick: () => changePage("prompt-enhancer", {}, true, unsavedChanges),
      },
    ];
    setItems(_items);
  }, [collections, unsavedChanges]);

  const thothWinRef = useRef<Window | null>(null);
  const thothHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const thothTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [thothLoading, setThothLoading] = useState(false);

  // Clean up ThothAI message listener and timeout on unmount
  useEffect(() => {
    return () => {
      if (thothHandlerRef.current) {
        window.removeEventListener('message', thothHandlerRef.current);
      }
      if (thothTimeoutRef.current !== null) {
        clearTimeout(thothTimeoutRef.current);
      }
    };
  }, []);

  const handleThothAIClick = async () => {
    if (thothLoading) return;
    setThothLoading(true);

    const thothUrl = process.env.NEXT_PUBLIC_THOTH_URL ?? 'http://localhost:3040';
    let token: string | undefined;
    let popup: Window | null = null;

    try {
      token = session?.access_token;
      popup = window.open(`${thothUrl}/auth/supabase`, '_blank');
      thothWinRef.current = popup;
    } finally {
      setThothLoading(false);
    }

    if (!popup) return; // popup blocked by browser
    if (!token) return; // no session: ThothAI will redirect to /login

    // Cancel any pending handshake from a previous click
    if (thothHandlerRef.current) {
      window.removeEventListener('message', thothHandlerRef.current);
    }
    if (thothTimeoutRef.current !== null) {
      clearTimeout(thothTimeoutRef.current);
    }

    const handler = (event: MessageEvent) => {
      if (event.origin !== thothUrl) return;
      if (event.data !== 'ready') return;
      window.removeEventListener('message', handler);
      thothHandlerRef.current = null;
      if (thothTimeoutRef.current !== null) {
        clearTimeout(thothTimeoutRef.current);
        thothTimeoutRef.current = null;
      }
      popup?.postMessage({ type: 'supabase_token', token }, thothUrl);
    };

    thothHandlerRef.current = handler;
    window.addEventListener('message', handler);

    // Cleanup if ThothAI does not respond (6 s > ThothAI internal 5 s timeout)
    thothTimeoutRef.current = setTimeout(() => {
      window.removeEventListener('message', handler);
      thothHandlerRef.current = null;
      thothTimeoutRef.current = null;
    }, 6000);
  };

  const openNewTab = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <Sidebar className="fade-in">
      <SidebarHeader>
        <div className={`flex items-center gap-2 w-full justify-between p-2`}>
          <div className="flex items-center gap-2">
            <img
              src={BRANDING.logoPath}
              alt={BRANDING.appName}
              className="w-5 h-5 stext-primary"
            />
            <p className="text-sm font-bold text-primary">{BRANDING.appName}</p>
          </div>
          <div className="flex items-center justify-center gap-1">
            {socketOnline ? (
              <FaCircle scale={0.2} className="text-lg pulsing_color w-5 h-5" />
            ) : (
              <FaCircle scale={0.2} className="text-lg pulsing w-5 h-5" />
            )}
            <div className="flex flex-col items-end">
              <p className="text-xs text-muted-foreground">
                v{packageJson.version}
              </p>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    variant={
                      item.mode.includes(currentPage)
                        ? "active"
                        : item.warning
                          ? "warning"
                          : "default"
                    }
                    onClick={item.onClick}
                  >
                    <p className="flex items-center gap-2">
                      {item.loading ? (
                        <FaCircle
                          scale={0.2}
                          className="text-lg pulsing_color"
                        />
                      ) : item.warning ? (
                        <IoIosWarning className="text-warning" />
                      ) : (
                        item.icon
                      )}
                      <span>{item.title}</span>
                    </p>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  variant="default"
                  onClick={handleThothAIClick}
                  disabled={thothLoading}
                  title="Open ThothAI — Text-to-SQL"
                  className="flex items-center gap-2"
                >
                  <RiRobot2Line />
                  <span>ThothAI</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        {currentPage === "chat" && <HomeSubMenu />}
        {(currentPage === "data" || currentPage === "collection") && (
          <DataSubMenu />
        )}
        {(currentPage === "eval" ||
          currentPage === "feedback" ||
          currentPage === "display") && <EvalSubMenu />}
        {(currentPage === "settings" || currentPage === "elysia") && (
          <SettingsSubMenu />
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="w-full justify-start items-center"
              onClick={() => openNewTab(BRANDING.links.documentation)}
            >
              <CgFileDocument />
              <span>Documentation</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {BRANDING.sidebar.showGithub && (
            <SidebarMenuItem>
              <SidebarMenuButton
                className="w-full justify-start items-center"
                onClick={() => openNewTab("https://github.com/weaviate/elysia")}
              >
                <FaGithub />
                <span>Github</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <img
                    src={`${public_path}weaviate-logo.svg`}
                    alt="Weaviate"
                    className="w-4 h-4"
                  />
                  <p>Powered by Weaviate</p>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem
                  onClick={() => openNewTab("https://weaviate.io/")}
                >
                  <CgWebsite />
                  <span>Website</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    openNewTab("https://weaviate.io/product/query-agent")
                  }
                >
                  <RiRobot2Line />
                  <span>Weaviate Query Agent</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openNewTab("https://newsletter.weaviate.io/")}
                >
                  <IoNewspaperOutline />
                  <span>Newsletter</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    openNewTab("https://github.com/weaviate/weaviate")
                  }
                >
                  <FaGithub />
                  <span>GitHub</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    openNewTab(
                      "https://www.linkedin.com/company/weaviate-io/posts/?feedView=all"
                    )
                  }
                >
                  <FaLinkedin />
                  <span>LinkedIn</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openNewTab("https://x.com/weaviate_io")}
                >
                  <FaSquareXTwitter />
                  <span>X</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    openNewTab("https://www.youtube.com/@Weaviate")
                  }
                >
                  <FaYoutube />
                  <span>YouTube</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default SidebarComponent;

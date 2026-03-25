"use client";

import React from "react";
import { useTranslations } from "next-intl";
import MarkdownFormat from "../../components/MarkdownFormat";
import { RiRobot2Line } from "react-icons/ri";

interface InfoMessageDisplayProps {
  info: string;
}

const InfoMessageDisplay: React.FC<InfoMessageDisplayProps> = ({ info }) => {
  const t = useTranslations("chat");
  return (
    <div className="w-full flex flex-col justify-start items-start ">
      <div className="max-w-3/5">
        <div className="flex flex-col justify-start items-start gap-2 chat-animation border border-secondary p-4 rounded-lg">
          <div className="flex gap-2 items-center">
            <RiRobot2Line className="text-primary text-lg" />
            <p className="text-primary text-sm font-bold">{t('info')}</p>
          </div>
          <MarkdownFormat text={info} />
        </div>
      </div>
    </div>
  );
};

export default InfoMessageDisplay;

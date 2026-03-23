"use client";

import React, { useContext } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToastContext } from "../contexts/ToastContext";

const ConfirmationModal: React.FC = () => {
  const t = useTranslations('common');
  const {
    isConfirmModalOpen,
    confirmModalTitle,
    confirmModalDescription,
    handleConfirmModal,
    handleCancelModal,
  } = useContext(ToastContext);

  return (
    <AlertDialog open={isConfirmModalOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmModalTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmModalDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelModal}>
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmModal}
            className="bg-error/10 text-error border border-error hover:bg-error/20"
          >
            {t('ok')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationModal;

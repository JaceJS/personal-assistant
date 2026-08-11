import { useCallback, useMemo, useState } from "react";
import type { TFunction } from "i18next";

import { useCancelAiDraft } from "@/features/ai/hooks/useCancelAiDraft";
import { useConfirmAiDraft } from "@/features/ai/hooks/useConfirmAiDraft";
import type { ConfirmPayload } from "@/components/voice/ConfirmCard";
import type { Category } from "@/features/finance/types";
import {
  applyDraftEdit,
  setDraftState,
} from "@/features/finance/utils/chatMessageUtils";
import type {
  DraftMessage,
  DraftMessageState,
  Message,
} from "@/features/finance/utils/chatMessageUtils";

interface UseDraftActionsOptions {
  setMessages: (updater: (prev: Message[]) => Message[]) => void;
  categories: Category[] | undefined;
  showToast: (message: string, type: "success" | "error") => void;
  t: TFunction;
}

export function useDraftActions({ setMessages, categories, showToast, t }: UseDraftActionsOptions) {
  const confirmAiDraftMutation = useConfirmAiDraft();
  const cancelAiDraftMutation = useCancelAiDraft();
  const [editingDraft, setEditingDraft] = useState<DraftMessage | null>(null);

  const editingDraftData = useMemo(
    () =>
      editingDraft
        ? {
            amount: editingDraft.draft.amount,
            currency: editingDraft.draft.currency,
            merchant: editingDraft.draft.merchant,
            category_name: editingDraft.draft.category_name,
            note: editingDraft.draft.note,
            confidence: 1.0,
          }
        : null,
    [editingDraft]
  );

  const updateDraftMessage = useCallback(
    (id: string, state: DraftMessageState) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id && m.type === "draft" ? setDraftState(m, state) : m))
      );
    },
    [setMessages]
  );

  const handleDraftSave = useCallback(
    (msg: DraftMessage) => {
      const { draft } = msg;
      const categoryId =
        categories?.find((c) => c.name.toLowerCase() === (draft.category_name ?? "").toLowerCase())
          ?.id ?? null;
      updateDraftMessage(msg.id, "saving");
      void confirmAiDraftMutation
        .mutateAsync({
          transactionId: draft.transaction_id,
          payload: {
            amount: draft.amount,
            accountId: draft.account_id,
            categoryId,
            merchant: draft.merchant,
            note: draft.note,
          },
        })
        .then(() => {
          updateDraftMessage(msg.id, "saved");
          showToast(t("ai.toast.transactionSaved"), "success");
        })
        .catch(() => {
          updateDraftMessage(msg.id, "pending");
          showToast(t("ai.toast.transactionSaveFailed"), "error");
        });
    },
    [categories, confirmAiDraftMutation, showToast, updateDraftMessage, t]
  );

  const handleDraftCancel = useCallback(
    (msg: DraftMessage) => {
      updateDraftMessage(msg.id, "saving");
      void cancelAiDraftMutation
        .mutateAsync(msg.draft.transaction_id)
        .then(() => updateDraftMessage(msg.id, "cancelled"))
        .catch(() => {
          updateDraftMessage(msg.id, "pending");
          showToast(t("ai.toast.draftCancelFailed"), "error");
        });
    },
    [cancelAiDraftMutation, showToast, updateDraftMessage, t]
  );

  const handleDraftEdit = useCallback((msg: DraftMessage) => {
    setEditingDraft(msg);
  }, []);

  const dismissDraftEdit = useCallback(() => setEditingDraft(null), []);

  const handleEditingDraftSave = useCallback(
    (payload: ConfirmPayload) => {
      if (!editingDraft) return;
      const id = editingDraft.id;
      setEditingDraft(null);
      const categoryName = categories?.find((c) => c.id === payload.categoryId)?.name ?? null;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id && m.type === "draft"
            ? setDraftState(
                applyDraftEdit(m, {
                  amount: payload.amount,
                  merchant: payload.merchant,
                  note: payload.note,
                  category_name: categoryName,
                  account_id: payload.accountId ?? m.draft.account_id,
                }),
                "saving"
              )
            : m
        )
      );
      void confirmAiDraftMutation
        .mutateAsync({ transactionId: editingDraft.draft.transaction_id, payload })
        .then(() => {
          updateDraftMessage(id, "saved");
          showToast(t("ai.toast.transactionSaved"), "success");
        })
        .catch(() => {
          updateDraftMessage(id, "pending");
          showToast(t("ai.toast.transactionSaveFailed"), "error");
        });
    },
    [categories, confirmAiDraftMutation, editingDraft, setMessages, showToast, updateDraftMessage, t]
  );

  return {
    editingDraft,
    editingDraftData,
    isSavingDraft: confirmAiDraftMutation.isPending,
    handleDraftSave,
    handleDraftCancel,
    handleDraftEdit,
    handleEditingDraftSave,
    dismissDraftEdit,
  };
}

import { useMutation } from "@tanstack/react-query";

import { deleteAccount } from "@/features/account/api/deleteAccount";

export function useDeleteAccount() {
  return useMutation({
    mutationFn: deleteAccount,
    retry: false,
  });
}

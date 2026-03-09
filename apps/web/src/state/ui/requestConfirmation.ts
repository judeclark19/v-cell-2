import { AppDispatch } from "@/state/reduxStore";
import { closeConfirm, openConfirm } from "./uiSlice";
import { ConfirmRequest } from "@/features/game-board/components/BoardModals";

export function requestConfirmation(
  dispatch: AppDispatch,
  req: {
    title: string;
    bodyText: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }
) {
  return new Promise<boolean>((resolve) => {
    dispatch(
      openConfirm({
        ...req,
        onConfirm: () => {
          resolve(true);
          dispatch(closeConfirm());
        },
        onCancel: () => {
          resolve(false);
        }
      })
    );
  });
}

export function dismissConfirmation(
  dispatch: AppDispatch,
  confirmReq: ConfirmRequest | null
) {
  confirmReq?.onCancel?.();
  dispatch(closeConfirm());
}

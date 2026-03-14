import { AppDispatch, reduxStore } from "@/state/reduxStore";
import { openConfirmModal } from "./uiSlice";

const dispatch = reduxStore.dispatch as AppDispatch;

export function requestConfirmation(req: {
  title: string;
  bodyText: string;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  return new Promise<boolean>((resolve) => {
    dispatch(
      openConfirmModal({
        ...req,
        onConfirm: () => {
          resolve(true);
          // dispatch(closeConfirm());
        },
        onCancel: () => {
          resolve(false);
          // dispatch(closeConfirm());
        }
      })
    );
  });
}

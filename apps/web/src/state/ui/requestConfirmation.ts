import { AppDispatch, reduxStore } from "@/state/reduxStore";
import { closeConfirmModal, openConfirmModal } from "./uiSlice";

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
          console.log("confirming!");
          resolve(true);
          dispatch(closeConfirmModal());
        },
        onCancel: () => {
          console.log("cancelling!");
          resolve(false);
          dispatch(closeConfirmModal());
        }
      })
    );
  });
}

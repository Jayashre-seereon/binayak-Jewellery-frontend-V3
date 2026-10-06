import { toast } from "sonner";

const getErrorMessage = (error, fallback = "Something went wrong.") =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const notifySuccess = (message) => toast.success(message);

export const notifyError = (error, fallback) =>
  toast.error(getErrorMessage(error, fallback));

export const notifyInfo = (message) => toast.info(message);

export const getApiErrorMessage = getErrorMessage;

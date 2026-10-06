import http from "./axios";

const PRIVATE_PATH = "/api/files/";

/**
 * Opens a stored file. Private documents (seller ID / KYC uploads) are only served to a
 * logged-in user of the owning store, so they are fetched with the session and shown from a
 * local blob; public files (S3 or image uploads) open directly.
 */
export const openStoredFile = async (url) => {
  if (!url) return;
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (!url.includes(PRIVATE_PATH) || (base && !url.startsWith(base + PRIVATE_PATH) && /^https?:/i.test(url))) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const path = url.slice(url.indexOf(PRIVATE_PATH));
  const res = await http.get(path, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(res.data);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
};

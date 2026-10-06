import http from "./axios";

export const loginApi = (payload) => http.post("/api/users/login", payload);

export const refreshTokenApi = (payload) =>
  http.post("/api/users/refresh-token", payload);

export const logoutApi = () => http.post("/api/users/logout");

export const changePasswordApi = (payload) =>
  http.post("/api/users/change-password", payload);

export const forgotPasswordApi = (email) =>
  http.post("/api/users/forgot", { email });

// Password rule enforced by the backend (CONTRACT §1).
export const validateNewPassword = (value) => {
  const text = String(value || "");
  if (text.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(text) || !/\d/.test(text)) {
    return "Password must contain at least one letter and one digit";
  }
  return true;
};

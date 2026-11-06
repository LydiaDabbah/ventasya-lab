// src/utils/api.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const getAccessToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("token");
};

export const authHeaders = (headers = {}) => {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
};

export const fetchFromApi = async (path, options = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: authHeaders(options.headers),
  });

  if (!res.ok) {
    let message = "Error al conectar con el backend";
    try {
      const error = await res.json();
      message = error.detail || message;
    } catch {}
    throw new Error(message);
  }

  if (res.status === 204) return null;

  return await res.json();
};

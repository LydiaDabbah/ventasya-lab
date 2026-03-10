// src/utils/api.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const fetchFromApi = async (path, options = {}) => {
  if (!API_URL) throw new Error("No API URL");

  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  console.log("➡️ URL usada:", `${API_URL}${path}`);

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

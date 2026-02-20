export const formatElapsed = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  // Show hours only if at least 1 hour has elapsed
  return hours > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const formatDateAndTime = (ms: number | null | undefined) => {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString();
};

export const formatDate = (ms: number | null | undefined) => {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString();
};

import { useEffect, useRef, useState } from "react";

const formatSeed = (seed: string) =>
  seed.length > 7 ? `${seed.slice(0, 7)}…` : seed;

const copySeed = async (seed: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(seed);
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

function CopyIcon({ title }: { title?: string }) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M9 9H19V19H9V9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M5 15H4C3.44772 15 3 14.5523 3 14V4C3 3.44772 3.44772 3 4 3H14C14.5523 3 15 3.44772 15 4V5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ title }: { title?: string }) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M20 6L9 17L4 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SeedButton({ seed }: { seed: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    const ok = await copySeed(seed);
    if (!ok) return;

    setCopied(true);

    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      resetTimerRef.current = null;
    }, 900);
  };

  const label = copied
    ? `Seed ${seed}. Copied.`
    : `Seed ${seed}. Press Enter to copy.`;

  return (
    <button
      type="button"
      className="btn btn--ghost"
      title={"Copy seed to clipboard"}
      aria-label={label}
      onClick={handleCopy}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCopy();
        }
      }}
    >
      <span
        className="seed-button__text"
        style={{
          marginRight: 6
        }}
      >
        {formatSeed(seed)}
      </span>
      <span
        aria-hidden
        className="seed-button__icon"
        style={{
          verticalAlign: "middle"
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </span>
    </button>
  );
}

export default SeedButton;

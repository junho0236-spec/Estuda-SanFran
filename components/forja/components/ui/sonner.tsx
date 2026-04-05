import { useEffect, useState } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { cn } from "@forja/lib/utils";

/** Forja is embedded: follow `html.dark` instead of next-themes / internal ThemeContext. */
function useDocumentTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light"
  );

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => {
      setTheme(el.classList.contains("dark") ? "dark" : "light");
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  return theme;
}

const Toaster = ({ toastOptions, className, ...props }: ToasterProps) => {
  const theme = useDocumentTheme();

  const sanfranVars =
    theme === "dark"
      ? ({
          "--normal-bg": "rgb(15 23 42)",
          "--normal-border": "rgb(51 65 85)",
          "--normal-text": "rgb(241 245 249)",
          "--normal-bg-hover": "rgb(30 41 59)",
          "--normal-border-hover": "rgb(71 85 105)",
          "--success-bg": "rgb(6 78 59 / 0.4)",
          "--success-border": "rgb(52 211 153 / 0.35)",
          "--success-text": "rgb(167 243 208)",
          "--error-bg": "rgb(69 10 10 / 0.45)",
          "--error-border": "rgb(139 26 26 / 0.55)",
          "--error-text": "rgb(254 215 170)",
          "--info-bg": "rgb(30 58 138 / 0.4)",
          "--info-border": "rgb(96 165 250 / 0.35)",
          "--info-text": "rgb(191 219 254)",
          "--warning-bg": "rgb(113 63 18 / 0.4)",
          "--warning-border": "rgb(245 158 11 / 0.35)",
          "--warning-text": "rgb(253 230 138)",
        } as React.CSSProperties)
      : ({
          "--normal-bg": "rgb(255 255 255)",
          "--normal-border": "rgb(226 232 240)",
          "--normal-text": "rgb(15 23 42)",
          "--success-bg": "rgb(240 253 244)",
          "--success-border": "rgb(187 247 208)",
          "--success-text": "rgb(21 128 61)",
          "--error-bg": "rgb(254 242 242)",
          "--error-border": "rgb(254 202 202)",
          "--error-text": "rgb(107 20 20)",
          "--info-bg": "rgb(239 246 255)",
          "--info-border": "rgb(191 219 254)",
          "--info-text": "rgb(29 78 216)",
          "--warning-bg": "rgb(255 251 235)",
          "--warning-border": "rgb(253 230 138)",
          "--warning-text": "rgb(180 83 9)",
        } as React.CSSProperties);

  return (
    <Sonner
      theme={theme}
      className={cn("toaster group font-sans", className)}
      style={{
        ...sanfranVars,
        fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
      }}
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast: cn("rounded-xl border shadow-md", toastOptions?.classNames?.toast),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

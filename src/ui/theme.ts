// src/ui/theme.ts
export const theme = {
  colors: {
    bg: "#F7F8FA",
    card: "#FFFFFF",
    text: "#0F172A",
    muted: "#64748B",
    border: "#E5E7EB",
    primary: "#111827",
    danger: "#DC2626",
    inputBg: "#FFFFFF",
    chipBg: "#EEF2F6",
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    pill: 999,
  },
  space: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  type: {
    h1: 22,
    h2: 18,
    body: 15,
    caption: 12,
    small: 11,
  },
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
  },
} as const;

// (valgfritt) hvis du Ã¸nsker default-import i noen filer:
// export default theme;

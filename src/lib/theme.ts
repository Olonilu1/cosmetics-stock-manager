export const palette = {
  light: {
    bg: "#F7F5F2",
    card: "#FFFFFF",
    text: "#1F1D1B",
    muted: "#6E6862",
    border: "#E5E1DB",
    accent: "#B23A6B",
    accentSoft: "#F7E4EC",
    good: "#1F8A4C",
    warn: "#C77700",
    bad: "#C0392B",
    chip: "#EFEAE4",
  },
  dark: {
    bg: "#141316",
    card: "#1E1C20",
    text: "#F2EFEA",
    muted: "#9C958D",
    border: "#2C2930",
    accent: "#E2759F",
    accentSoft: "#3A2230",
    good: "#4CC38A",
    warn: "#E5A54B",
    bad: "#E5735F",
    chip: "#26232A",
  },
} as const;

export interface ThemeColors {
  bg: string; card: string; text: string; muted: string; border: string;
  accent: string; accentSoft: string; good: string; warn: string; bad: string; chip: string;
}

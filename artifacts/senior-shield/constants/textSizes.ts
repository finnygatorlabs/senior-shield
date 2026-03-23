export type FontSizeKey = "tiny" | "xs" | "sm" | "base" | "md" | "lg" | "xl" | "h2" | "h1";

export interface TextSizes {
  tiny: number;  // labels, badges
  xs: number;    // captions, subtitles
  sm: number;    // secondary text
  base: number;  // body text
  md: number;    // body large
  lg: number;    // section titles, buttons
  xl: number;    // card titles
  h2: number;    // screen subtitles
  h1: number;    // main headings
}

export const TEXT_SIZES: Record<"normal" | "large" | "extra_large", TextSizes> = {
  normal: {
    tiny: 10,
    xs: 12,
    sm: 13,
    base: 15,
    md: 16,
    lg: 17,
    xl: 19,
    h2: 22,
    h1: 26,
  },
  large: {
    tiny: 12,
    xs: 14,
    sm: 15,
    base: 17,
    md: 18,
    lg: 20,
    xl: 22,
    h2: 26,
    h1: 30,
  },
  extra_large: {
    tiny: 14,
    xs: 16,
    sm: 18,
    base: 20,
    md: 22,
    lg: 24,
    xl: 26,
    h2: 30,
    h1: 34,
  },
};

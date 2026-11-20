type Theme = Record<string, string>;
declare const palette: {
  light: Theme & { page: string; surface: string; mist: string; track: string; line: string; edge: string; navy: string; ink: string; muted: string; faint: string; accent: string; haze: string };
  dark: Theme & { page: string; surface: string; mist: string; track: string; line: string; edge: string; navy: string; ink: string; muted: string; faint: string; accent: string; haze: string };
  fixed: Record<'brand' | 'brand-deep' | 'brand-soft' | 'alert' | 'alert-soft' | 'leaf' | 'navy-fill' | 'white' | 'black', string>;
  toRgb: (hex: string) => string;
  cssVars: (theme: Theme) => Record<string, string>;
};
export = palette;

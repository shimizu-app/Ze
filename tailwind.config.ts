import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#04000b",
        s1: "#080214",
        s2: "#0f0420",
        ac: "#c060ff",
        ac2: "#8820e0",
        neon: "#e070ff",
        green: "#28ee88",
        amber: "#ffb020",
        red: "#ff3058",
      },
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;

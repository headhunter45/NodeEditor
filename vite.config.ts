import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const isDemo = process.env.VITE_APP_MODE === "demo" || mode === "demo";

  return {
    plugins: [react(), tailwindcss()],
    build: isDemo
      ? {
          outDir: "dist-demo",
        }
      : {
          lib: {
            entry: path.resolve(__dirname, "src/index.ts"),
            name: "PlanBNodeEditor",
            formats: ["es", "cjs"],
            fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
          },
          rollupOptions: {
            external: ["react", "react-dom", "react/jsx-runtime"],
            output: {
              globals: {
                react: "React",
                "react-dom": "ReactDOM",
              },
              assetFileNames: (assetInfo) => {
                if (assetInfo.names?.[0]?.endsWith(".css") || assetInfo.name?.endsWith(".css")) {
                  return "style.css";
                }
                return assetInfo.name || "asset";
              },
            },
          },
        },
  };
});

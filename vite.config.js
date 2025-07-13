import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    watch: {
      // Wyłączenie HMR dla plików danych podczas importu
      ignored: [
        "**/data/**",
        "!**/data/equipment.json.bak",
        "!**/data/users.json.bak",
        "!**/data/history.json.bak",
      ],
    },
  },
});

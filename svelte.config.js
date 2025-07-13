import adapter from "@sveltejs/adapter-auto";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // adapter-auto obsługuje tylko niektóre środowiska, zobacz https://svelte.dev/docs/kit/adapter-auto dla listy.
    // Jeśli Twoje środowisko nie jest obsługiwane, lub zdecydowałeś się na konkretne środowisko, zmień adapter.
    // Zobacz https://svelte.dev/docs/kit/adapters po więcej informacji o adapterach.
    adapter: adapter(),
  },
};

export default config;

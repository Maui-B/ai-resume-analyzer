import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode — SSR off. Reasoning: every page touches Supabase / Puter on the
  // client; SSR would force a separate hydration path or a hydration mismatch.
  // Re-evaluate when we add real SEO needs in Stage 5.
  ssr: false,
} satisfies Config;

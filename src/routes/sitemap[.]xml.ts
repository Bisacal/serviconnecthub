import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import {
  isSitemapRouteIncluded,
  sitemapPathForLocation,
  sitemapStaticPaths,
  sitemapXML,
  type SitemapEntry,
} from "@/lib/sitemap";
import { blogPosts, categories } from "@/lib/marketplace-data";

const BASE_URL = "https://serviconnecthub.com";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));

        // Blog articles — local collection backing /blog/$slug.
        const blogRouteId = "/blog/$slug";
        if (isSitemapRouteIncluded(router.routesById[blogRouteId])) {
          for (const post of blogPosts) {
            const location = router.buildLocation({
              to: "/blog/$slug",
              params: { slug: post.slug },
              search: () => ({}),
              hash: "",
            });
            const path = sitemapPathForLocation(router, location, blogRouteId);
            if (path) entries.push({ path });
          }
        }

        // Service categories — local collection backing /service-categories/$slug.
        const categoryRouteId = "/service-categories/$slug";
        if (isSitemapRouteIncluded(router.routesById[categoryRouteId])) {
          for (const category of categories) {
            const location = router.buildLocation({
              to: "/service-categories/$slug",
              params: { slug: category.slug },
              search: () => ({}),
              hash: "",
            });
            const path = sitemapPathForLocation(router, location, categoryRouteId);
            if (path) entries.push({ path });
          }
        }

        // Published providers — public-safe view backing /providers/$id.
        // Uses the publishable key and existing public read policies only.
        const providerRouteId = "/providers/$id";
        if (isSitemapRouteIncluded(router.routesById[providerRouteId])) {
          const { createClient } = await import("@supabase/supabase-js");
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
          const supabase = createClient(process.env["SUPABASE_URL"]!, key, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: {
              fetch: (input, init) => {
                const headers = new Headers(init?.headers);
                // Opaque sb_ keys are not JWTs; send apikey without the default bearer.
                if (key.startsWith("sb_") && headers.get("Authorization") === "Bearer " + key)
                  headers.delete("Authorization");
                headers.set("apikey", key);
                return fetch(input, { ...init, headers });
              },
            },
          });
          const pageSize = 1000;
          for (let offset = 0; ; ) {
            const { data, error } = await supabase
              .from("public_providers")
              .select("id")
              .order("id")
              .range(offset, offset + pageSize - 1);
            if (error) throw error;
            if (data.length === 0) break;
            for (const row of data) {
              const location = router.buildLocation({
                to: "/providers/$id",
                params: { id: row.id },
                search: () => ({}),
                hash: "",
              });
              const path = sitemapPathForLocation(router, location, providerRouteId);
              if (path) entries.push({ path });
            }
            offset += data.length;
          }
        }

        if (entries.length === 0) {
          return new Response(
            'No pages are included in this sitemap. Check route decisions and ancestor exclusions. Setting "exclude-subtree" on the root excludes the entire site.',
            { status: 404, headers: { "Cache-Control": "no-store" } },
          );
        }
        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});

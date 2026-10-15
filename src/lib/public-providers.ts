import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Live, public-safe provider listings. Reads the `public_providers` view
 * (published providers only, internal account IDs excluded) and merges in
 * subscription visibility via the `provider_visibility` function.
 */
export type PublicProvider = {
  id: string;
  name: string;
  profession: string;
  headline: string | null;
  location: string;
  rating: number;
  reviews: number;
  /** Starting price in naira, or null when the provider has not set one. */
  price: number | null;
  verified: boolean;
  featured: boolean;
  planRank: number;
  experienceYears: number;
  availabilityStatus: "available" | "busy" | "unavailable";
  categorySlug: string | null;
  categoryName: string | null;
};

export const availabilityLabels: Record<PublicProvider["availabilityStatus"], string> = {
  available: "Available",
  busy: "Busy",
  unavailable: "Unavailable",
};

export const availabilityFilterOptions = ["Any availability", "Available", "Busy", "Unavailable"];

export function usePublicProviders() {
  return useQuery({
    queryKey: ["public-providers"],
    staleTime: 60_000,
    queryFn: async (): Promise<PublicProvider[]> => {
      const [{ data, error }, { data: visibility }] = await Promise.all([
        supabase.from("public_providers").select("*, category:service_categories(name, slug)"),
        supabase.rpc("provider_visibility"),
      ]);
      if (error) throw error;
      const rank = new Map((visibility ?? []).map((entry) => [entry.provider_id, entry]));
      return (data ?? []).map((p) => {
        const id = p.id ?? "";
        return {
          id,
          name: p.public_name || p.business_name || "Service provider",
          profession: p.profession ?? "Professional",
          headline: p.headline,
          location: [p.area, p.city].filter(Boolean).join(", ") || p.state || "Abuja, FCT",
          rating: Number(p.rating_average ?? 0),
          reviews: p.review_count ?? 0,
          price: p.starting_price == null ? null : Number(p.starting_price),
          verified: p.is_verified ?? false,
          featured: rank.get(id)?.is_featured ?? false,
          planRank: rank.get(id)?.visibility_rank ?? 0,
          experienceYears: p.years_experience ?? 0,
          availabilityStatus: p.availability_status ?? "unavailable",
          categorySlug: p.category?.slug ?? null,
          categoryName: p.category?.name ?? null,
        };
      });
    },
  });
}

/** "Recommended" order: featured (Premium) first, then plan visibility, then rating. */
export function rankPublicProviders<T extends PublicProvider>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || b.planRank - a.planRank || b.rating - a.rating,
  );
}

export function formatProviderPrice(price: number | null) {
  return price == null ? "On request" : `₦${price.toLocaleString("en-NG")}`;
}

export function providerInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "S") + (parts[1]?.[0] ?? "")).toUpperCase();
}

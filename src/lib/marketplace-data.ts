import {
  BookOpen,
  Camera,
  Droplets,
  Hammer,
  Laptop,
  Paintbrush,
  PartyPopper,
  Scissors,
  Sparkles,
  Sun,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

import bolaImage from "@/assets/provider-bola.jpg";
import emekaImage from "@/assets/provider-emeka.jpg";
import tundeImage from "@/assets/provider-tunde.jpg";

export type Provider = {
  id: string;
  name: string;
  profession: string;
  location: string;
  rating: string;
  reviews: number;
  price: string;
  image: string;
  verified?: boolean;
  /** Subscription visibility level: 0 Free, 1 Professional, 2 Premium. */
  planRank?: number;
  featured?: boolean;
  experience: string;
  availability: string;
  categorySlug: string;
  subcategory: string;
};

export type MarketplaceCategory = {
  name: string;
  slug: string;
  icon: LucideIcon;
  note: string;
  description: string;
  subcategories: string[];
};

export type BlogPost = {
  title: string;
  category: string;
  date: string;
};

export const providers: Provider[] = [
  { id: "bola-okafor", name: "Bola Okafor", profession: "Solar installer", location: "Gwagwalada, Abuja", rating: "4.9", reviews: 212, price: "₦15,000", image: bolaImage, verified: true, experience: "8 years", availability: "Available today", categorySlug: "solar-energy", subcategory: "Solar Installation", planRank: 2, featured: true },
  { id: "emeka-nwosu", name: "Emeka Nwosu", profession: "Auto mechanic", location: "Rukuba, Abuja", rating: "4.8", reviews: 146, price: "₦8,000", image: emekaImage, verified: true, experience: "11 years", availability: "Available tomorrow", categorySlug: "automotive-services", subcategory: "Mechanic" },
  { id: "tunde-alaba", name: "Tunde Alaba", profession: "Plumber", location: "Jabi, Abuja", rating: "4.7", reviews: 94, price: "₦6,000", image: tundeImage, experience: "6 years", availability: "Available today", categorySlug: "plumbing", subcategory: "Pipe Fitting & Repairs" },
  { id: "amina-yusuf", name: "Amina Yusuf", profession: "Home tutor · Maths", location: "Gwarinpa, Abuja", rating: "5.0", reviews: 168, price: "₦8,500/hr", image: bolaImage, verified: true, experience: "9 years", availability: "Weekday evenings", categorySlug: "education-tutoring", subcategory: "Mathematics Tutor" },
  { id: "chidi-okonkwo", name: "Chidi Okonkwo", profession: "Electrician", location: "Wuse, Abuja", rating: "4.8", reviews: 121, price: "₦5,500", image: emekaImage, verified: true, experience: "10 years", availability: "Available today", categorySlug: "electrical-services", subcategory: "Home Wiring & Repairs", planRank: 1 },
  { id: "funke-adeleke", name: "Funke Adeleke", profession: "House painter", location: "Garki, Abuja", rating: "4.6", reviews: 78, price: "₦12,000", image: bolaImage, experience: "7 years", availability: "Available tomorrow", categorySlug: "painting", subcategory: "Interior Painting" },
  { id: "ibrahim-sule", name: "Ibrahim Sule", profession: "Deep cleaning specialist", location: "Kubwa, Abuja", rating: "4.9", reviews: 187, price: "₦10,000", image: tundeImage, verified: true, experience: "6 years", availability: "Available today", categorySlug: "cleaning", subcategory: "Deep Cleaning", planRank: 1 },
  { id: "grace-ekong", name: "Grace Ekong", profession: "Carpenter & furniture maker", location: "Lugbe, Abuja", rating: "4.7", reviews: 65, price: "₦9,000", image: bolaImage, experience: "12 years", availability: "Weekdays", categorySlug: "carpentry", subcategory: "Custom Furniture" },
  { id: "segun-balogun", name: "Segun Balogun", profession: "Laptop & phone repair", location: "Maitama, Abuja", rating: "4.8", reviews: 143, price: "₦7,000", image: emekaImage, verified: true, experience: "8 years", availability: "Available today", categorySlug: "technology-services", subcategory: "Device Repair" },
  { id: "ngozi-obi", name: "Ngozi Obi", profession: "Event photographer", location: "Asokoro, Abuja", rating: "4.9", reviews: 112, price: "₦25,000", image: bolaImage, verified: true, experience: "7 years", availability: "Weekends", categorySlug: "creative-services", subcategory: "Photography" },
  { id: "kemi-owolabi", name: "Kemi Owolabi", profession: "Hair stylist & braider", location: "Gwarinpa, Abuja", rating: "4.9", reviews: 231, price: "₦6,500", image: bolaImage, verified: true, experience: "9 years", availability: "Available today", categorySlug: "fashion-beauty", subcategory: "Hair Styling", planRank: 2, featured: true },
  { id: "yusuf-bello", name: "Yusuf Bello", profession: "Caterer · Nigerian dishes", location: "Jabi, Abuja", rating: "4.8", reviews: 97, price: "₦50,000", image: tundeImage, experience: "10 years", availability: "Book 1 week ahead", categorySlug: "events-catering", subcategory: "Catering" },
];

export const categories: MarketplaceCategory[] = [
  { name: "Education & Tutoring", slug: "education-tutoring", icon: BookOpen, note: "Tutors for every stage", description: "Patient, vetted tutors for children, students and adults — at home or online.", subcategories: ["Mathematics Tutor", "Science Tutor", "English Tutor", "Computer Tutor", "Home Lesson Tutor", "Exam Preparation (WAEC, JAMB)", "Language Tutor"] },
  { name: "Automotive Services", slug: "automotive-services", icon: Wrench, note: "Keep moving with confidence", description: "Trusted hands for diagnostics, repairs and everyday car care.", subcategories: ["Mechanic", "Auto Electrician", "Car Diagnostics", "Car Repair", "Panel Beating & Body Work", "Car AC Service", "Mobile Mechanic"] },
  { name: "Solar & Energy", slug: "solar-energy", icon: Sun, note: "Power for your home", description: "Reliable solar and inverter solutions sized for your home or business.", subcategories: ["Solar Installation", "Solar Maintenance", "Inverter Installation", "Battery Replacement", "Solar Consultation & Sizing"] },
  { name: "Electrical Services", slug: "electrical-services", icon: Zap, note: "Safe, reliable repairs", description: "Certified electricians for safe installations, repairs and upgrades.", subcategories: ["Home Wiring & Repairs", "Lighting Installation", "Socket & Switch Repair", "Generator Installation", "Electrical Safety Inspection"] },
  { name: "Plumbing", slug: "plumbing", icon: Droplets, note: "Fix leaks and flow", description: "From leaking taps to full bathroom fitting, done neatly.", subcategories: ["Pipe Fitting & Repairs", "Leak Detection", "Bathroom Installation", "Water Heater Installation", "Drainage & Unblocking"] },
  { name: "Painting", slug: "painting", icon: Paintbrush, note: "Refresh your space", description: "Clean lines, honest quotes and a finish that lasts.", subcategories: ["Interior Painting", "Exterior Painting", "Wallpaper Installation", "Decorative Finishes", "Office Painting"] },
  { name: "Cleaning", slug: "cleaning", icon: Sparkles, note: "A better kind of clean", description: "Thorough, dependable cleaning for homes and offices.", subcategories: ["Home Cleaning", "Deep Cleaning", "Post-Construction Cleaning", "Office Cleaning", "Laundry & Ironing"] },
  { name: "Carpentry", slug: "carpentry", icon: Hammer, note: "Made to fit your life", description: "Skilled carpenters for repairs, fittings and custom furniture.", subcategories: ["Custom Furniture", "Door & Window Repair", "Shelving & Storage", "Kitchen Cabinets", "Wood Polishing & Restoration"] },
  { name: "Technology Services", slug: "technology-services", icon: Laptop, note: "Tech support, sorted", description: "Friendly tech help for devices, networks and small business systems.", subcategories: ["Device Repair", "Computer Setup & Support", "Wi-Fi & Network Setup", "CCTV Installation", "Software Installation"] },
  { name: "Creative Services", slug: "creative-services", icon: Camera, note: "Bring ideas to life", description: "Photographers, designers and makers for your next project.", subcategories: ["Photography", "Videography", "Graphic Design", "Content Writing", "Branding & Logo Design"] },
  { name: "Fashion & Beauty", slug: "fashion-beauty", icon: Scissors, note: "Style your way", description: "Stylists, tailors and beauty professionals who come to you.", subcategories: ["Hair Styling", "Makeup Artistry", "Tailoring & Alterations", "Barbering", "Nail Care", "Fashion Design"] },
  { name: "Events & Catering", slug: "events-catering", icon: PartyPopper, note: "Make it a moment", description: "Everything you need to host well — food, décor and coordination.", subcategories: ["Catering", "Event Planning", "Decoration", "MC & Entertainment", "Equipment Rental", "Cake Baking"] },
];

export function getCategoryBySlug(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function providersForCategory(slug: string) {
  return providers.filter((provider) => provider.categorySlug === slug);
}

export const locations: string[] = [
  "Abuja, FCT",
  "Gwarinpa, Abuja",
  "Jabi, Abuja",
  "Wuse, Abuja",
  "Maitama, Abuja",
  "Garki, Abuja",
  "Kubwa, Abuja",
  "Lugbe, Abuja",
  "Gwagwalada, Abuja",
  "Asokoro, Abuja",
];

export const blogPosts: BlogPost[] = [
  { title: "How to choose a reliable professional for your home", category: "Getting started", date: "May 12, 2026" },
  { title: "What a verified provider profile should tell you", category: "Trust & safety", date: "May 05, 2026" },
  { title: "The Abuja neighbourhood guide to getting things done", category: "Local guide", date: "Apr 28, 2026" },
];
// ---------------------------------------------------------------------------
// Derived provider details (sample content until the database is connected)
// ---------------------------------------------------------------------------

export type ProviderReview = { author: string; rating: number; date: string; body: string };

const portfolioPool = [bolaImage, emekaImage, tundeImage];

export function providerPriceValue(provider: Provider) {
  return Number(provider.price.replace(/[^0-9]/g, "")) || 0;
}

export function providerExperienceYears(provider: Provider) {
  return Number(provider.experience.replace(/[^0-9]/g, "")) || 0;
}

export function providerBusinessName(provider: Provider) {
  const first = provider.name.split(" ")[0] ?? provider.name;
  return `${first}'s ${provider.subcategory} Services`;
}

export function providerBio(provider: Provider) {
  return `${provider.name} is a ${provider.profession.toLowerCase()} based in ${provider.location}, with ${provider.experience} of hands-on work across homes, offices and small businesses. Known for clear pricing, tidy work and honest timelines, ${provider.name.split(" ")[0]} handles every job personally and explains the options before starting.`;
}

export function providerServices(provider: Provider) {
  const category = getCategoryBySlug(provider.categorySlug);
  const list = category ? category.subcategories.slice(0, 5) : [];
  return list.includes(provider.subcategory) ? list : [provider.subcategory, ...list].slice(0, 5);
}

export function providerPortfolio(provider: Provider) {
  const start = provider.name.length % portfolioPool.length;
  return [0, 1, 2].map((offset) => ({
    image: portfolioPool[(start + offset) % portfolioPool.length] as string,
    label: `${provider.subcategory} project ${offset + 1}`,
  }));
}

export function providerReviews(provider: Provider): ProviderReview[] {
  const first = provider.name.split(" ")[0] ?? provider.name;
  return [
    { author: "Adaeze M.", rating: 5, date: "Aug 2026", body: `${first} arrived on time, explained the work clearly and finished neatly. Pricing matched the quote exactly.` },
    { author: "Samuel O.", rating: 5, date: "Jul 2026", body: `Very professional. Good communication before and after the job — I would book again for any ${provider.subcategory.toLowerCase()} work.` },
    { author: "Hauwa B.", rating: 4, date: "Jun 2026", body: `Solid work and fair price. Took a little longer than planned but the result was worth it.` },
  ];
}

export const priceRanges = [
  { label: "Any price", min: 0, max: Number.POSITIVE_INFINITY },
  { label: "Under ₦7,000", min: 0, max: 6999 },
  { label: "₦7,000 – ₦15,000", min: 7000, max: 15000 },
  { label: "Above ₦15,000", min: 15001, max: Number.POSITIVE_INFINITY },
];

export const ratingFilters = [
  { label: "Any rating", min: 0 },
  { label: "4.5 and above", min: 4.5 },
  { label: "4.8 and above", min: 4.8 },
];

export const experienceFilters = [
  { label: "Any experience", min: 0 },
  { label: "5+ years", min: 5 },
  { label: "8+ years", min: 8 },
  { label: "10+ years", min: 10 },
];

export const availabilityOptions = ["Any availability", ...Array.from(new Set(providers.map((p) => p.availability)))];

/** "Recommended" order: featured (Premium) first, then higher plan visibility, then rating. */
export function rankProviders<T extends Provider>(list: T[]): T[] {
  return [...list].sort((a, b) =>
    Number(!!b.featured) - Number(!!a.featured) || (b.planRank ?? 0) - (a.planRank ?? 0) || Number(b.rating) - Number(a.rating));
}

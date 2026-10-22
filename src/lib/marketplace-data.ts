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

export type MarketplaceCategory = {
  name: string;
  slug: string;
  icon: LucideIcon;
  note: string;
  description: string;
  subcategories: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  category: string;
  date: string;
  summary: string;
};

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
  { slug: "article-1", title: "How to choose a reliable professional for your home", category: "Getting started", date: "May 12, 2026", summary: "What to check before you hire: services offered, location, starting price, experience and real client reviews." },
  { slug: "article-2", title: "What a verified provider profile should tell you", category: "Trust & safety", date: "May 05, 2026", summary: "The trust signals that matter on a provider profile — verification, ratings, availability and clear pricing." },
  { slug: "article-3", title: "The Abuja neighbourhood guide to getting things done", category: "Local guide", date: "Apr 28, 2026", summary: "How to find reliable help across Abuja's neighbourhoods, from Gwarinpa to Gwagwalada." },
];

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
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

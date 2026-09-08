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
  experience: string;
  availability: string;
};

export type MarketplaceCategory = {
  name: string;
  slug: string;
  icon: LucideIcon;
  note: string;
};

export type BlogPost = {
  title: string;
  category: string;
  date: string;
};

export const providers: Provider[] = [
  { id: "bola-okafor", name: "Bola Okafor", profession: "Solar installer", location: "Gwagwalada, Abuja", rating: "4.9", reviews: 212, price: "₦15,000", image: bolaImage, verified: true, experience: "8 years", availability: "Available today" },
  { id: "emeka-nwosu", name: "Emeka Nwosu", profession: "Auto mechanic", location: "Rukuba, Abuja", rating: "4.8", reviews: 146, price: "₦8,000", image: emekaImage, verified: true, experience: "11 years", availability: "Available tomorrow" },
  { id: "tunde-alaba", name: "Tunde Alaba", profession: "Plumber", location: "Jabi, Abuja", rating: "4.7", reviews: 94, price: "₦6,000", image: tundeImage, experience: "6 years", availability: "Available today" },
  { id: "amina-yusuf", name: "Amina Yusuf", profession: "Home tutor · Maths", location: "Gwarinpa, Abuja", rating: "5.0", reviews: 168, price: "₦8,500/hr", image: bolaImage, verified: true, experience: "9 years", availability: "Weekday evenings" },
];

export const categories: MarketplaceCategory[] = [
  { name: "Education & Tutoring", slug: "education-tutoring", icon: BookOpen, note: "Tutors for every stage" },
  { name: "Automotive Services", slug: "automotive-services", icon: Wrench, note: "Keep moving with confidence" },
  { name: "Solar & Energy", slug: "solar-energy", icon: Sun, note: "Power for your home" },
  { name: "Electrical Services", slug: "electrical-services", icon: Zap, note: "Safe, reliable repairs" },
  { name: "Plumbing", slug: "plumbing", icon: Droplets, note: "Fix leaks and flow" },
  { name: "Painting", slug: "painting", icon: Paintbrush, note: "Refresh your space" },
  { name: "Cleaning", slug: "cleaning", icon: Sparkles, note: "A better kind of clean" },
  { name: "Carpentry", slug: "carpentry", icon: Hammer, note: "Made to fit your life" },
  { name: "Technology Services", slug: "technology-services", icon: Laptop, note: "Tech support, sorted" },
  { name: "Creative Services", slug: "creative-services", icon: Camera, note: "Bring ideas to life" },
  { name: "Fashion & Beauty", slug: "fashion-beauty", icon: Scissors, note: "Style your way" },
  { name: "Events & Catering", slug: "events-catering", icon: PartyPopper, note: "Make it a moment" },
];

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
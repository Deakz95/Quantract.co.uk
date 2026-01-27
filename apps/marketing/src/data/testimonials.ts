/**
 * Testimonials data with typed schema
 * Ready for real customer quotes when available
 */

export interface Testimonial {
  /** Unique identifier */
  id: string;
  /** Customer's full name */
  name: string;
  /** Customer's role/job title */
  role: string;
  /** Company name */
  company: string;
  /** Location (city or region) */
  location: string;
  /** The testimonial text */
  quote: string;
  /** Optional avatar image URL - leave empty for initials */
  avatarUrl?: string;
  /** Rating out of 5 (optional) */
  rating?: number;
  /** Whether this testimonial is featured/highlighted */
  featured?: boolean;
  /** Date the testimonial was given (ISO string) */
  date?: string;
}

/**
 * Current testimonials
 * Replace placeholder data with real customer quotes as they become available
 */
export const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Mike Thompson",
    role: "Director",
    company: "Thompson Electrical Ltd",
    location: "Manchester",
    quote:
      "Before Quantract, I was losing hours every week on paperwork. Now my quotes go out same-day and I've won more work as a result. The customer portal means clients can sign off and pay without me chasing them.",
    featured: true,
    rating: 5,
    date: "2024-11-15",
  },
  {
    id: "2",
    name: "Sarah Williams",
    role: "Owner",
    company: "SW Electrical Services",
    location: "Bristol",
    quote:
      "The certificate feature alone is worth the subscription. I used to dread EICR paperwork - now it takes minutes instead of hours. My accountant loves how organised everything is.",
    featured: true,
    rating: 5,
    date: "2024-10-22",
  },
  {
    id: "3",
    name: "James Chen",
    role: "Managing Director",
    company: "Chen & Sons Electrical",
    location: "Birmingham",
    quote:
      "We tried three different software packages before Quantract. This is the first one that actually understands how electricians work. The Xero integration saved my bookkeeper a day a week.",
    featured: true,
    rating: 5,
    date: "2024-09-18",
  },
];

/**
 * Get initials from a name for avatar fallback
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get featured testimonials only
 */
export function getFeaturedTestimonials(): Testimonial[] {
  return testimonials.filter((t) => t.featured);
}

/**
 * Get testimonials for a specific location
 */
export function getTestimonialsByLocation(location: string): Testimonial[] {
  return testimonials.filter((t) =>
    t.location.toLowerCase().includes(location.toLowerCase())
  );
}

export type TutorSubject =
  | "mathematics"
  | "physics"
  | "chemistry"
  | "biology"
  | "english"
  | "computer_science"
  | "economics"
  | "accountancy";

export type ExperienceLevel = "1-2 years" | "3-5 years" | "5-8 years" | "8+ years";

export type PriceRange = "₹300-500/hr" | "₹500-800/hr" | "₹800-1200/hr" | "₹1200+/hr";

export type TutorIcon = "book" | "compass" | "graduationCap" | "wrench" | "clipboard";

export interface TutorDot {
  id: string;
  name: string;
  subject: TutorSubject;
  experience: ExperienceLevel;
  priceRange: PriceRange;
  icon: TutorIcon;
  location: { lat: number; lng: number };
  area: string;
  description: string;
  relevance: string;
  qualification?: string;
  availability?: string;
  distance?: string;
  rating?: string;
  languages?: string;
  grade?: string;
  stream?: string;
}

export const TUTOR_SUBJECT_LABELS: Record<TutorSubject, string> = {
  mathematics: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  english: "English",
  computer_science: "Computer Science",
  economics: "Economics",
  accountancy: "Accountancy",
};

export const TUTOR_SUBJECT_COLORS: Record<TutorSubject, string> = {
  mathematics: "#2563EB",
  physics: "#1D4ED8",
  chemistry: "#1E40AF",
  biology: "#2E7D32",
  english: "#2554C7",
  computer_science: "#1565C0",
  economics: "#1E3A8A",
  accountancy: "#6A1B9A",
};

export const TUTOR_SUBJECT_ICONS: Record<TutorSubject, TutorIcon> = {
  mathematics: "book",
  physics: "compass",
  chemistry: "clipboard",
  biology: "graduationCap",
  english: "book",
  computer_science: "wrench",
  economics: "compass",
  accountancy: "clipboard",
};

function anonymizeName(name: string): string {
  return name
    .split(" ")
    .map((word) => {
      if (word.length <= 2) return word;
      return word[0] + "#".repeat(word.length - 2) + word[word.length - 1];
    })
    .join(" ");
}

export const tutorDots: TutorDot[] = [
  { id: "td-01", name: "Amit Verma", subject: "mathematics", experience: "5-8 years", priceRange: "₹500-800/hr", icon: "book", location: { lat: 28.6715, lng: 77.4530 }, area: "Rajendra Nagar, Ghaziabad", description: "Experienced Mathematics tutor specializing in JEE and board prep.", relevance: "Strong track record in JEE Mains coaching with 90%+ results in board exams. Excellent at building conceptual clarity.", qualification: "M.Sc. Mathematics, B.Ed.", availability: "Weekday evenings, weekends", distance: "1.5 km", rating: "4.8" },
  { id: "td-02", name: "Sneha Gupta", subject: "physics", experience: "3-5 years", priceRange: "₹500-800/hr", icon: "compass", location: { lat: 28.6620, lng: 77.3730 }, area: "Vasundhara, Ghaziabad", description: "Physics tutor with focus on Mechanics and Modern Physics.", relevance: "IIT graduate with a passion for making Physics intuitive. Specializes in problem-solving techniques for competitive exams.", qualification: "B.Tech IIT Delhi, M.Sc. Physics", availability: "Weekday evenings", distance: "2.3 km", rating: "4.7" },
  { id: "td-03", name: "Rajeev Kumar", subject: "chemistry", experience: "8+ years", priceRange: "₹800-1200/hr", icon: "clipboard", location: { lat: 28.6510, lng: 77.3160 }, area: "Anand Vihar, Delhi", description: "Senior Chemistry tutor with expertise in Organic and Inorganic Chemistry.", relevance: "Former coaching centre faculty with 8+ years experience. Known for simplifying complex reactions and mechanisms.", qualification: "M.Sc. Chemistry, Ph.D. (ongoing)", availability: "Flexible, all days", distance: "3.2 km", rating: "4.9" },
  { id: "td-04", name: "Priya Sharma", subject: "biology", experience: "3-5 years", priceRange: "₹300-500/hr", icon: "graduationCap", location: { lat: 28.6830, lng: 77.3190 }, area: "Dilshad Garden, Delhi", description: "Biology tutor specializing in NEET preparation.", relevance: "NEET-qualified doctor turned educator. Excels at Genetics, Ecology, and Human Physiology topics.", qualification: "MBBS, M.Ed.", availability: "Weekends, morning slots", distance: "1.1 km", rating: "4.6" },
  { id: "td-05", name: "Deepak Tiwari", subject: "english", experience: "5-8 years", priceRange: "₹300-500/hr", icon: "book", location: { lat: 28.6730, lng: 77.3290 }, area: "Vivek Vihar, Delhi", description: "English language and literature tutor for boards and communication skills.", relevance: "Former British Council certified trainer. Focuses on writing skills, comprehension, and spoken English.", qualification: "M.A. English Literature", availability: "Weekday afternoons", distance: "0.9 km", rating: "4.5" },
  { id: "td-06", name: "Kavita Mishra", subject: "mathematics", experience: "8+ years", priceRange: "₹800-1200/hr", icon: "book", location: { lat: 28.6420, lng: 77.3620 }, area: "Indirapuram, Ghaziabad", description: "Senior Mathematics tutor for Olympiad and advanced competitive prep.", relevance: "RMO/INMO mentor with students qualifying at national level. Expert in Number Theory and Combinatorics.", qualification: "M.Sc. Mathematics, IISc Bangalore", availability: "Weekends only", distance: "4.0 km", rating: "4.9" },
  { id: "td-07", name: "Rohit Saxena", subject: "computer_science", experience: "3-5 years", priceRange: "₹500-800/hr", icon: "wrench", location: { lat: 28.6280, lng: 77.3660 }, area: "Noida Sector 62", description: "Computer Science tutor for Python, Java, and Data Structures.", relevance: "Software engineer at a top tech company who teaches part-time. Great at making coding concepts practical.", qualification: "B.Tech CSE, NIT", availability: "Evenings, weekends", distance: "5.5 km", rating: "4.7" },
  { id: "td-08", name: "Anjali Dubey", subject: "physics", experience: "1-2 years", priceRange: "₹300-500/hr", icon: "compass", location: { lat: 28.6460, lng: 77.3410 }, area: "Vaishali, Ghaziabad", description: "Young Physics tutor for Class 11-12 boards.", relevance: "Recent IIT graduate offering affordable Physics coaching. Relatable approach that works well with younger students.", qualification: "B.Tech IIT Roorkee", availability: "Weekday evenings", distance: "3.1 km", rating: "4.4" },
  { id: "td-09", name: "Suresh Yadav", subject: "economics", experience: "5-8 years", priceRange: "₹500-800/hr", icon: "compass", location: { lat: 28.5710, lng: 77.3260 }, area: "Noida Sector 18", description: "Economics tutor for Commerce stream and CUET preparation.", relevance: "Former DU lecturer with deep knowledge of Micro and Macro Economics. Helps students score 95+ in boards.", qualification: "M.A. Economics, NET qualified", availability: "Mornings, weekdays", distance: "6.1 km", rating: "4.6" },
  { id: "td-10", name: "Neha Kapoor", subject: "chemistry", experience: "3-5 years", priceRange: "₹500-800/hr", icon: "clipboard", location: { lat: 28.6520, lng: 77.3220 }, area: "Kaushambi, Ghaziabad", description: "Chemistry tutor for Physical Chemistry and board exams.", relevance: "Skilled at breaking down Physical Chemistry numericals. Has helped 50+ students improve their Chemistry scores by 20+ marks.", qualification: "M.Sc. Chemistry", availability: "Weekday evenings, Saturdays", distance: "2.8 km", rating: "4.5" },
  { id: "td-11", name: "Vikram Singh", subject: "mathematics", experience: "1-2 years", priceRange: "₹300-500/hr", icon: "book", location: { lat: 28.6690, lng: 77.4540 }, area: "Rajendra Nagar, Ghaziabad", description: "Mathematics tutor for Class 9-10 foundation building.", relevance: "Recent engineering graduate passionate about teaching. Focuses on building strong fundamentals in Algebra and Geometry.", qualification: "B.Tech Mechanical", availability: "Evenings, flexible", distance: "1.3 km", rating: "4.3" },
  { id: "td-12", name: "Meena Joshi", subject: "biology", experience: "8+ years", priceRange: "₹1200+/hr", icon: "graduationCap", location: { lat: 28.6310, lng: 77.2910 }, area: "Patparganj, Delhi", description: "Senior Biology tutor and NEET expert with premium coaching.", relevance: "15+ years of NEET coaching experience. Multiple students in top 1000 AIR. Premium but results-oriented.", qualification: "Ph.D. Zoology, M.Ed.", availability: "By appointment", distance: "4.6 km", rating: "5.0" },
  { id: "td-13", name: "Arun Pathak", subject: "accountancy", experience: "5-8 years", priceRange: "₹500-800/hr", icon: "clipboard", location: { lat: 28.6620, lng: 77.3710 }, area: "Vasundhara, Ghaziabad", description: "Accountancy tutor for Commerce stream boards and CA Foundation.", relevance: "Practicing CA who teaches Accountancy. Makes journal entries, financial statements, and ratio analysis easy to understand.", qualification: "CA, M.Com", availability: "Weekends, evening slots", distance: "2.1 km", rating: "4.7" },
  { id: "td-14", name: "Ritu Agarwal", subject: "english", experience: "8+ years", priceRange: "₹800-1200/hr", icon: "book", location: { lat: 28.5760, lng: 77.3560 }, area: "Noida Sector 50", description: "Senior English tutor for IELTS, TOEFL, and advanced writing.", relevance: "Cambridge-certified English trainer. Specializes in academic writing, grammar, and exam preparation for competitive tests.", qualification: "M.A. English, Cambridge CELTA", availability: "Flexible, online available", distance: "5.8 km", rating: "4.8" },
  { id: "td-15", name: "Manish Chauhan", subject: "physics", experience: "5-8 years", priceRange: "₹800-1200/hr", icon: "compass", location: { lat: 28.6520, lng: 77.3140 }, area: "Anand Vihar, Delhi", description: "Physics tutor specializing in JEE Advanced preparation.", relevance: "Former Resonance faculty. Expert in Electrostatics, Optics, and Modern Physics for JEE Advanced level problems.", qualification: "M.Sc. Physics, IIT Kanpur", availability: "Daily sessions available", distance: "2.0 km", rating: "4.8" },
  { id: "td-16", name: "Sunita Pandey", subject: "chemistry", experience: "1-2 years", priceRange: "₹300-500/hr", icon: "clipboard", location: { lat: 28.6710, lng: 77.3270 }, area: "Vivek Vihar, Delhi", description: "Chemistry tutor for Class 11-12 NCERT and basics.", relevance: "Fresh M.Sc. graduate offering affordable Chemistry coaching. Patient and thorough with fundamentals.", qualification: "M.Sc. Chemistry", availability: "Afternoons, weekdays", distance: "1.0 km", rating: "4.2" },
  { id: "td-17", name: "Gaurav Mehta", subject: "computer_science", experience: "5-8 years", priceRange: "₹800-1200/hr", icon: "wrench", location: { lat: 28.6430, lng: 77.3580 }, area: "Indirapuram, Ghaziabad", description: "Computer Science tutor for web development and competitive programming.", relevance: "Full-stack developer and competitive programming coach. Has mentored students for Google Code Jam and ICPC.", qualification: "B.Tech CSE, M.Tech AI", availability: "Evenings, weekends", distance: "3.6 km", rating: "4.8" },
  { id: "td-18", name: "Pooja Rastogi", subject: "mathematics", experience: "3-5 years", priceRange: "₹500-800/hr", icon: "book", location: { lat: 28.6810, lng: 77.3170 }, area: "Dilshad Garden, Delhi", description: "Mathematics tutor for Calculus and Coordinate Geometry.", relevance: "Specializes in Calculus coaching for Class 12 and JEE. Uses visual learning methods to explain abstract concepts.", qualification: "M.Sc. Mathematics", availability: "Mornings and evenings", distance: "2.4 km", rating: "4.6" },
  { id: "td-19", name: "Arjun Reddy", subject: "biology", experience: "3-5 years", priceRange: "₹500-800/hr", icon: "graduationCap", location: { lat: 28.5520, lng: 77.3910 }, area: "Noida Sector 76", description: "Biology tutor for NEET and board exam preparation.", relevance: "Medical doctor teaching Biology part-time. Makes anatomy and physiology memorable with clinical examples.", qualification: "MBBS", availability: "Weekends", distance: "7.0 km", rating: "4.5" },
  { id: "td-20", name: "Lakshmi Nair", subject: "economics", experience: "3-5 years", priceRange: "₹300-500/hr", icon: "compass", location: { lat: 28.6440, lng: 77.3390 }, area: "Vaishali, Ghaziabad", description: "Economics tutor for Indian Economic Development and Statistics.", relevance: "Young economist with teaching flair. Makes data analysis and economic theory accessible through real-world examples.", qualification: "M.A. Economics, JNU", availability: "Flexible, all days", distance: "3.3 km", rating: "4.4" },
  { id: "td-21", name: "Sanjay Bhatia", subject: "physics", experience: "8+ years", priceRange: "₹1200+/hr", icon: "compass", location: { lat: 28.6490, lng: 77.3210 }, area: "Kaushambi, Ghaziabad", description: "Premium Physics tutor for JEE Advanced and Olympiad prep.", relevance: "20+ years of Physics teaching. Has produced IIT toppers and Physics Olympiad qualifiers. Premium, results-guaranteed approach.", qualification: "M.Sc. Physics, Ph.D.", availability: "By appointment only", distance: "2.7 km", rating: "5.0" },
  { id: "td-22", name: "Divya Kapoor", subject: "accountancy", experience: "3-5 years", priceRange: "₹300-500/hr", icon: "clipboard", location: { lat: 28.6290, lng: 77.2890 }, area: "Patparganj, Delhi", description: "Accountancy tutor for Class 11-12 and B.Com foundation.", relevance: "Makes double-entry bookkeeping and financial statements simple. Patient approach for Commerce students.", qualification: "M.Com, CA Inter", availability: "Evenings, weekdays", distance: "4.0 km", rating: "4.3" },
  { id: "td-23", name: "Nikhil Sharma", subject: "english", experience: "3-5 years", priceRange: "₹500-800/hr", icon: "book", location: { lat: 28.6260, lng: 77.3640 }, area: "Noida Sector 62", description: "English tutor for creative writing and literature analysis.", relevance: "Published author who teaches literary analysis and creative writing. Perfect for students targeting English Honours.", qualification: "M.A. English Literature, MFA Creative Writing", availability: "Weekends, mornings", distance: "5.9 km", rating: "4.6" },
  { id: "td-24", name: "Rekha Menon", subject: "chemistry", experience: "5-8 years", priceRange: "₹800-1200/hr", icon: "clipboard", location: { lat: 28.6680, lng: 77.4530 }, area: "Rajendra Nagar, Ghaziabad", description: "Chemistry tutor for Organic Chemistry and JEE preparation.", relevance: "Expert in Organic Chemistry mechanisms. Former Allen faculty with excellent results in JEE Chemistry.", qualification: "M.Sc. Chemistry, B.Ed.", availability: "Daily, flexible", distance: "1.4 km", rating: "4.8" },
  { id: "td-25", name: "Tarun Jain", subject: "mathematics", experience: "8+ years", priceRange: "₹1200+/hr", icon: "book", location: { lat: 28.6590, lng: 77.3690 }, area: "Vasundhara, Ghaziabad", description: "Premium Mathematics coaching for JEE Advanced.", relevance: "Star faculty at a leading coaching institute now offering personal tuitions. Multiple students in IIT top 100.", qualification: "M.Sc. Mathematics, ISI Kolkata", availability: "Limited slots, by appointment", distance: "2.5 km", rating: "5.0" },
];

// Anonymize names
tutorDots.forEach((dot) => {
  dot.name = anonymizeName(dot.name);
});

export const TUTOR_CENTER: [number, number] = [28.6139, 77.2090];
export const TUTOR_DEFAULT_ZOOM = 10;

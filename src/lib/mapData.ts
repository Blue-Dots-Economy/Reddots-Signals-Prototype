export type DotType = "blue" | "brown";

export type DotIcon = "book" | "compass" | "graduationCap" | "wrench" | "clipboard" | "briefcase";

export type Pillar = "subject_tutoring" | "career_counselling" | "college_admissions" | "skill_workshop" | "exam_prep";

export type ContactType = "direct" | "indirect";

export interface MapDot {
  id: string;
  name: string;
  type: DotType;
  icon: DotIcon;
  pillar: Pillar;
  location: { lat: number; lng: number };
  area: string;
  contact: ContactType;
  description: string;
  relevance: string;
  status?: string;
  skills?: string;
  education?: string;
  experience?: string;
  wageRange?: string;
  wageExpected?: string;
  availability?: string;
  distance?: string;
  languages?: string;
  lastEmployer?: string;
  preferred?: string;
  locationDetail?: string;
  businessType?: string;
  offers?: string;
  terms?: string;
  clients?: string;
  grade?: string;
  needs?: string;
  email?: string;
}

// Guwahati neighbourhood anchors — used to scatter mock student dots realistically.
const GUWAHATI_AREAS: { area: string; lat: number; lng: number }[] = [
  { area: "Zoo Road, Guwahati", lat: 26.1626, lng: 91.7780 },
  { area: "Beltola, Guwahati", lat: 26.1290, lng: 91.7860 },
  { area: "Six Mile, Guwahati", lat: 26.1370, lng: 91.8000 },
  { area: "Hatigaon, Guwahati", lat: 26.1410, lng: 91.7950 },
  { area: "Ganeshguri, Guwahati", lat: 26.1480, lng: 91.7830 },
  { area: "Dispur, Guwahati", lat: 26.1430, lng: 91.7900 },
  { area: "Khanapara, Guwahati", lat: 26.1110, lng: 91.8060 },
  { area: "Maligaon, Guwahati", lat: 26.1700, lng: 91.6940 },
  { area: "Paltan Bazaar, Guwahati", lat: 26.1820, lng: 91.7460 },
  { area: "Fancy Bazaar, Guwahati", lat: 26.1840, lng: 91.7390 },
  { area: "Uzan Bazaar, Guwahati", lat: 26.1880, lng: 91.7510 },
  { area: "Silpukhuri, Guwahati", lat: 26.1900, lng: 91.7570 },
  { area: "Chandmari, Guwahati", lat: 26.1850, lng: 91.7660 },
  { area: "Bhangagarh, Guwahati", lat: 26.1540, lng: 91.7700 },
  { area: "Lachit Nagar, Guwahati", lat: 26.1620, lng: 91.7600 },
  { area: "Rehabari, Guwahati", lat: 26.1740, lng: 91.7570 },
  { area: "Athgaon, Guwahati", lat: 26.1810, lng: 91.7320 },
  { area: "Jalukbari, Guwahati", lat: 26.1530, lng: 91.6660 },
  { area: "Panjabari, Guwahati", lat: 26.1450, lng: 91.8050 },
  { area: "Narengi, Guwahati", lat: 26.1820, lng: 91.8260 },
];

const pickArea = (i: number) => GUWAHATI_AREAS[i % GUWAHATI_AREAS.length];

export const dots: MapDot[] = [
  // 1
  { id: "yd-01", name: "Prisha Sharma", type: "blue", icon: "book", pillar: "subject_tutoring", location: { lat: pickArea(0).lat, lng: pickArea(0).lng }, area: pickArea(0).area, contact: "direct", description: "Class XI student seeking Physics tutoring.", relevance: "This student has a flagged scope for improvement in Physics and is looking for a tutor within walking distance. A single trial session is a low-commitment first step.", education: "Class XI — Science Stream", skills: "Physics Tutoring", availability: "In-person preferred, weekday evenings", distance: "1.8 km from your location" },
  // 2
  { id: "yd-02", name: "Rajesh Varsha", type: "blue", icon: "graduationCap", pillar: "college_admissions", location: { lat: pickArea(1).lat, lng: pickArea(1).lng }, area: pickArea(1).area, contact: "direct", description: "Class XII student seeking college admissions guidance for engineering.", relevance: "Student is actively evaluating engineering colleges and is ready to engage with a counsellor for shortlisting and application support.", education: "Class XII — Science Stream", skills: "College Admissions Guidance (Engineering)", availability: "Online preferred, weekend slots", distance: "2.1 km from your location" },
  // 3
  { id: "yd-03", name: "Adithi Mishra", type: "blue", icon: "clipboard", pillar: "exam_prep", location: { lat: pickArea(2).lat, lng: pickArea(2).lng }, area: pickArea(2).area, contact: "direct", description: "Class XII student preparing for JEE Mains.", relevance: "Student is targeting JEE Mains and has identified Mathematics and Physics as weak areas. Looking for structured short-term coaching without full centre enrolment.", education: "Class XII — Science Stream", skills: "JEE Mains Exam Prep", availability: "In-person preferred, daily 2-hour sessions", distance: "3.4 km from your location" },
  // 4
  { id: "yd-04", name: "Shruti Kapoor", type: "blue", icon: "compass", pillar: "career_counselling", location: { lat: pickArea(3).lat, lng: pickArea(3).lng }, area: pickArea(3).area, contact: "direct", description: "Class XI student exploring career options in Commerce.", relevance: "Student is exploring career options in Commerce and is unsure between CA, MBA, and finance roles. Needs a counsellor to help map aptitude to career paths.", education: "Class XI — Commerce Stream", skills: "Career Counselling (Finance & Business)", availability: "Hybrid, flexible timing", distance: "1.2 km from your location" },
  // 5
  { id: "yd-05", name: "Taniya Rawati", type: "blue", icon: "wrench", pillar: "skill_workshop", location: { lat: pickArea(4).lat, lng: pickArea(4).lng }, area: pickArea(4).area, contact: "direct", description: "Class XII student interested in public speaking skills.", relevance: "Student has identified communication skills as a development area in the assessment. Looking for a structured workshop rather than ongoing coaching.", education: "Class XII — Arts Stream", skills: "Public Speaking & Communication Skills", availability: "In-person, weekend workshop", distance: "0.9 km from your location" },
  // 6
  { id: "yd-06", name: "Nirmal Grover", type: "blue", icon: "book", pillar: "subject_tutoring", location: { lat: pickArea(5).lat, lng: pickArea(5).lng }, area: pickArea(5).area, contact: "direct", description: "Class X student struggling with Mathematics.", relevance: "Class X student struggling with Mathematics ahead of board exams. Seeks regular weekly sessions to build fundamentals and problem-solving speed.", education: "Class X — All Streams", skills: "Mathematics Tutoring", availability: "In-person, weekday mornings", distance: "4.2 km from your location" },
  // 7
  { id: "yd-07", name: "Deepti Pathak", type: "blue", icon: "graduationCap", pillar: "college_admissions", location: { lat: pickArea(6).lat, lng: pickArea(6).lng }, area: pickArea(6).area, contact: "direct", description: "Class XII Commerce student seeking BBA/Economics admissions guidance.", relevance: "High-capability Commerce student seeking guidance on top BBA and Economics programmes. Has a clear interest but needs help with college shortlisting and statement of purpose.", education: "Class XII — Commerce Stream", skills: "College Admissions Guidance (BBA / Economics)", availability: "Online preferred, evening slots", distance: "5.7 km from your location" },
  // 8
  { id: "yd-08", name: "Keshav Singha", type: "blue", icon: "clipboard", pillar: "exam_prep", location: { lat: pickArea(7).lat, lng: pickArea(7).lng }, area: pickArea(7).area, contact: "direct", description: "Class XII student preparing for NEET with Biology focus.", relevance: "NEET-aspiring student with strong Physics and Chemistry scores but needs focused Biology support. Prefers a subject specialist over a full coaching centre.", education: "Class XII — Science Stream", skills: "NEET Exam Prep (Biology focus)", availability: "In-person preferred, 3 days a week", distance: "3.1 km from your location" },
  // 9
  { id: "yd-09", name: "Meghan Tiwari", type: "blue", icon: "compass", pillar: "career_counselling", location: { lat: pickArea(8).lat, lng: pickArea(8).lng }, area: pickArea(8).area, contact: "direct", description: "Post-XII student exploring design and creative arts careers.", relevance: "Post-XII student with creative aptitude looking to explore design colleges and career paths. Needs counsellor with exposure to NID, NIFT and design-stream admissions.", education: "Post-XII", skills: "Career Counselling (Design & Creative Arts)", availability: "Online, flexible", distance: "6.3 km from your location" },
  // 10
  { id: "yd-10", name: "Hardik Joshii", type: "blue", icon: "book", pillar: "subject_tutoring", location: { lat: pickArea(9).lat, lng: pickArea(9).lng }, area: pickArea(9).area, contact: "direct", description: "Class XI student needing Organic Chemistry tutoring.", relevance: "Student has specifically flagged Organic Chemistry as a weak area. Looking for a tutor who can cover NCERT plus JEE-level problems in focused sessions.", education: "Class XI — Science Stream", skills: "Chemistry Tutoring (Organic)", availability: "In-person, weekday evenings", distance: "2.8 km from your location" },
  // 11
  { id: "yd-11", name: "Ishita Chopra", type: "blue", icon: "wrench", pillar: "skill_workshop", location: { lat: pickArea(10).lat, lng: pickArea(10).lng }, area: pickArea(10).area, contact: "direct", description: "Class XI student interested in creative writing.", relevance: "Student is building a writing portfolio for humanities college applications. Interested in a structured 4–6 week writing workshop rather than one-on-one coaching.", education: "Class XI — Arts Stream", skills: "Creative Writing Workshop", availability: "Weekend, group session preferred", distance: "1.5 km from your location" },
  // 12
  { id: "yd-12", name: "Jaydev Mishra", type: "blue", icon: "clipboard", pillar: "exam_prep", location: { lat: pickArea(11).lat, lng: pickArea(11).lng }, area: pickArea(11).area, contact: "direct", description: "Class XII student preparing for JEE Advanced.", relevance: "Strong student targeting JEE Advanced with a specific need for Calculus and Electrostatics coaching. Wants a specialist, not a general coaching centre.", education: "Class XII — Science Stream", skills: "JEE Advanced Exam Prep", availability: "In-person, intensive weekend sessions", distance: "4.6 km from your location" },
  // 13
  { id: "yd-13", name: "Laksha Nayyar", type: "blue", icon: "graduationCap", pillar: "college_admissions", location: { lat: pickArea(12).lat, lng: pickArea(12).lng }, area: pickArea(12).area, contact: "direct", description: "Class XII Arts student seeking law/CLAT admissions guidance.", relevance: "Student is preparing for CLAT alongside board exams and needs guidance on law college options and entrance strategy. Counsellor with CLAT exposure preferred.", education: "Class XII — Arts Stream", skills: "College Admissions Guidance (Law / CLAT)", availability: "Hybrid, weekends", distance: "2.3 km from your location" },
  // 14
  { id: "yd-14", name: "Omveer Bhagat", type: "blue", icon: "book", pillar: "subject_tutoring", location: { lat: pickArea(13).lat, lng: pickArea(13).lng }, area: pickArea(13).area, contact: "direct", description: "Class IX student needing foundational science tutoring.", relevance: "Class IX student building foundational science concepts before stream selection. Needs a patient tutor who can strengthen basics across Physics and Chemistry simultaneously.", education: "Class IX", skills: "Science Tutoring (Physics + Chemistry)", availability: "In-person, 3 days a week after school", distance: "5.9 km from your location" },
  // 15
  { id: "yd-15", name: "Qamira Faridi", type: "blue", icon: "compass", pillar: "career_counselling", location: { lat: pickArea(14).lat, lng: pickArea(14).lng }, area: pickArea(14).area, contact: "direct", description: "Post-XII student with entrepreneurial interest.", relevance: "High-capability post-XII student with strong entrepreneurial interest. Looking for a mentor-counsellor who can guide on gap year options, incubators, and early startup exposure.", education: "Post-XII", skills: "Career Counselling (Entrepreneurship / Startups)", availability: "Online, flexible evenings", distance: "2.0 km from your location" },
  // 16
  { id: "yd-16", name: "Ujjesh Wakhar", type: "blue", icon: "clipboard", pillar: "exam_prep", location: { lat: pickArea(15).lat, lng: pickArea(15).lng }, area: pickArea(15).area, contact: "direct", description: "Class XII NEET aspirant needing Physics coaching.", relevance: "NEET aspirant with Chemistry and Biology covered at school but needing dedicated Physics coaching. Seeking a tutor for focused topic-by-topic coverage over 8 weeks.", education: "Class XII — Science Stream", skills: "NEET Exam Prep (Physics focus)", availability: "In-person, daily 1.5-hour sessions", distance: "1.1 km from your location" },
  // 17
  { id: "yd-17", name: "Elisha Zarini", type: "blue", icon: "wrench", pillar: "skill_workshop", location: { lat: pickArea(16).lat, lng: pickArea(16).lng }, area: pickArea(16).area, contact: "direct", description: "Class XI Commerce student seeking Excel and data skills.", relevance: "Commerce student looking to build spreadsheet and data skills for future college and internship readiness. Prefers a practical, project-based workshop format.", education: "Class XI — Commerce Stream", skills: "Excel & Data Skills Workshop", availability: "Weekend, hands-on sessions", distance: "3.8 km from your location" },
  // 18
  { id: "yd-18", name: "Garima Yadava", type: "blue", icon: "book", pillar: "subject_tutoring", location: { lat: pickArea(17).lat, lng: pickArea(17).lng }, area: pickArea(17).area, contact: "direct", description: "Class X student needing English language support.", relevance: "Student needs support with English comprehension and writing ahead of Class X boards. Particularly weak in essay writing and unseen passage analysis.", education: "Class X", skills: "English Language & Grammar Tutoring", availability: "In-person, twice a week", distance: "2.6 km from your location" },
  // 19
  { id: "yd-19", name: "Chirag Yandev", type: "blue", icon: "graduationCap", pillar: "college_admissions", location: { lat: pickArea(18).lat, lng: pickArea(18).lng }, area: pickArea(18).area, contact: "direct", description: "Class XII student targeting MBBS at government medical colleges.", relevance: "Top-band student targeting MBBS at government medical colleges. Needs counsellor support on college preference lists, state vs. all-India quota strategy, and NEET score benchmarking.", education: "Class XII — Science Stream", skills: "College Admissions Guidance (Medicine / MBBS)", availability: "Online, weekend slots", distance: "7.2 km from your location" },
  // 20
  { id: "yd-20", name: "Bhakti Ansari", type: "blue", icon: "book", pillar: "subject_tutoring", location: { lat: pickArea(19).lat, lng: pickArea(19).lng }, area: pickArea(19).area, contact: "direct", description: "Class XI student needing Calculus and Algebra tutoring.", relevance: "Student has identified Calculus and Algebra as weak areas. Needs a tutor to cover Class XI NCERT and build problem-solving technique for JEE preparation.", education: "Class XI — Science Stream", skills: "Mathematics Tutoring (Calculus & Algebra)", availability: "In-person, weekday evenings", distance: "3.3 km from your location" },
  // 21
  { id: "yd-21", name: "Farhan Oberoi", type: "blue", icon: "compass", pillar: "career_counselling", location: { lat: pickArea(0).lat, lng: pickArea(0).lng }, area: pickArea(0).area, contact: "direct", description: "Class XI Commerce student seeking banking career guidance.", relevance: "Student from a Commerce background seeking clarity on career paths in banking and finance. Needs a counsellor to explain UPSC, banking exams, and private finance career options.", education: "Class XI — Commerce Stream", skills: "Career Counselling (Banking & Finance)", availability: "In-person, weekends", distance: "2.9 km from your location" },
  // 22
  { id: "yd-22", name: "Vikram Pathak", type: "blue", icon: "clipboard", pillar: "exam_prep", location: { lat: pickArea(1).lat, lng: pickArea(1).lng }, area: pickArea(1).area, contact: "direct", description: "Class XII student targeting 90%+ in board exams.", relevance: "Student targeting 90%+ in Class XII boards across Physics, Chemistry and Mathematics. Looking for a single tutor who can consolidate all three subjects in a structured revision plan.", education: "Class XII — Science Stream", skills: "Board Exam Prep (PCM)", availability: "In-person, 4 days a week", distance: "4.1 km from your location" },
  // 23
  { id: "yd-23", name: "Wasima Dahiya", type: "blue", icon: "wrench", pillar: "skill_workshop", location: { lat: pickArea(2).lat, lng: pickArea(2).lng }, area: pickArea(2).area, contact: "direct", description: "Post-XII student preparing for college interviews.", relevance: "Post-XII student preparing for college interviews and group discussions. Needs a structured personality development and spoken English programme before college begins.", education: "Post-XII", skills: "Spoken English & Personality Development", availability: "Group workshop, weekends", distance: "6.0 km from your location" },
  // 24
  { id: "yd-24", name: "Xitali Ekvira", type: "blue", icon: "book", pillar: "subject_tutoring", location: { lat: pickArea(3).lat, lng: pickArea(3).lng }, area: pickArea(3).area, contact: "direct", description: "Class XII student needing Biology tutoring.", relevance: "Student has identified Genetics and Ecology as specific weak chapters. Looking for a Biology specialist who can cover NEET-level MCQs alongside board preparation.", education: "Class XII — Science Stream", skills: "Biology Tutoring (Genetics & Ecology)", availability: "In-person, twice a week", distance: "1.6 km from your location" },
  // 25
  { id: "yd-25", name: "Zaheer Hashmi", type: "blue", icon: "graduationCap", pillar: "college_admissions", location: { lat: pickArea(4).lat, lng: pickArea(4).lng }, area: pickArea(4).area, contact: "direct", description: "Class XII Arts student interested in Mass Communication.", relevance: "Student interested in Mass Communication and Journalism. Needs a counsellor with knowledge of IIMC, Symbiosis, and other media school entrance processes.", education: "Class XII — Arts Stream", skills: "College Admissions Guidance (Mass Comm / Journalism)", availability: "Online, flexible", distance: "2.7 km from your location" },
  // 26
  { id: "yd-26", name: "Yogesh Kapoor", type: "blue", icon: "clipboard", pillar: "exam_prep", location: { lat: pickArea(5).lat, lng: pickArea(5).lng }, area: pickArea(5).area, contact: "direct", description: "Class XI student preparing for Physics and Maths Olympiads.", relevance: "High-capability student aiming for Physics and Maths Olympiads. Needs a coach who can go beyond NCERT into olympiad-level problem sets and reasoning techniques.", education: "Class XI — Science Stream", skills: "Olympiad Prep (Physics & Maths)", availability: "In-person, weekend intensive", distance: "2.2 km from your location" },
  // 27
  { id: "yd-27", name: "Ankita Lambha", type: "blue", icon: "compass", pillar: "career_counselling", location: { lat: pickArea(6).lat, lng: pickArea(6).lng }, area: pickArea(6).area, contact: "direct", description: "Class XII Commerce student considering CA career.", relevance: "Student is seriously considering CA as a career and needs a counsellor to explain the CPT/Foundation route, articleship timelines, and CA vs. MBA trade-offs.", education: "Class XII — Commerce Stream", skills: "Career Counselling (Chartered Accountancy)", availability: "Online, evenings", distance: "5.5 km from your location" },
  // 28
  { id: "yd-28", name: "Bharat Taneja", type: "blue", icon: "book", pillar: "subject_tutoring", location: { lat: pickArea(7).lat, lng: pickArea(7).lng }, area: pickArea(7).area, contact: "direct", description: "Class IX student needing Algebra and Geometry help.", relevance: "Class IX student significantly behind in Algebra and Geometry. Needs a patient tutor to rebuild fundamentals and catch up before the year-end examination.", education: "Class IX", skills: "Mathematics Tutoring (Algebra & Geometry)", availability: "In-person, 3 days a week", distance: "0.8 km from your location" },
  // 29
  { id: "yd-29", name: "Charvi Sindhu", type: "blue", icon: "wrench", pillar: "skill_workshop", location: { lat: pickArea(8).lat, lng: pickArea(8).lng }, area: pickArea(8).area, contact: "direct", description: "Class XII Arts student building a design portfolio.", relevance: "Student is building a design portfolio for college applications to NID and NIFT. Looking for a mentor who can guide portfolio development over 6–8 weeks.", education: "Class XII — Arts Stream", skills: "Graphic Design & Visual Communication Workshop", availability: "Weekend, project-based sessions", distance: "3.5 km from your location" },
  // 30
  { id: "yd-30", name: "Deepak Maurya", type: "blue", icon: "clipboard", pillar: "exam_prep", location: { lat: pickArea(9).lat, lng: pickArea(9).lng }, area: pickArea(9).area, contact: "direct", description: "Class XII student needing Chemistry coaching for JEE Mains.", relevance: "Student has strong Maths but needs Chemistry coaching specifically for JEE Mains. Looking for a Chemistry specialist for a focused 6-week revision sprint.", education: "Class XII — Science Stream", skills: "JEE Mains Exam Prep (Chemistry focus)", availability: "In-person, weekday evenings", distance: "1.9 km from your location" },
  // 31
  { id: "yd-31", name: "Ekvira Rajput", type: "blue", icon: "graduationCap", pillar: "college_admissions", location: { lat: pickArea(10).lat, lng: pickArea(10).lng }, area: pickArea(10).area, contact: "direct", description: "Class XII Commerce student targeting Hotel Management colleges.", relevance: "Student is targeting Hotel Management colleges including IHM and Welcomgroup. Needs counsellor guidance on entrance exam strategy, college selection, and interview preparation.", education: "Class XII — Commerce Stream", skills: "College Admissions Guidance (Hotel Management)", availability: "Hybrid, weekends", distance: "6.8 km from your location" },
  // 32
  { id: "yd-32", name: "Farzan Nagpal", type: "blue", icon: "book", pillar: "subject_tutoring", location: { lat: pickArea(11).lat, lng: pickArea(11).lng }, area: pickArea(11).area, contact: "direct", description: "Class X student needing History and Geography support.", relevance: "Student needs targeted support in History and Geography ahead of Class X boards. Looking for a tutor who can cover NCERT comprehensively with map work and answer writing practice.", education: "Class X", skills: "Social Science Tutoring (History & Geography)", availability: "In-person, twice a week", distance: "3.0 km from your location" },
  // 33
  { id: "yd-33", name: "Gaurav Oberoi", type: "blue", icon: "compass", pillar: "career_counselling", location: { lat: pickArea(12).lat, lng: pickArea(12).lng }, area: pickArea(12).area, contact: "direct", description: "Post-XII student considering UPSC preparation.", relevance: "Post-XII student considering a UPSC preparation path but unclear on timing, optional subjects, and coaching vs. self-study trade-offs. Needs structured career counselling before committing.", education: "Post-XII", skills: "Career Counselling (Government Jobs / UPSC)", availability: "In-person, weekends", distance: "2.4 km from your location" },
  // 34
  { id: "yd-34", name: "Hitesh Pandey", type: "blue", icon: "wrench", pillar: "skill_workshop", location: { lat: pickArea(13).lat, lng: pickArea(13).lng }, area: pickArea(13).area, contact: "direct", description: "Class XI student interested in Python programming.", relevance: "High-capability student interested in computer science and data science. Looking for a practical Python coding workshop to build a project portfolio alongside board preparation.", education: "Class XI — Science Stream", skills: "Coding & Python Programming Workshop", availability: "Online, weekday evenings", distance: "4.4 km from your location" },
  // 35
  { id: "yd-35", name: "Ishwar Qasimi", type: "blue", icon: "clipboard", pillar: "exam_prep", location: { lat: pickArea(14).lat, lng: pickArea(14).lng }, area: pickArea(14).area, contact: "direct", description: "Class XII student targeting 85%+ in board exams (PCB).", relevance: "Student targeting 85%+ in Class XII boards in Physics, Chemistry and Biology. Needs a tutor to consolidate revision across all three subjects in the final 10-week sprint.", education: "Class XII — Science Stream", skills: "Board Exam Prep (PCB)", availability: "In-person, 4 days a week", distance: "2.0 km from your location" },
  // 36
  { id: "yd-36", name: "Jasika Waseem", type: "blue", icon: "graduationCap", pillar: "college_admissions", location: { lat: pickArea(15).lat, lng: pickArea(15).lng }, area: pickArea(15).area, contact: "direct", description: "Class XII Arts student seeking Psychology Honours guidance.", relevance: "Student with strong aptitude for social sciences wants to pursue Psychology Honours. Needs counsellor to navigate Cotton, Gauhati University, and Tezpur University options and cut-off strategy.", education: "Class XII — Arts Stream", skills: "College Admissions Guidance (Psychology)", availability: "Online, evenings", distance: "3.2 km from your location" },
  // 37
  { id: "yd-37", name: "Kirthi Bhupat", type: "blue", icon: "book", pillar: "subject_tutoring", location: { lat: pickArea(16).lat, lng: pickArea(16).lng }, area: pickArea(16).area, contact: "direct", description: "Class XI student needing Mechanics and Waves tutoring.", relevance: "Student has identified Mechanics and Waves as problem areas. Needs a tutor to patiently cover conceptual foundations before moving to numerical problem-solving.", education: "Class XI — Science Stream", skills: "Physics Tutoring (Mechanics & Waves)", availability: "In-person, weekday evenings", distance: "1.4 km from your location" },
  // 38
  { id: "yd-38", name: "Lakshv Chopra", type: "blue", icon: "compass", pillar: "career_counselling", location: { lat: pickArea(17).lat, lng: pickArea(17).lng }, area: pickArea(17).area, contact: "direct", description: "Class XI Commerce student interested in digital marketing.", relevance: "Student is interested in digital media and marketing but unsure how to build a career path from a Commerce background. Needs a counsellor with industry exposure in this domain.", education: "Class XI — Commerce Stream", skills: "Career Counselling (Digital Marketing & Media)", availability: "Online, flexible", distance: "6.1 km from your location" },
  // 39
  { id: "yd-39", name: "Mahesh Dubery", type: "blue", icon: "wrench", pillar: "skill_workshop", location: { lat: pickArea(18).lat, lng: pickArea(18).lng }, area: pickArea(18).area, contact: "direct", description: "Class XII Arts student auditioning for performing arts colleges.", relevance: "Student is auditioning for performing arts college programmes and needs workshop-based preparation in theatre, voice, and stage presence. Looking for a practitioner-coach rather than a theory teacher.", education: "Class XII — Arts Stream", skills: "Theatre & Performing Arts Workshop", availability: "Weekend, group format", distance: "3.7 km from your location" },
  // 40
  { id: "yd-40", name: "Nirmal Ezhara", type: "blue", icon: "clipboard", pillar: "exam_prep", location: { lat: pickArea(19).lat, lng: pickArea(19).lng }, area: pickArea(19).area, contact: "direct", description: "Class XI student starting JEE foundation prep.", relevance: "Class XI student starting JEE preparation early and looking for a Maths specialist to build a strong foundation in Algebra, Trigonometry and Coordinate Geometry in Year 1.", education: "Class XI — Science Stream", skills: "JEE Foundation Prep (Maths)", availability: "In-person, weekday evenings", distance: "2.3 km from your location" },
  // 41
  { id: "yd-41", name: "Ompala Fardev", type: "blue", icon: "graduationCap", pillar: "college_admissions", location: { lat: pickArea(0).lat, lng: pickArea(0).lng }, area: pickArea(0).area, contact: "direct", description: "Class XII student targeting B.Arch programmes.", relevance: "Student is targeting B.Arch programmes and needs counsellor guidance on NATA preparation strategy, college options, and portfolio development alongside board exams.", education: "Class XII — Science Stream", skills: "College Admissions Guidance (Architecture / B.Arch)", availability: "Hybrid, weekends", distance: "5.3 km from your location" },
  // 42
  { id: "yd-42", name: "Pranav Gaurav", type: "blue", icon: "book", pillar: "subject_tutoring", location: { lat: pickArea(1).lat, lng: pickArea(1).lng }, area: pickArea(1).area, contact: "direct", description: "Class X student needing Chemistry coaching for boards.", relevance: "Class X student needs targeted Chemistry coaching for boards. Particularly weak in Chemical Reactions and Carbon Compounds. Looking for a tutor who can focus on these chapters specifically.", education: "Class X", skills: "Science Tutoring (Chemistry)", availability: "In-person, twice a week", distance: "1.0 km from your location" },
  // 43
  { id: "yd-43", name: "Qaiser Hitesh", type: "blue", icon: "compass", pillar: "career_counselling", location: { lat: pickArea(2).lat, lng: pickArea(2).lng }, area: pickArea(2).area, contact: "direct", description: "Post-XII student interested in sports management.", relevance: "Post-XII student with active interest in sports and physical fitness exploring formal career paths in sports management, coaching, and physical education. Needs a counsellor with knowledge of LNIPE and sports management colleges.", education: "Post-XII", skills: "Career Counselling (Sports Management & Physical Education)", availability: "In-person, weekends", distance: "3.6 km from your location" },
  // 44
  { id: "yd-44", name: "Rajdev Jasika", type: "blue", icon: "wrench", pillar: "skill_workshop", location: { lat: pickArea(3).lat, lng: pickArea(3).lng }, area: pickArea(3).area, contact: "direct", description: "Class XI Commerce student seeking financial literacy workshop.", relevance: "High-capability Commerce student looking to build practical financial literacy beyond the textbook. Interested in a workshop covering personal finance, stock markets, and basic investment principles.", education: "Class XI — Commerce Stream", skills: "Financial Literacy & Investment Basics Workshop", availability: "Online, weekend sessions", distance: "2.6 km from your location" },
  // 45
  { id: "yd-45", name: "Sakshi Madhav", type: "blue", icon: "clipboard", pillar: "exam_prep", location: { lat: pickArea(4).lat, lng: pickArea(4).lng }, area: pickArea(4).area, contact: "direct", description: "Class XII NEET aspirant needing Chemistry coaching.", relevance: "NEET aspirant who needs to significantly improve Chemistry scores. Has covered basics at school but needs structured problem-solving coaching from a NEET-specialist tutor.", education: "Class XII — Science Stream", skills: "NEET Exam Prep (Chemistry focus)", availability: "In-person, 3 days a week", distance: "3.9 km from your location" },
  // 46
  { id: "yd-46", name: "Tripti Nirmal", type: "blue", icon: "graduationCap", pillar: "college_admissions", location: { lat: pickArea(5).lat, lng: pickArea(5).lng }, area: pickArea(5).area, contact: "direct", description: "Class XII Commerce student targeting Economics Honours at Cotton University.", relevance: "Student targeting Economics Honours at top Guwahati colleges. Needs counsellor guidance on cut-off trends, college preference lists, ECA quota options, and CUET strategy.", education: "Class XII — Commerce Stream", skills: "College Admissions Guidance (Economics Honours / Cotton)", availability: "Online, evenings", distance: "1.7 km from your location" },
  // 47
  { id: "yd-47", name: "Ujjwal Ompala", type: "blue", icon: "book", pillar: "subject_tutoring", location: { lat: pickArea(6).lat, lng: pickArea(6).lng }, area: pickArea(6).area, contact: "direct", description: "Class XI student needing Electrostatics tutoring.", relevance: "Student has identified Electrostatics and Current Electricity as weak areas. Wants a Physics tutor to cover these two units in depth with numerical practice for both boards and JEE.", education: "Class XI — Science Stream", skills: "Physics Tutoring (Electrostatics & Current Electricity)", availability: "In-person, weekday evenings", distance: "2.5 km from your location" },
  // 48
  { id: "yd-48", name: "Vikash Pranav", type: "blue", icon: "compass", pillar: "career_counselling", location: { lat: pickArea(7).lat, lng: pickArea(7).lng }, area: pickArea(7).area, contact: "direct", description: "Class XII Arts student interested in social work.", relevance: "Student has a strong social orientation and wants to understand career options in the development and NGO sector. Needs a counsellor with knowledge of TISS, social work programmes, and fellowship pathways.", education: "Class XII — Arts Stream", skills: "Career Counselling (Social Work & NGO Sector)", availability: "Online, flexible", distance: "1.9 km from your location" },
  // 49
  { id: "yd-49", name: "Waqari Qaseem", type: "blue", icon: "wrench", pillar: "skill_workshop", location: { lat: pickArea(8).lat, lng: pickArea(8).lng }, area: pickArea(8).area, contact: "direct", description: "Class XI student interested in robotics and electronics.", relevance: "High-capability student interested in engineering and robotics looking for a hands-on electronics and Arduino-based robotics workshop to build a project portfolio before JEE counselling.", education: "Class XI — Science Stream", skills: "Robotics & Electronics Workshop", availability: "Weekend, hands-on lab sessions", distance: "5.8 km from your location" },
  // 50
  { id: "yd-50", name: "Xander Bhakti", type: "blue", icon: "clipboard", pillar: "exam_prep", location: { lat: pickArea(9).lat, lng: pickArea(9).lng }, area: pickArea(9).area, contact: "direct", description: "Class XII student needing language subject coaching.", relevance: "Student needs language subject coaching for Class XII boards. Weak in essay writing, letter formats, and Hindi grammar. Looking for a language tutor for final-month intensive preparation.", education: "Class XII — Science Stream", skills: "Board Exam Prep (English + Hindi)", availability: "In-person, twice a week", distance: "2.8 km from your location" },
];

// Apply small jitter so co-located dots don't overlap perfectly on the map.
dots.forEach((dot, i) => {
  const seed = (i * 9301 + 49297) % 233280;
  const r1 = (seed / 233280 - 0.5) * 0.012;
  const r2 = (((seed * 1.7) % 233280) / 233280 - 0.5) * 0.012;
  dot.location = { lat: dot.location.lat + r1, lng: dot.location.lng + r2 };
});

// Anonymize names: "Prisha Sharma" → "P####a S####a"
function anonymizeName(name: string): string {
  return name
    .split(" ")
    .map((word) => {
      if (word.length <= 2) return word;
      return word[0] + "#".repeat(word.length - 2) + word[word.length - 1];
    })
    .join(" ");
}

dots.forEach((dot) => {
  dot.name = anonymizeName(dot.name);
});

// Guwahati city centre.
export const GUWAHATI_CENTER: [number, number] = [26.1445, 91.7362];
export const DEFAULT_ZOOM = 12;
export const MIN_ZOOM = 9;
export const MAX_ZOOM = 17;

export const PILLAR_LABELS: Record<Pillar, string> = {
  subject_tutoring: "Subject Tutoring",
  career_counselling: "Career Counselling",
  college_admissions: "College Admissions",
  skill_workshop: "Skill Workshop",
  exam_prep: "Exam Prep",
};

export const DEVENDRA_LOCATION: { lat: number; lng: number; label: string } = {
  lat: 26.1626,
  lng: 91.7780,
  label: "Your Location",
};

export const PILLAR_CLASSES: Record<Pillar, string> = {
  subject_tutoring: "pillar-subject_tutoring",
  career_counselling: "pillar-career_counselling",
  college_admissions: "pillar-college_admissions",
  skill_workshop: "pillar-skill_workshop",
  exam_prep: "pillar-exam_prep",
};

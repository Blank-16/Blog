export const personal = {
  name: "Ansuman Pal",
  role: "Full-Stack Developer",
  tagline: "I build fast, scalable, AI-integrated software.",
  bio: "Full-Stack Developer and Systems Programmer specialising in TypeScript, Java, and Python. I build AI-integrated web apps and resource-efficient CLI utilities. Currently pursuing a B.Tech in Computer Science at Lovely Professional University and seeking internships and job opportunities.",
  email: "ansumanpal16@gmail.com",
  phone: "",
  location: "Asansol, West Bengal — India",
  availability: true,
  resumeUrl: "/resume.pdf",
  social: {
    github: "https://github.com/Blank-16",
    linkedin: "https://www.linkedin.com/in/ansuman-pal16/",
    twitter: "",
  },
};

export type Project = {
  id: string;
  title: string;
  description: string;
  challenge?: string;
  solution?: string;
  tags: string[];
  image: string;
  liveUrl?: string;
  repoUrl?: string;
  featured: boolean;
  year: number;
};

export const projects: Project[] = [
  {
    id: "blogging-platform",
    title: "Full-Stack Blogging Platform",
    description:
      "High-performance Next.js 15 blogging platform with Hybrid ISR, headless Tiptap editor, and a canvas-based image compressor that cuts upload payloads by 85%.",
    challenge:
      "Building a modern web application that balances high performance (SEO & speed) with a dynamic, user-friendly editing experience — without sacrificing either side of that trade-off.",
    solution:
      "I architected the platform on the Next.js 15 App Router with Hybrid ISR: the top 20 trending posts are pre-rendered for instant loading, while new posts are generated on-demand and cached automatically. I built a client-side Canvas API image compressor that reduces upload payloads by 85%, cutting both storage costs and latency. An automated SEO pipeline handles dynamic JSON-LD structured data, metadata generation, and auto-syncing sitemaps.",
    tags: [
      "Next.js 15",
      "TypeScript",
      "Appwrite",
      "Redux Toolkit",
      "Tailwind CSS v4",
      "GSAP",
    ],
    image: "/projects/blog.png",
    liveUrl: undefined,
    repoUrl: "https://github.com/Blank-16/Blog",
    featured: true,
    year: 2026,
  },
  {
    id: "java-shell",
    title: "Java-Shell: Linux Terminal Simulator",
    description:
      "Cross-platform Java CLI simulating a full Linux environment with 40+ commands, built on Command & Registry patterns and containerised in a 285 MB multi-stage Docker image.",
    challenge:
      "Windows environments often lack the native feel of a Linux terminal. The goal was a system-level tool that bridges this gap while staying highly extensible for new commands without touching core logic.",
    solution:
      "I applied the Command and Registry design patterns so new CLI operations can be plugged in independently. I implemented 40+ commands covering file I/O, networking utilities, and process simulations. Multi-stage Docker builds stripped the final image to 285 MB, keeping the tool portable and lightweight across environments.",
    tags: ["Java (LTS)", "Maven", "Docker", "OOP Design Patterns"],
    image: "/projects/jshell.png",
    liveUrl: undefined,
    repoUrl: "https://github.com/Blank-16/J-Shell",
    featured: true,
    year: 2025,
  },
  {
    id: "ai-resume-builder",
    title: "AI-Powered Resume Builder",
    description:
      "MERN-stack resume builder integrating Google Gemini API for AI content suggestions, backed by a denormalised MongoDB schema that retrieves complex documents in a single DB read.",
    challenge:
      "Users struggle with professional phrasing and content optimisation when building resumes, and typical solutions require multiple slow round-trips to assemble a complete document.",
    solution:
      "I built a full-stack MERN application with real-time editing and a responsive UI. Google Gemini API analyses user input and suggests professional enhancements — improving content quality by an estimated 40%. A denormalised MongoDB schema using the Single-Document pattern retrieves even deeply nested resumes (experience, education, skills arrays) in a single DB read, delivering a seamless low-latency experience.",
    tags: [
      "React.js",
      "Node.js",
      "Express",
      "MongoDB",
      "Google Gemini API",
      "REST APIs",
    ],
    image: "/projects/resume.png",
    liveUrl: undefined,
    repoUrl: "https://github.com/Blank-16/Resume-Builder",
    featured: true,
    year: 2025,
  },
  {
    id: "disk-usage-analyzer",
    title: "Disk Usage Analyzer CLI",
    description:
      "System-level Python utility that ranks disk usage across directory trees using a Min-Heap priority queue, with permission-safe traversal and a real-time terminal UI.",
    tags: ["Python", "OS APIs", "Data Structures"],
    image: "/projects/disk-analyzer.png",
    liveUrl: undefined,
    repoUrl: "https://github.com/Blank-16/Disk-Usage-Script",
    featured: false,
    year: 2026,
  },
];

// Core skills shown with evidence — what you actually built with them.
// Keep this to 6–8 entries max; these get the most visual weight.
export type CoreSkill = {
  name: string;
  proof: string; // one tight sentence: what you built / how you used it
};

export const coreSkills: CoreSkill[] = [
  {
    name: "TypeScript / Next.js",
    proof:
      "Primary stack across all projects — App Router, Hybrid ISR, server actions, strict generics, mapped types.",
  },
  {
    name: "Java",
    proof:
      "Built a 40+ command Linux terminal simulator using Command & Registry design patterns, packaged with Maven.",
  },
  {
    name: "React",
    proof:
      "Real-time resume editor with Redux Toolkit, custom hooks, code-split lazy loading, and Gemini API integration.",
  },
  {
    name: "Node.js / Express",
    proof:
      "REST API backend for the resume builder — auth, file handling, and Google Gemini API proxy in production.",
  },
  {
    name: "Python",
    proof:
      "Disk usage CLI using OS APIs and a Min-Heap priority queue for ranked tree traversal with a live terminal UI.",
  },
  {
    name: "Appwrite",
    proof:
      "Full BaaS integration — auth, database, storage, and server-side SDK running on Vercel in production.",
  },
  {
    name: "MongoDB",
    proof:
      "Denormalised Single-Document schema retrieving fully nested resumes (experience, education, skills) in one read.",
  },
  {
    name: "Docker",
    proof:
      "Multi-stage build shrinking the Java-Shell image to 285 MB for portable cross-platform deployment.",
  },
];

// Everything else — grouped by usage context, no bars, no percentages.
export type SkillGroup = {
  context: "primary" | "secondary" | "familiar";
  // primary   → reach for these every day
  // secondary → shipped in production, not daily
  // familiar  → can use when needed, picking up fast
  items: string[];
};

export const skillGroups: SkillGroup[] = [
  {
    context: "primary",
    items: [
      "TypeScript",
      "React",
      "Next.js",
      "Tailwind CSS",
      "Node.js",
      "Git",
      "Linux / WSL",
      "REST APIs",
      "Appwrite",
    ],
  },
  {
    context: "secondary",
    items: [
      "Java",
      "Python",
      "MongoDB",
      "Docker",
      "Express",
      "PostgreSQL",
      "Redux Toolkit",
      "Maven",
      "Vercel",
    ],
  },
  {
    context: "familiar",
    items: ["C++", "C", "MySQL", "GraphQL"],
  },
];

export type Certificate = {
  id: string;
  title: string;
  issuer: string;
  date: string;
  credentialUrl?: string;
  logoUrl?: string;
};

export const certificates: Certificate[] = [
  {
    id: "frontend-react-hackerrank",
    title: "Frontend Developer (React)",
    issuer: "HackerRank",
    date: "2026",
    credentialUrl: "https://www.hackerrank.com/certificates/406b457f1a99",
    logoUrl: "/certs/react-hackerrank.png",
  },
  {
    id: "js-intermediate-hackerrank",
    title: "JavaScript (Intermediate)",
    issuer: "HackerRank",
    date: "2026",
    credentialUrl: "https://www.hackerrank.com/certificates/09443c5f7995",
    logoUrl: "/certs/js-hackerrank.png",
  },
  {
    id: "digital-skills-social-media",
    title: "Digital Skills: Social Media",
    issuer: "Accenture",
    date: "2026",
    logoUrl: "/certs/social-media-accenture.png",
    credentialUrl:
      "https://drive.google.com/file/d/1LFdKy0CTk9ZFzAkhoxO_ubKNWS_c6GRG/view?usp=sharing",
  },
  {
    id: "cloud-computing-nptel",
    title: "Cloud Computing",
    issuer: "NPTEL",
    date: "2025",
    credentialUrl:
      "https://drive.google.com/file/d/144NoG5Rs9JISqDelsF8CLLmKJ4q-sHk6/view?usp=sharing",
    logoUrl: "/certs/nptel-cloud-computing.png",
  },
  {
    id: "bits-&-bytes-of-computer-networking",
    title: "Bits & Bytes of Computer Networking",
    issuer: "Coursera -> Google",
    date: "2024",
    credentialUrl:
      "https://drive.google.com/file/d/1gFmzics_1jLqIRKAm172Z-bwf6bN2IDC/view?usp=sharing",
    logoUrl: "/certs/bits&bytes-of-comptuer-networking.png",
  },
  {
    id: "gen-ai-coursera",
    title: "Master Generative AI & Tools",
    issuer: "Coursera",
    date: "2024",
    credentialUrl:
      "https://drive.google.com/file/d/1MDRVMYX5eDXd-XkOGGJr9s4Si3PhViRH/view?usp=sharing",
    logoUrl: "/certs/master-genai-udemy.png",
  },
];

export type Achievement = {
  id: string;
  title: string;
  desc: string;
};

export const achievements: Achievement[] = [
  {
    id: "competitive-programming",
    title: "200+ Problems Solved",
    desc: "Solved 200+ problems across LeetCode, GeeksforGeeks, and HackerRank.",
  },
  {
    id: "leetcode-rating",
    title: "LeetCode 1500+ Rating",
    desc: "Achieved a 1500+ contest rating, placing in the top tier of active competitors.",
  },
  {
    id: "hackerrank-stars",
    title: "HackerRank 5-Star Python",
    desc: "Attained a 5-Star rating in Python and Gold Badges in Problem Solving.",
  },
];

export const navLinks = [
  { label: "about", href: "#about" },
  { label: "projects", href: "#projects" },
  { label: "skills", href: "#skills" },
  { label: "contact", href: "#contact" },
];

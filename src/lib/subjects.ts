// EduFlix subject taxonomy.
// Each subject maps to educational topics and a TMDB search query used to
// surface relevant documentaries, series and films.

import {
  Atom,
  Sigma,
  Cpu,
  Cog,
  Landmark,
  HeartPulse,
  Briefcase,
  Palette,
  Leaf,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

export interface Subject {
  slug: string;
  name: string;
  group: string;
  icon: LucideIcon;
  blurb: string;
  query: string; // TMDB search seed
  topics: string[];
}

export const LEARNING_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional",
] as const;
export type LearningLevel = (typeof LEARNING_LEVELS)[number];

export const LEARNING_FORMATS = [
  "Documentary",
  "TV Series",
  "Movie",
  "Mini Series",
  "Biography",
  "Based on Real Events",
] as const;
export type LearningFormat = (typeof LEARNING_FORMATS)[number];

export const SUBJECTS: Subject[] = [
  {
    slug: "biology",
    name: "Biology",
    group: "Science",
    icon: Atom,
    blurb: "Life, cells, genetics and the living world.",
    query: "biology life nature",
    topics: ["Cells", "Genetics", "Evolution", "Human Body", "Plants", "Ecology", "DNA", "Microorganisms"],
  },
  {
    slug: "chemistry",
    name: "Chemistry",
    group: "Science",
    icon: Atom,
    blurb: "Elements, reactions and molecular science.",
    query: "chemistry elements science",
    topics: ["Atoms", "Reactions", "Periodic Table", "Organic Chemistry", "Materials"],
  },
  {
    slug: "physics",
    name: "Physics",
    group: "Science",
    icon: Atom,
    blurb: "Forces, energy and the laws of the universe.",
    query: "physics universe quantum",
    topics: ["Mechanics", "Quantum", "Relativity", "Energy", "Electromagnetism"],
  },
  {
    slug: "astronomy",
    name: "Astronomy",
    group: "Science",
    icon: Atom,
    blurb: "Space, stars, planets and cosmology.",
    query: "space universe cosmos",
    topics: ["Solar System", "Stars", "Black Holes", "Galaxies", "Cosmology", "Space Exploration"],
  },
  {
    slug: "genetics",
    name: "Genetics",
    group: "Science",
    icon: Atom,
    blurb: "DNA, heredity and the code of life.",
    query: "dna genetics genome",
    topics: ["DNA", "Heredity", "Gene Editing", "Mutations", "Genomics"],
  },
  {
    slug: "environmental-science",
    name: "Environmental Science",
    group: "Science",
    icon: Leaf,
    blurb: "Ecosystems, climate and our planet.",
    query: "nature planet earth ecosystem",
    topics: ["Ecosystems", "Biodiversity", "Pollution", "Oceans", "Climate"],
  },
  {
    slug: "mathematics",
    name: "Mathematics",
    group: "Mathematics",
    icon: Sigma,
    blurb: "Numbers, patterns, logic and proofs.",
    query: "mathematics numbers",
    topics: ["Algebra", "Geometry", "Calculus", "Statistics", "Probability"],
  },
  {
    slug: "computer-science",
    name: "Computer Science",
    group: "Technology",
    icon: Cpu,
    blurb: "Algorithms, systems and how computers think.",
    query: "computer technology internet",
    topics: ["Algorithms", "Databases", "Networking", "Operating Systems", "Cybersecurity"],
  },
  {
    slug: "artificial-intelligence",
    name: "Artificial Intelligence",
    group: "Technology",
    icon: Cpu,
    blurb: "Machine learning, neural nets and the future of AI.",
    query: "artificial intelligence robots",
    topics: ["Machine Learning", "Neural Networks", "Robotics", "Ethics of AI", "Automation"],
  },
  {
    slug: "cybersecurity",
    name: "Cybersecurity",
    group: "Technology",
    icon: Cpu,
    blurb: "Hackers, privacy and digital defense.",
    query: "hacking cyber security internet",
    topics: ["Hacking", "Encryption", "Privacy", "Cyber Warfare", "Networks"],
  },
  {
    slug: "engineering",
    name: "Engineering",
    group: "Engineering",
    icon: Cog,
    blurb: "Building, designing and how things work.",
    query: "engineering machines construction",
    topics: ["Mechanical", "Civil", "Electrical", "Aerospace", "Biomedical"],
  },
  {
    slug: "history",
    name: "History",
    group: "Social Sciences",
    icon: Landmark,
    blurb: "Civilizations, wars and the human story.",
    query: "history world war ancient",
    topics: ["Ancient Egypt", "Ancient Rome", "World War I", "World War II", "Cold War", "African History", "American History"],
  },
  {
    slug: "economics",
    name: "Economics",
    group: "Social Sciences",
    icon: Landmark,
    blurb: "Markets, money and how societies allocate.",
    query: "economy money finance crisis",
    topics: ["Markets", "Money", "Trade", "Inequality", "Financial Crises"],
  },
  {
    slug: "geography",
    name: "Geography",
    group: "Social Sciences",
    icon: Landmark,
    blurb: "Places, peoples and the shape of the world.",
    query: "geography world countries planet",
    topics: ["Continents", "Climate Zones", "Cities", "Migration", "Maps"],
  },
  {
    slug: "psychology",
    name: "Psychology",
    group: "Health",
    icon: HeartPulse,
    blurb: "The mind, behavior and human nature.",
    query: "psychology mind brain human behaviour",
    topics: ["The Brain", "Behavior", "Emotions", "Mental Health", "Cognition"],
  },
  {
    slug: "medicine",
    name: "Medicine",
    group: "Health",
    icon: HeartPulse,
    blurb: "The body, disease and modern healthcare.",
    query: "medicine doctors disease body",
    topics: ["Anatomy", "Diseases", "Surgery", "Pandemics", "Public Health"],
  },
  {
    slug: "business",
    name: "Business",
    group: "Business",
    icon: Briefcase,
    blurb: "Startups, leadership and how companies grow.",
    query: "business startup entrepreneur company",
    topics: ["Entrepreneurship", "Marketing", "Finance", "Leadership", "Accounting"],
  },
  {
    slug: "philosophy",
    name: "Philosophy",
    group: "Arts",
    icon: Palette,
    blurb: "Big ideas, ethics and the meaning of things.",
    query: "philosophy ideas thinkers",
    topics: ["Ethics", "Logic", "Existentialism", "Metaphysics", "Ancient Philosophy"],
  },
  {
    slug: "literature",
    name: "Literature",
    group: "Arts",
    icon: Palette,
    blurb: "Great writers, stories and the written word.",
    query: "literature writer author books",
    topics: ["Classics", "Poetry", "Authors", "Storytelling", "Drama"],
  },
  {
    slug: "art-history",
    name: "Art History",
    group: "Arts",
    icon: Palette,
    blurb: "Movements, masters and the story of art.",
    query: "art painting artist museum",
    topics: ["Renaissance", "Modern Art", "Painters", "Sculpture", "Movements"],
  },
  {
    slug: "climate-change",
    name: "Climate Change",
    group: "Environment",
    icon: Leaf,
    blurb: "Warming, impact and the fight for the planet.",
    query: "climate change global warming environment",
    topics: ["Global Warming", "Carbon", "Renewable Energy", "Conservation", "Sustainability"],
  },
  {
    slug: "personal-finance",
    name: "Personal Finance",
    group: "Life Skills",
    icon: Lightbulb,
    blurb: "Money skills for the real world.",
    query: "money finance wealth investing",
    topics: ["Budgeting", "Investing", "Saving", "Debt", "Wealth"],
  },
  {
    slug: "critical-thinking",
    name: "Critical Thinking",
    group: "Life Skills",
    icon: Lightbulb,
    blurb: "Reason, logic and thinking clearly.",
    query: "psychology logic decisions mind",
    topics: ["Logic", "Bias", "Decision Making", "Argument", "Problem Solving"],
  },
];

export const SUBJECT_GROUPS = [
  "Science",
  "Mathematics",
  "Technology",
  "Engineering",
  "Social Sciences",
  "Health",
  "Business",
  "Arts",
  "Environment",
  "Life Skills",
];

export function getSubject(slug: string): Subject | undefined {
  return SUBJECTS.find((s) => s.slug === slug);
}

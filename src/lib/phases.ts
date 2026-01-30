import {
  Notebook,
  Dna,
  Palette,
  Target,
  Share2,
  Calendar,
  CalendarDays,
  ClipboardList,
  Bot,
  Zap,
  BookOpen,
  FlaskConical,
  LucideIcon
} from "lucide-react";

export interface Phase {
  id: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export const phases: Phase[] = [
  {
    id: 1,
    title: "Caderno de Personalidade",
    shortTitle: "Personalidade",
    description: "Descubra a essência e personalidade única da sua marca",
    icon: Notebook,
    href: "/phase/1",
  },
  {
    id: 2,
    title: "DNA da Marca",
    shortTitle: "DNA",
    description: "",
    icon: Dna,
    href: "/phase/2",
  },
  {
    id: 3,
    title: "Planejamento Semanal",
    shortTitle: "Semanal",
    description: "Organize sua rotina de conteúdo",
    icon: ClipboardList,
    href: "/phase/3",
  },
  {
    id: 4,
    title: "Otimização das Redes",
    shortTitle: "Redes",
    description: "Configure suas redes sociais para máximo impacto",
    icon: Share2,
    href: "/phase/4",
  },
  {
    id: 5,
    title: "Calendário Interativo",
    shortTitle: "Calendário",
    description: "Visualize e gerencie todo seu conteúdo",
    icon: CalendarDays,
    href: "/phase/5",
  },
  {
    id: 6,
    title: "IAs Treinadas",
    shortTitle: "IAs",
    description: "",
    icon: Bot,
    href: "/phase/6",
  },
  {
    id: 7,
    title: "Carrosseis com IA",
    shortTitle: "Carrosseis",
    description: "Gere carrosséis estratégicos com auxílio de IA",
    icon: Zap,
    href: "/phase/7",
  },
  {
    id: 8,
    title: "Baú de Marca",
    shortTitle: "Baú de Marca",
    description: "Seu lugar seguro para guardar tudo da sua marca.",
    icon: BookOpen,
    href: "/phase/8",
  },
  {
    id: 9,
    title: "Laboratório Criativo",
    shortTitle: "Lab",
    description: "Experimente e crie conteúdo inovador",
    icon: FlaskConical,
    href: "/phase/9",
  },
];

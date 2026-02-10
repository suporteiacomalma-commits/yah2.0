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
  emoji: string;
}

export const phases: Phase[] = [
  {
    id: 1,
    title: "Caderno de Personalidade",
    shortTitle: "Base",
    description: "Descubra a essência e personalidade única da sua marca",
    icon: Notebook,
    href: "/phase/1",
    emoji: "📔"
  },
  {
    id: 2,
    title: "DNA da Marca",
    shortTitle: "Estratégia",
    description: "",
    icon: Dna,
    href: "/phase/2",
    emoji: "🧬"
  },
  {
    id: 3,
    title: "Planejamento Semanal",
    shortTitle: "Estrutura",
    description: "Organize sua rotina de conteúdo",
    icon: ClipboardList,
    href: "/phase/3",
    emoji: "📅"
  },
  {
    id: 4,
    title: "Otimização das Redes",
    shortTitle: "Percepção",
    description: "Configure suas redes sociais para máximo impacto",
    icon: Share2,
    href: "/phase/4",
    emoji: "🚀"
  },
  {
    id: 5,
    title: "Calendário Interativo",
    shortTitle: "Calendário",
    description: "Visualize e gerencie todo seu conteúdo",
    icon: CalendarDays,
    href: "/phase/5",
    emoji: "🗓️"
  },
  {
    id: 6,
    title: "IAs Treinadas",
    shortTitle: "IAs Treinadas",
    description: "",
    icon: Bot,
    href: "/phase/6",
    emoji: "🤖"
  },
  {
    id: 7,
    title: "Carrosseis com IA",
    shortTitle: "Produção",
    description: "Gere carrosséis estratégicos com auxílio de IA",
    icon: Zap,
    href: "/phase/7",
    emoji: "⚡"
  },
  {
    id: 8,
    title: "Baú de Marca",
    shortTitle: "Memória",
    description: "Seu lugar seguro para guardar tudo da sua marca.",
    icon: BookOpen,
    href: "/phase/8",
    emoji: "📦"
  },
  {
    id: 9,
    title: "Laboratório Criativo",
    shortTitle: "Lab",
    description: "Experimente e crie conteúdo inovador",
    icon: FlaskConical,
    href: "/phase/9",
    emoji: "🧪"
  },
];

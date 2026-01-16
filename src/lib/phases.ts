import {
  Notebook,
  Dna,
  Palette,
  Target,
  Share2,
  Calendar,
  CalendarDays,
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
    description: "Defina missão, visão, valores e propósito",
    icon: Dna,
    href: "/phase/2",
  },
  {
    id: 3,
    title: "Planejamento Semanal",
    shortTitle: "Semanal",
    description: "Organize sua rotina de conteúdo",
    icon: Calendar,
    href: "/phase/3",
  },
  {
    id: 4,
    title: "Identidade Visual",
    shortTitle: "Visual",
    description: "Cores, tipografia e elementos gráficos",
    icon: Palette,
    href: "/phase/4",
  },
  {
    id: 5,
    title: "Posicionamento",
    shortTitle: "Posição",
    description: "Defina seu lugar único no mercado",
    icon: Target,
    href: "/phase/5",
  },
  {
    id: 6,
    title: "Otimização das Redes",
    shortTitle: "Redes",
    description: "Configure suas redes sociais para máximo impacto",
    icon: Share2,
    href: "/phase/6",
  },
  {
    id: 7,
    title: "Calendário Interativo",
    shortTitle: "Calendário",
    description: "Visualize e gerencie todo seu conteúdo",
    icon: CalendarDays,
    href: "/phase/7",
  },
  {
    id: 8,
    title: "IAs Treinadas",
    shortTitle: "IAs",
    description: "Configure assistentes de IA personalizados",
    icon: Bot,
    href: "/phase/8",
  },
  {
    id: 9,
    title: "Automações",
    shortTitle: "Automações",
    description: "Automatize processos repetitivos",
    icon: Zap,
    href: "/phase/9",
  },
  {
    id: 10,
    title: "Tutoriais",
    shortTitle: "Tutoriais",
    description: "Aprenda estratégias e técnicas avançadas",
    icon: BookOpen,
    href: "/phase/10",
  },
  {
    id: 11,
    title: "Laboratório Criativo",
    shortTitle: "Lab",
    description: "Experimente e crie conteúdo inovador",
    icon: FlaskConical,
    href: "/phase/11",
  },
];

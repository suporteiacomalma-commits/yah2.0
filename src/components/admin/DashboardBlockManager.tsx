import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { ArrowUp, ArrowDown, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type DashboardBlockId = 
  | 'header'
  | 'actions'
  | 'today_tasks'
  | 'journey'
  | 'weekly_planner'
  | 'calendar_link'
  | 'mini_calendar'
  | 'map';

export interface DashboardBlockConfig {
  id: DashboardBlockId;
  title: string;
  visible: boolean;
  order: number;
}

export const DEFAULT_DASHBOARD_BLOCKS: DashboardBlockConfig[] = [
  { id: 'header', title: 'Boas Vindas + Dicas', visible: true, order: 0 },
  { id: 'actions', title: 'Ícones Principais (Assistente, Ideias)', visible: true, order: 1 },
  { id: 'today_tasks', title: 'Seu Dia Hoje', visible: true, order: 2 },
  { id: 'journey', title: 'Jornada Digital (Fases)', visible: true, order: 3 },
  { id: 'weekly_planner', title: 'Hoje você pode falar (Planejamento Semanal)', visible: true, order: 4 },
  { id: 'calendar_link', title: 'Link para o Calendario', visible: true, order: 5 },
  { id: 'mini_calendar', title: 'MiniCalendário (Mês)', visible: true, order: 6 },
  { id: 'map', title: 'Mapa Yah', visible: true, order: 7 },
];

export function DashboardBlockManager() {
  const { getSetting, updateSetting, isLoading } = useSystemSettings();
  const [blocks, setBlocks] = useState<DashboardBlockConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const configSetting = getSetting("dashboard_blocks_config");
      if (configSetting?.value) {
        try {
           const parsed = JSON.parse(configSetting.value) as DashboardBlockConfig[];
           
           // Merge with defaults to ensure any missing properties in existing blocks and any new blocks are added
           const merged = parsed.map(block => {
             const defaultBlock = DEFAULT_DASHBOARD_BLOCKS.find(b => b.id === block.id);
             return { ...defaultBlock, ...block };
           });
           
           DEFAULT_DASHBOARD_BLOCKS.forEach(defaultBlock => {
             if (!merged.find(b => b.id === defaultBlock.id)) {
                merged.push({ ...defaultBlock, order: merged.length });
             }
           });
           
           setBlocks(merged.sort((a, b) => a.order - b.order));
        } catch (e) {
           console.error("Failed to parse blocks config", e);
           setBlocks(DEFAULT_DASHBOARD_BLOCKS);
        }
      } else {
        setBlocks(DEFAULT_DASHBOARD_BLOCKS);
      }
    }
  }, [getSetting, isLoading]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index - 1];
    newBlocks[index - 1] = newBlocks[index];
    newBlocks[index] = temp;
    
    // Update order values immutably
    const updatedBlocks = newBlocks.map((block, idx) => ({ ...block, order: idx }));
    setBlocks(updatedBlocks);
  };

  const moveDown = (index: number) => {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index + 1];
    newBlocks[index + 1] = newBlocks[index];
    newBlocks[index] = temp;
    
    // Update order values immutably
    const updatedBlocks = newBlocks.map((block, idx) => ({ ...block, order: idx }));
    setBlocks(updatedBlocks);
  };

  const toggleVisibility = (index: number) => {
    const newBlocks = [...blocks];
    const isVisible = newBlocks[index].visible !== false;
    newBlocks[index] = { ...newBlocks[index], visible: !isVisible };
    setBlocks(newBlocks);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: 'dashboard_blocks_config',
        value: JSON.stringify(blocks),
        description: 'Ordem e visibilidade dos blocos da dashboard principal'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Blocos do Dashboard</CardTitle>
        <CardDescription>
          Personalize a ordem e quais seções devem aparecer na página inicial da plataforma para todos os usuários.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-6">
          {blocks.map((block, index) => {
            const isVisible = block.visible !== false;
            return (
            <div 
              key={block.id} 
              className={`flex items-center justify-between p-3 rounded-lg border ${isVisible ? 'bg-background border-border' : 'bg-background/40 border-border/50 opacity-60'}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => moveDown(index)}
                    disabled={index === blocks.length - 1}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
                <span className="font-medium">{block.title}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant={isVisible ? "default" : "secondary"}
                  size="sm"
                  onClick={() => toggleVisibility(index)}
                  className={isVisible ? "gap-2 text-[#141414] font-medium" : "gap-2"}
                >
                  {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {isVisible ? "Visível" : "Oculto"}
                </Button>
              </div>
            </div>
          )})}
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2 bg-[#B6BC45] hover:bg-[#9DA139] text-[#141414]">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Configurações da Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

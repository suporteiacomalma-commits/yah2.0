import React, { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Search,
    Link as LinkIcon,
    FileText,
    Image as ImageIcon,
    Trash2,
    ArrowLeft,
    Upload,
    MoreHorizontal,
    GripVertical,
    ChevronUp,
    ChevronDown,
    ExternalLink,
    File,
    Download,
    X,
    FolderOpen,
    Globe,
    Shield,
    Users,
    Activity,
    BookOpen,
    MessageSquare,
    DollarSign,
    Target,
    Briefcase,
    Layout,
    Layers,
    Type,
    ClipboardList,
    HelpCircle,
    Eye,
    Save,
    Loader2
} from "lucide-react";
import { useBrand } from "@/hooks/useBrand";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// ICON MAPPING for standard cards
const ICON_MAP: Record<string, any> = {
    "LinkIcon": LinkIcon,
    "FileText": FileText,
    "ImageIcon": ImageIcon,
    "FolderOpen": FolderOpen,
    "Globe": Globe,
    "Shield": Shield,
    "Users": Users,
    "Activity": Activity,
    "BookOpen": BookOpen,
    "MessageSquare": MessageSquare,
    "DollarSign": DollarSign,
    "Target": Target,
    "Briefcase": Briefcase,
    "Layout": Layout,
    "Layers": Layers,
    "Type": Type,
    "ClipboardList": ClipboardList,
    "HelpCircle": HelpCircle
};

const STANDARD_CARDS = [
    { name: "Links Importantes", micro: "Salve URLs essenciais da sua marca.", icon: "Globe" },
    { name: "Documentos da Marca", micro: "Guarde arquivos importantes do seu negócio.", icon: "FolderOpen" },
    { name: "Logos & Identidade Visual", micro: "Armazene logos, paleta, tipografia e brand kit.", icon: "ImageIcon" },
    { name: "Referências de Conteúdo", micro: "Salve prints, inspirações e conteúdos-base.", icon: "Layers" },
    { name: "Concorrentes", micro: "Guarde exemplos, análises e comparativos.", icon: "Target" },
    { name: "Textos Estratégicos", micro: "Pilares, tese, mensagens-chave e narrativas.", icon: "Type" },
    { name: "Materiais Oficiais (PDFs)", micro: "E-books, apresentações e documentos oficiais.", icon: "FileText" },
    { name: "Copy de Vendas", micro: "Guarde copies prontas, scripts e headlines.", icon: "MessageSquare" },
    { name: "Estratégia de Marca", micro: "Modelo, posicionamento, tese e diferenciação.", icon: "Activity" },
    { name: "Proposta Comercial", micro: "Modelos, escopos e contratos.", icon: "Briefcase" },
    { name: "Copy de Site", micro: "Textos aprovados para o site oficial.", icon: "Layout" },
    { name: "Follow App", micro: "Orientações internas do app e guias rápidos.", icon: "BookOpen" },
    { name: "Equipe", micro: "Funções, responsáveis, fluxos e contatos.", icon: "Users" },
    { name: "Experiência do Serviço/Produto", micro: "Mapas de experiência, método e etapas.", icon: "ClipboardList" },
    { name: "Processos", micro: "Procedimentos internos e rotinas operacionais.", icon: "Activity" },
    { name: "Dúvidas Frequentes da Marca", micro: "FAQ interno que guia comunicação e suporte.", icon: "HelpCircle" },
    { name: "Financeiro", micro: "Planilhas, metas, boletos e recibos.", icon: "DollarSign" },
];

interface VaultCard {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: 'standard' | 'custom';
}

interface VaultItem {
    id: string;
    card_id: string;
    text: string;
    order: number;
    attachments: any[];
    links: any[];
}

export function BrandVault() {
    const { brand } = useBrand();
    const [step, setStep] = useState<"home" | "detail">("home");
    const [cards, setCards] = useState<VaultCard[]>([]);
    const [activeCard, setActiveCard] = useState<VaultCard | null>(null);
    const [items, setItems] = useState<VaultItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddingCard, setIsAddingCard] = useState(false);
    const [newCardData, setNewCardData] = useState({ name: "", description: "", icon: "FolderOpen" });

    // --- FETCH DATA ---
    const fetchCards = useCallback(async () => {
        if (!brand) return;
        try {
            const { data, error } = await supabase
                .from("brand_vault_cards")
                .select("*")
                .eq("brand_id", brand.id)
                .order("created_at", { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                setCards(data as unknown as VaultCard[]);
            } else {
                // SEEDING
                const seedData = STANDARD_CARDS.map(c => ({
                    brand_id: brand.id,
                    user_id: brand.user_id,
                    name: c.name,
                    description: c.micro,
                    icon: c.icon,
                    type: 'standard'
                }));
                const { data: inserted, error: insertError } = await supabase
                    .from("brand_vault_cards")
                    .insert(seedData)
                    .select();
                if (insertError) throw insertError;
                setCards(inserted as unknown as VaultCard[] || []);
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar baú.");
        } finally {
            setIsLoading(false);
        }
    }, [brand]);

    const fetchItems = useCallback(async (cardId: string) => {
        try {
            const { data, error } = await supabase
                .from("brand_vault_items")
                .select("*")
                .eq("card_id", cardId)
                .order("order", { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                setItems((data as any[]).map(i => ({
                    ...i,
                    attachments: (i.attachments as any[]) || [],
                    links: (i.links as any[]) || []
                })) as VaultItem[]);
            } else {
                // CREATE INITIAL BOX
                const { data: inserted, error: insError } = await supabase
                    .from("brand_vault_items")
                    .insert({
                        card_id: cardId,
                        brand_id: brand?.id,
                        user_id: brand?.user_id,
                        text: ""
                    })
                    .select();
                if (insError) throw insError;
                setItems((inserted as any[]).map(i => ({
                    ...i,
                    attachments: (i.attachments as any[]) || [],
                    links: (i.links as any[]) || []
                })) as VaultItem[]);
            }
        } catch (e) {
            console.error(e);
        }
    }, [brand]);

    useEffect(() => {
        fetchCards();
    }, [fetchCards]);

    // --- ACTIONS ---
    const handleAddCard = async () => {
        if (!newCardData.name || !brand) return;
        try {
            const { data, error } = await supabase
                .from("brand_vault_cards")
                .insert({
                    brand_id: brand.id,
                    user_id: brand.user_id,
                    name: newCardData.name,
                    description: newCardData.description,
                    icon: newCardData.icon,
                    type: 'custom'
                })
                .select()
                .single();
            if (error) throw error;
            setCards(prev => [...prev, data as unknown as VaultCard]);
            setIsAddingCard(false);
            setNewCardData({ name: "", description: "", icon: "FolderOpen" });
            toast.success("Card criado!");
        } catch (e) {
            toast.error("Erro ao criar card.");
        }
    };

    const handleAddItem = async () => {
        if (!activeCard || !brand) return;
        const newOrder = items.length > 0 ? Math.max(...items.map(i => i.order)) + 1 : 0;
        try {
            const { data, error } = await supabase
                .from("brand_vault_items")
                .insert({
                    card_id: activeCard.id,
                    brand_id: brand.id,
                    user_id: brand.user_id,
                    text: "",
                    order: newOrder
                })
                .select()
                .single();
            if (error) throw error;
            setItems(prev => [...prev, data as unknown as VaultItem]);
        } catch (e) {
            toast.error("Erro ao adicionar caixa.");
        }
    };

    const updateItem = async (id: string, updates: Partial<VaultItem>) => {
        try {
            const { error } = await supabase
                .from("brand_vault_items")
                .update(updates)
                .eq("id", id);
            if (error) throw error;
        } catch (e) {
            console.error("Auto-save error:", e);
        }
    };

    const deleteItem = async (id: string) => {
        if (!confirm("Excluir esta caixa?")) return;
        try {
            const { error } = await supabase
                .from("brand_vault_items")
                .delete()
                .eq("id", id);
            if (error) throw error;
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (e) {
            toast.error("Erro ao excluir.");
        }
    };

    const handleFileUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !brand) return;

        const toastId = toast.loading("Enviando arquivo...");
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `vault/${brand.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("brand_documents")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from("brand_documents")
                .getPublicUrl(filePath);

            const item = items.find(i => i.id === itemId);
            if (item) {
                const newAttachments = [...(item.attachments || []), { name: file.name, url: publicUrl, type: file.type }];
                setItems(prev => prev.map(i => i.id === itemId ? { ...i, attachments: newAttachments } : i));
                await updateItem(itemId, { attachments: newAttachments });
            }
            toast.success("Arquivo enviado!", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Erro no upload.", { id: toastId });
        }
    };

    const addLink = async (itemId: string, title: string, url: string) => {
        if (!url) return;
        const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
        const item = items.find(i => i.id === itemId);
        if (item) {
            const newLinks = [...(item.links || []), { title: title || url, url: formattedUrl }];
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, links: newLinks } : i));
            await updateItem(itemId, { links: newLinks });
        }
    };

    const moveItem = async (idx: number, direction: 'up' | 'down') => {
        const newItems = [...items];
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= items.length) return;

        [newItems[idx], newItems[targetIdx]] = [newItems[targetIdx], newItems[idx]];

        // Update local state with new orders
        const updatedItems = newItems.map((item, i) => ({ ...item, order: i }));
        setItems(updatedItems);

        // Update DB
        for (const item of updatedItems) {
            await updateItem(item.id, { order: item.order });
        }
    };

    // --- RENDER HELPERS ---
    const getIcon = (name: string) => {
        const IconComp = ICON_MAP[name] || FolderOpen;
        return <IconComp className="w-6 h-6" />;
    };

    const filteredCards = cards.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // --- RENDER SCREENS ---
    if (step === "detail" && activeCard) {
        return (
            <div className="flex flex-col min-h-[80vh] pb-24 space-y-6 animate-in slide-in-from-right-4 duration-500">
                {/* Header Detail */}
                <div className="flex flex-col space-y-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setStep("home")} className="rounded-full bg-white/5 hover:bg-white/10 shrink-0">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="p-2 rounded-xl bg-primary/10 text-primary">{getIcon(activeCard.icon)}</span>
                                <h2 className="text-xl sm:text-2xl font-black truncate">{activeCard.name}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <p className="text-xs font-medium text-primary/80 leading-relaxed">
                            {activeCard.description || "Use este espaço para organizar tudo que é importante sobre este tema da sua marca."}
                        </p>
                    </div>
                </div>

                {/* Blocks List */}
                <div className="space-y-6">
                    {items.map((item, idx) => (
                        <Card key={item.id} className="relative bg-white/5 border-white/5 rounded-[1.5rem] overflow-hidden group/box hover:border-white/10 transition-all duration-300">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-1 opacity-10 group-hover/box:opacity-40 transition-opacity">
                                        <Button variant="ghost" size="icon" disabled={idx === 0} onClick={() => moveItem(idx, 'up')} className="h-8 w-8"><ChevronUp className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" disabled={idx === items.length - 1} onClick={() => moveItem(idx, 'down')} className="h-8 w-8"><ChevronDown className="w-4 h-4" /></Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteItem(item.id)}
                                        className="h-8 w-8 text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                <Textarea
                                    defaultValue={item.text}
                                    onBlur={(e) => updateItem(item.id, { text: e.target.value })}
                                    placeholder="Escreva algo aqui..."
                                    className="min-h-[120px] bg-transparent border-none focus-visible:ring-0 p-0 text-sm leading-relaxed text-white/90 placeholder:text-white/20 resize-none h-auto"
                                    onInput={(e: any) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                />

                                {/* Attachments List */}
                                <div className="flex flex-wrap gap-2">
                                    {item.links?.map((link, lIdx) => (
                                        <a key={lIdx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold hover:bg-blue-500/20 transition-all">
                                            <LinkIcon className="w-3 h-3" />
                                            <span className="truncate max-w-[150px]">{link.title}</span>
                                            <ExternalLink className="w-3 h-3 ml-1 opacity-40" />
                                        </a>
                                    ))}
                                    {item.attachments?.map((att, aIdx) => (
                                        <a key={aIdx} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-all">
                                            {att.type?.includes('image') ? <ImageIcon className="w-3 h-3" /> : <File className="w-3 h-3" />}
                                            <span className="truncate max-w-[150px]">{att.name}</span>
                                            <Download className="w-3 h-3 ml-1 opacity-40" />
                                        </a>
                                    ))}
                                </div>

                                {/* Actions Internal */}
                                <div className="flex items-center gap-2 pt-2 border-t border-white/5 opacity-40 group-hover/box:opacity-100 transition-opacity">
                                    <label className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
                                        <FileText className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">DOC</span>
                                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(item.id, e)} />
                                    </label>
                                    <label className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">IMG</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(item.id, e)} />
                                    </label>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 rounded-lg bg-white/5 hover:bg-white/10 px-3 gap-1.5">
                                                <LinkIcon className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">LINK</span>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-slate-900 border-white/10 rounded-[2rem]">
                                            <DialogHeader><DialogTitle>Adicionar Link</DialogTitle></DialogHeader>
                                            <div className="space-y-4 pt-4">
                                                <div className="space-y-2">
                                                    <Label>URL</Label>
                                                    <Input placeholder="https://..." id="link-url" className="rounded-xl bg-white/5 border-white/10" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Título (Opcional)</Label>
                                                    <Input placeholder="Nome do link" id="link-title" className="rounded-xl bg-white/5 border-white/10" />
                                                </div>
                                                <Button className="w-full rounded-xl gradient-primary" onClick={() => {
                                                    const url = (document.getElementById('link-url') as HTMLInputElement).value;
                                                    const title = (document.getElementById('link-title') as HTMLInputElement).value;
                                                    addLink(item.id, title, url);
                                                }}>Salvar Link</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <Button
                        variant="ghost"
                        onClick={handleAddItem}
                        className="w-full h-16 border-2 border-dashed border-white/5 rounded-[1.5rem] text-sm font-bold text-white/30 hover:border-primary/20 hover:text-primary transition-all group"
                    >
                        <Plus className="w-5 h-5 mr-2 group-hover:scale-125 transition-transform" />
                        Adicionar nova caixa
                    </Button>
                </div>

                {/* Sticky Footer */}
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
                    <div className="flex items-center justify-center p-2 rounded-full bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl">
                        <Button variant="ghost" className="flex-1 h-12 rounded-full hover:bg-white/5 gap-2" onClick={handleAddItem}>
                            <Plus className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Texto</span>
                        </Button>
                        <label className="flex-1 flex items-center justify-center h-12 rounded-full hover:bg-white/5 gap-2 cursor-pointer">
                            <Upload className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Upload</span>
                            <input type="file" className="hidden" onChange={(e) => {
                                if (items.length > 0) handleFileUpload(items[items.length - 1].id, e);
                                else {
                                    handleAddItem().then(() => {
                                        // This is a bit tricky with state updates, best would be to push to new item
                                        toast.info("Criando caixa e subindo arquivo...");
                                    });
                                }
                            }} />
                        </label>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" className="flex-1 h-12 rounded-full hover:bg-white/5 gap-2">
                                    <LinkIcon className="w-4 h-4 text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Link</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-900 border-white/10 rounded-[2rem]">
                                <DialogHeader><DialogTitle>Adicionar Link</DialogTitle></DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <Input placeholder="URL" id="footer-link-url" className="rounded-xl" />
                                    <Input placeholder="Título" id="footer-link-title" className="rounded-xl" />
                                    <Button className="w-full rounded-xl gradient-primary" onClick={() => {
                                        const url = (document.getElementById('footer-link-url') as HTMLInputElement).value;
                                        const title = (document.getElementById('footer-link-title') as HTMLInputElement).value;
                                        if (items.length > 0) addLink(items[items.length - 1].id, title, url);
                                    }}>Salvar</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Home */}
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-black tracking-tighter">Baú de Marca</h1>
                <p className="text-sm font-medium text-muted-foreground">Seu lugar seguro para guardar tudo da sua marca.</p>
            </div>

            {/* Search */}
            <div className="relative group max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Filtrar cards no baú..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-14 bg-white/5 border-white/10 focus:border-primary/50 transition-all rounded-2xl shadow-inner"
                />
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse text-xs font-bold uppercase tracking-widest">Organizando seu baú...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCards.map((card) => (
                        <Card
                            key={card.id}
                            className="group cursor-pointer bg-white/5 border-white/5 hover:border-primary/30 transition-all duration-500 hover:translate-y-[-4px] rounded-[1.8rem] overflow-hidden"
                            onClick={() => {
                                setActiveCard(card);
                                setStep("detail");
                                fetchItems(card.id);
                            }}
                        >
                            <CardContent className="p-6 flex flex-col items-start gap-4">
                                <div className="p-3 rounded-2xl bg-white/5 text-primary group-hover:bg-primary/10 transition-all group-hover:scale-110 duration-500">
                                    {getIcon(card.icon)}
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="font-black text-lg group-hover:text-primary transition-colors">{card.name}</h3>
                                    <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                                        {card.description}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Add Card */}
                    <Dialog open={isAddingCard} onOpenChange={setIsAddingCard}>
                        <DialogTrigger asChild>
                            <Card className="group cursor-pointer bg-primary/5 border-2 border-dashed border-primary/20 hover:border-primary/50 transition-all duration-500 hover:translate-y-[-4px] rounded-[1.8rem] overflow-hidden">
                                <CardContent className="p-6 flex flex-col items-center justify-center gap-4 text-center min-h-[160px]">
                                    <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-125 transition-all duration-500 shadow-xl shadow-primary/20">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-black text-lg">Criar novo card</h3>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Monte uma área personalizada</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-white/10 rounded-[2.5rem]">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black">Personalizar Novo Card</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 pt-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black tracking-widest ml-1">Nome do Card</Label>
                                    <Input
                                        value={newCardData.name}
                                        onChange={e => setNewCardData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="EX: CURSOS EXTERNOS"
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-black uppercase text-xs"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black tracking-widest ml-1">Descrição Curta</Label>
                                    <Input
                                        value={newCardData.description}
                                        onChange={e => setNewCardData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Uma linha sobre o que tem aqui..."
                                        className="h-12 bg-white/5 border-white/10 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <Label className="text-[10px] uppercase font-black tracking-widest ml-1 text-primary/60">Escolha um Ícone</Label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {Object.keys(ICON_MAP).slice(0, 18).map(iName => (
                                            <Button
                                                key={iName}
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setNewCardData(prev => ({ ...prev, icon: iName }))}
                                                className={cn(
                                                    "h-10 w-10 rounded-lg transition-all",
                                                    newCardData.icon === iName ? "bg-primary text-white scale-110 shadow-lg" : "bg-white/5 hover:bg-white/10"
                                                )}
                                            >
                                                {React.createElement(ICON_MAP[iName], { className: "w-5 h-5" })}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <Button className="w-full h-14 rounded-2xl font-black text-lg gradient-primary shadow-2xl shadow-primary/20" onClick={handleAddCard}>
                                    Salvar Área no Baú
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
        </div>
    );
}

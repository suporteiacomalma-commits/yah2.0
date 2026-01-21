import React, { useState, useEffect } from "react";
import {
    FileText,
    Upload,
    Trash2,
    Download,
    Eye,
    Plus,
    Search,
    File,
    Image as ImageIcon,
    Music,
    Video,
    Archive,
    Loader2
} from "lucide-react";
import { useBrand } from "@/hooks/useBrand";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Document {
    id: string;
    brand_id: string | null;
    user_id: string | null;
    name: string;
    file_path: string;
    file_type: string | null;
    file_size: number | null;
    category?: string | null;
    created_at: string;
}

const DEFAULT_CATEGORIES = ["Tudo", "Identidade Visual", "Referências", "Estratégia", "Arquivos de Aula", "Outros"];

export function BrandTrunk() {
    const { brand, updateBrand } = useBrand();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Tudo");
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...(brand?.trunk_categories || [])]));

    const fetchDocuments = async () => {
        if (!brand) return;
        try {
            const { data, error } = await supabase
                .from("brand_documents")
                .select("*")
                .eq("brand_id", brand.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error("Error fetching documents:", error);
            toast.error("Erro ao carregar documentos.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [brand]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !brand) return;

        // Limit size to 50MB for now
        if (file.size > 50 * 1024 * 1024) {
            toast.error("O arquivo deve ter menos de 50MB.");
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${brand.id}/${fileName}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from("brand_documents")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Save metadata to Database
            const { error: dbError } = await supabase
                .from("brand_documents")
                .insert({
                    brand_id: brand.id,
                    user_id: brand.user_id,
                    name: file.name,
                    file_path: filePath,
                    file_type: file.type,
                    file_size: file.size,
                    category: selectedCategory === "Tudo" ? "Outros" : selectedCategory
                });

            if (dbError) throw dbError;

            toast.success("Documento enviado com sucesso!");
            fetchDocuments();
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Erro ao enviar documento.");
        } finally {
            setIsUploading(false);
            // Clear input
            e.target.value = "";
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim() || !brand) return;

        const trimmedName = newCategoryName.trim();
        if (categories.includes(trimmedName)) {
            toast.error("Esta categoria já existe.");
            return;
        }

        const updatedCategories = [...(brand.trunk_categories || []), trimmedName];

        try {
            await updateBrand.mutateAsync({
                updates: { trunk_categories: updatedCategories },
                silent: true
            });
            setSelectedCategory(trimmedName);
            setNewCategoryName("");
            setShowNewCategoryInput(false);
            toast.success("Categoria adicionada!");
        } catch (error) {
            toast.error("Erro ao adicionar categoria.");
        }
    };

    const handleDeleteCategory = async (catToDelete: string) => {
        if (!brand || !brand.trunk_categories?.includes(catToDelete)) return;
        if (!confirm(`Tem certeza que deseja excluir a categoria "${catToDelete}"? Arquivos nesta categoria não serão excluídos.`)) return;

        const updatedCategories = brand.trunk_categories.filter(c => c !== catToDelete);

        try {
            await updateBrand.mutateAsync({
                updates: { trunk_categories: updatedCategories },
                silent: true
            });
            if (selectedCategory === catToDelete) {
                setSelectedCategory("Tudo");
            }
            toast.success("Categoria removida!");
        } catch (error) {
            toast.error("Erro ao remover categoria.");
        }
    };

    const handleDelete = async (doc: Document) => {
        if (!confirm(`Tem certeza que deseja excluir "${doc.name}"?`)) return;

        try {
            // 1. Delete from Storage
            const { error: storageError } = await supabase.storage
                .from("brand_documents")
                .remove([doc.file_path]);

            if (storageError) throw storageError;

            // 2. Delete from Database
            const { error: dbError } = await supabase
                .from("brand_documents")
                .delete()
                .eq("id", doc.id);

            if (dbError) throw dbError;

            toast.success("Documento excluído.");
            setDocuments(prev => prev.filter(d => d.id !== doc.id));
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Erro ao excluir documento.");
        }
    };

    const handleDownload = async (doc: Document) => {
        try {
            const { data, error } = await supabase.storage
                .from("brand_documents")
                .createSignedUrl(doc.file_path, 3600); // 1 hour link

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, "_blank");
            }
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Erro ao abrir documento.");
        }
    };

    const getFileIcon = (type: string) => {
        if (type.includes("image")) return <ImageIcon className="w-5 h-5 text-pink-500" />;
        if (type.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
        if (type.includes("video")) return <Video className="w-5 h-5 text-blue-500" />;
        if (type.includes("audio")) return <Music className="w-5 h-5 text-purple-500" />;
        if (type.includes("zip") || type.includes("rar")) return <Archive className="w-5 h-5 text-yellow-600" />;
        return <File className="w-5 h-5 text-slate-400" />;
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "Tudo" || doc.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/40 p-4 rounded-2xl border border-white/5">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar documentos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-black/20 border-white/10 focus:border-primary/50 transition-all rounded-xl"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <label className="flex-1 md:flex-none">
                        <Button
                            asChild
                            disabled={isUploading}
                            className="w-full md:w-auto gradient-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all rounded-xl cursor-pointer"
                        >
                            <span>
                                {isUploading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                Adicionar Documento
                            </span>
                        </Button>
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleUpload}
                            disabled={isUploading}
                        />
                    </label>
                </div>
            </div>

            {/* Categories Selection */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full h-12 bg-white/5 border-white/10 rounded-2xl text-[10px] uppercase font-black tracking-widest focus:ring-primary/20 transition-all">
                            <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 rounded-2xl">
                            {categories.map((cat) => (
                                <SelectItem
                                    key={cat}
                                    value={cat}
                                    className="text-[10px] uppercase font-black tracking-widest text-muted-foreground focus:text-white rounded-xl"
                                >
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {brand?.trunk_categories?.includes(selectedCategory) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(selectedCategory)}
                            className="h-12 w-12 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-2xl shrink-0 transition-all"
                            title="Excluir Categoria"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {showNewCategoryInput ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                            <Input
                                size={1}
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                placeholder="Nova categoria..."
                                className="h-12 text-[10px] uppercase font-bold tracking-widest bg-black/20 border-white/10 rounded-2xl min-w-[200px]"
                                autoFocus
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleAddCategory}
                                className="h-12 w-12 text-primary hover:bg-primary/10 rounded-2xl"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowNewCategoryInput(false)}
                                className="h-12 w-12 text-muted-foreground hover:bg-white/5 rounded-2xl"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowNewCategoryInput(true)}
                            className="rounded-2xl px-6 h-12 text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/5 transition-all whitespace-nowrap gap-2 border border-white/5"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Nova Categoria
                        </Button>
                    )}
                </div>
            </div>

            {/* Documents Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Organizando seu baú...</p>
                </div>
            ) : filteredDocs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocs.map((doc) => (
                        <Card key={doc.id} className="group overflow-hidden bg-card/60 border-white/5 hover:border-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                        {getFileIcon(doc.file_type || "")}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors" title={doc.name}>
                                            {doc.name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                                {formatSize(doc.file_size || 0)}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-white/10" />
                                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                                {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                                            </span>
                                            {doc.category && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                                    <span className="text-[10px] text-primary/80 uppercase font-bold tracking-tighter">
                                                        {doc.category}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownload(doc)}
                                        className="flex-1 h-8 text-[11px] font-bold uppercase tracking-wider hover:bg-primary/10 hover:text-primary rounded-lg"
                                    >
                                        <Eye className="w-3 h-3 mr-2" />
                                        Visualizar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(doc)}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-card/20 rounded-[2.5rem] border border-dashed border-white/10">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Archive className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Seu baú está vazio</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
                        Guarde PDFS, imagens, roteiros e outros materiais importantes da sua marca aqui.
                    </p>
                    <label>
                        <Button
                            variant="outline"
                            asChild
                            className="rounded-xl border-white/10 hover:bg-white/5"
                        >
                            <span className="cursor-pointer">
                                <Plus className="w-4 h-4 mr-2" />
                                Começar a guardar
                            </span>
                        </Button>
                        <input type="file" className="hidden" onChange={handleUpload} />
                    </label>
                </div>
            )}
        </div>
    );
}

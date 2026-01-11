import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Target, Loader2, Lightbulb } from "lucide-react";

export default function BrandIdentity() {
  const { brand, updateBrand } = useBrand();
  const [formData, setFormData] = useState({
    mission: brand?.mission || "",
    vision: brand?.vision || "",
    values: brand?.values || "",
    purpose: brand?.purpose || "",
    personality: brand?.personality || "",
  });

  const handleSave = () => {
    updateBrand.mutate(formData);
  };

  const fields = [
    { key: "mission", label: "Missão", placeholder: "Qual é a razão de existir da sua empresa?", tip: "Descreva o propósito fundamental da sua empresa" },
    { key: "vision", label: "Visão", placeholder: "Onde sua empresa quer chegar?", tip: "Descreva o futuro que você quer construir" },
    { key: "values", label: "Valores", placeholder: "Quais princípios guiam sua empresa?", tip: "Liste os valores que norteiam as decisões" },
    { key: "purpose", label: "Propósito", placeholder: "Por que sua empresa existe além do lucro?", tip: "O impacto positivo que você quer causar" },
    { key: "personality", label: "Personalidade", placeholder: "Se sua marca fosse uma pessoa, como seria?", tip: "Traços de personalidade da marca" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-identity/10 flex items-center justify-center">
            <Target className="w-6 h-6 text-brand-identity" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Identidade da Marca</h1>
            <p className="text-muted-foreground">Defina a essência e personalidade da sua marca</p>
          </div>
        </div>

        <div className="grid gap-6">
          {fields.map((field) => (
            <Card key={field.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{field.label}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  {field.tip}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={field.placeholder}
                  value={formData[field.key as keyof typeof formData]}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  rows={3}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <Button onClick={handleSave} disabled={updateBrand.isPending} className="w-full md:w-auto">
          {updateBrand.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar alterações"}
        </Button>
      </div>
    </AppLayout>
  );
}

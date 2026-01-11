import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  href: string;
  progress?: number;
}

export function ModuleCard({
  title,
  description,
  icon: Icon,
  color,
  bgColor,
  href,
  progress = 0,
}: ModuleCardProps) {
  return (
    <Link to={href}>
      <Card className="group relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg cursor-pointer h-full">
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${bgColor}`}
          style={{ opacity: 0.03 }}
        />
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            {progress > 0 && (
              <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                {progress}%
              </span>
            )}
          </div>
          <CardTitle className="text-lg font-semibold mt-3 group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
          <CardDescription className="text-sm">
            {description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${color.replace("text-", "bg-")} transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

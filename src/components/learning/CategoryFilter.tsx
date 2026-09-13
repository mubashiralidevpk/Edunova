import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Globe, 
  Gamepad2, 
  Laptop, 
  Code, 
  Cpu, 
  BookOpen, 
  Languages,
  LayoutGrid
} from 'lucide-react';
import type { CourseCategory } from '@/types/learning';

interface CategoryFilterProps {
  categories: CourseCategory[];
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  'Globe': <Globe className="w-4 h-4" />,
  'Gamepad2': <Gamepad2 className="w-4 h-4" />,
  'Laptop': <Laptop className="w-4 h-4" />,
  'Code': <Code className="w-4 h-4" />,
  'Cpu': <Cpu className="w-4 h-4" />,
  'BookOpen': <BookOpen className="w-4 h-4" />,
  'Languages': <Languages className="w-4 h-4" />,
};

export function CategoryFilter({ categories, selectedCategory, onSelect }: CategoryFilterProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-4">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(null)}
          className="flex items-center gap-2"
        >
          <LayoutGrid className="w-4 h-4" />
          All Courses
        </Button>
        
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(category.id)}
            className="flex items-center gap-2"
          >
            {iconMap[category.icon || ''] || <BookOpen className="w-4 h-4" />}
            {category.name}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

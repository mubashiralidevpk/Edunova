import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Star, Trophy, Zap, Play, CheckCircle } from 'lucide-react';
import type { Course, StudentCourseProgress, CourseCategory } from '@/types/learning';

interface CourseCardProps {
  course: Course;
  category?: CourseCategory;
  progress?: StudentCourseProgress;
  onStart: () => void;
  onContinue: () => void;
}

export function CourseCard({ course, category, progress, onStart, onContinue }: CourseCardProps) {
  const isStarted = !!progress;
  const isCompleted = progress?.completed_at !== null && progress?.completed_at !== undefined;
  
  const difficultyStars = Array.from({ length: 5 }, (_, i) => i < course.difficulty_level);
  const difficultyLabel = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert'][course.difficulty_level - 1];

  return (
    <Card className="group overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 bg-gradient-to-br from-card to-card/50">
      <div className="relative h-32 bg-gradient-to-br from-primary/30 via-primary/20 to-accent/30 flex items-center justify-center overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-primary/20 blur-lg" />
        <div className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-accent/20 blur-xl" />
        
        <BookOpen className="w-12 h-12 text-primary/80" />
        
        {isCompleted && (
          <div className="absolute top-2 right-2">
            <div className="bg-green-500 text-white rounded-full p-1.5">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        )}
        
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
            {category?.name || 'General'}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {course.description || 'Start learning today!'}
          </p>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            {difficultyStars.map((filled, i) => (
              <Star 
                key={i} 
                className={`w-4 h-4 ${filled ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`}
              />
            ))}
            <span className="ml-1 text-muted-foreground">{difficultyLabel}</span>
          </div>
          
          <div className="flex items-center gap-1 text-primary font-medium">
            <Zap className="w-4 h-4" />
            <span>{course.xp_reward} XP</span>
          </div>
        </div>
        
        {isStarted && !isCompleted && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress?.progress_percentage || 0}%</span>
            </div>
            <Progress value={progress?.progress_percentage || 0} className="h-2" />
          </div>
        )}
        
        {isCompleted ? (
          <Button variant="outline" className="w-full" onClick={onContinue}>
            <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
            Completed - Review
          </Button>
        ) : isStarted ? (
          <Button className="w-full" onClick={onContinue}>
            <Play className="w-4 h-4 mr-2" />
            Continue Learning
          </Button>
        ) : (
          <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" onClick={onStart}>
            <Play className="w-4 h-4 mr-2" />
            Start Course
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

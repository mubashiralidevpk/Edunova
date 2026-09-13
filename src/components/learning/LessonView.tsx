import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  BookOpen, 
  Clock,
  Zap,
  Trophy
} from 'lucide-react';
import type { Course, CourseLesson, StudentLessonProgress } from '@/types/learning';
import ReactMarkdown from 'react-markdown';

interface LessonViewProps {
  course: Course;
  lessons: CourseLesson[];
  lessonProgress: StudentLessonProgress[];
  currentLessonIndex: number;
  onComplete: (lessonId: string, xpReward: number) => void;
  onNavigate: (index: number) => void;
  onBack: () => void;
}

export function LessonView({ 
  course, 
  lessons, 
  lessonProgress, 
  currentLessonIndex, 
  onComplete, 
  onNavigate,
  onBack 
}: LessonViewProps) {
  const [showCongrats, setShowCongrats] = useState(false);
  const currentLesson = lessons[currentLessonIndex];
  
  const isLessonCompleted = (lessonId: string) => 
    lessonProgress.some(p => p.lesson_id === lessonId && p.is_completed);
  
  const completedCount = lessonProgress.filter(p => p.is_completed).length;
  const progressPercent = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;
  const isCourseComplete = completedCount === lessons.length;

  const handleCompleteLesson = () => {
    if (!currentLesson || isLessonCompleted(currentLesson.id)) return;
    
    onComplete(currentLesson.id, currentLesson.xp_reward);
    
    // Show congrats if course complete
    if (completedCount + 1 === lessons.length) {
      setShowCongrats(true);
    }
  };

  const handleNext = () => {
    if (currentLessonIndex < lessons.length - 1) {
      onNavigate(currentLessonIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentLessonIndex > 0) {
      onNavigate(currentLessonIndex - 1);
    }
  };

  if (!currentLesson) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-muted-foreground">No lessons available</p>
          <Button variant="outline" className="mt-4" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showCongrats) {
    return (
      <Card className="text-center py-12 bg-gradient-to-br from-primary/10 to-accent/10">
        <CardContent className="space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Course Complete! 🎉
            </h2>
            <p className="text-muted-foreground mt-2">
              You've completed "{course.title}"
            </p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="bg-primary/10 rounded-xl px-6 py-3">
              <p className="text-sm text-muted-foreground">Total XP Earned</p>
              <p className="text-2xl font-bold text-primary">+{course.xp_reward}</p>
            </div>
            <div className="bg-primary/10 rounded-xl px-6 py-3">
              <p className="text-sm text-muted-foreground">Lessons Completed</p>
              <p className="text-2xl font-bold text-primary">{lessons.length}</p>
            </div>
          </div>
          <Button size="lg" onClick={onBack}>
            Continue Learning
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {currentLesson.duration_minutes || 10} min
          </div>
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <Zap className="w-4 h-4" />
            +{currentLesson.xp_reward} XP
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{course.title}</span>
          <span className="text-muted-foreground">
            Lesson {currentLessonIndex + 1} of {lessons.length}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Lesson Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {lessons.map((lesson, index) => (
          <button
            key={lesson.id}
            onClick={() => onNavigate(index)}
            className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
              ${index === currentLessonIndex 
                ? 'border-primary bg-primary text-primary-foreground' 
                : isLessonCompleted(lesson.id)
                ? 'border-green-500 bg-green-500/10 text-green-500'
                : 'border-muted bg-muted/50 text-muted-foreground hover:border-primary/50'
              }
            `}
          >
            {isLessonCompleted(lesson.id) ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <span className="text-sm font-medium">{index + 1}</span>
            )}
          </button>
        ))}
      </div>

      {/* Lesson Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{currentLesson.title}</CardTitle>
              <p className="text-sm text-muted-foreground capitalize">
                {currentLesson.lesson_type} Lesson
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>
            {currentLesson.content || 'Lesson content coming soon!'}
          </ReactMarkdown>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={handlePrev}
          disabled={currentLessonIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex gap-2">
          {!isLessonCompleted(currentLesson.id) && (
            <Button onClick={handleCompleteLesson}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Lesson (+{currentLesson.xp_reward} XP)
            </Button>
          )}
          
          {currentLessonIndex < lessons.length - 1 && (
            <Button 
              variant={isLessonCompleted(currentLesson.id) ? "default" : "outline"}
              onClick={handleNext}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLearning } from '@/hooks/useLearning';
import { XPProgressBar } from '@/components/learning/XPProgressBar';
import { CourseCard } from '@/components/learning/CourseCard';
import { CategoryFilter } from '@/components/learning/CategoryFilter';
import { AchievementBadge } from '@/components/learning/AchievementBadge';
import { LessonView } from '@/components/learning/LessonView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Trophy, TrendingUp, Gamepad2 } from 'lucide-react';
import type { Course, CourseLesson, StudentLessonProgress } from '@/types/learning';

export default function StudentLearning() {
  const {
    categories,
    courses,
    studentXP,
    achievements,
    earnedAchievements,
    courseProgress,
    loading,
    fetchCourseLessons,
    fetchLessonProgress,
    startCourse,
    completeLesson,
    getCourseProgress,
    refreshData
  } = useLearning();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLessons, setActiveLessons] = useState<CourseLesson[]>([]);
  const [activeLessonProgress, setActiveLessonProgress] = useState<StudentLessonProgress[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'browse' | 'lesson'>('browse');

  const filteredCourses = selectedCategory
    ? courses.filter(c => c.category_id === selectedCategory)
    : courses;

  const inProgressCourses = courses.filter(c => {
    const progress = getCourseProgress(c.id);
    return progress && !progress.completed_at;
  });

  const completedCourses = courses.filter(c => {
    const progress = getCourseProgress(c.id);
    return progress?.completed_at;
  });

  const handleStartCourse = async (course: Course) => {
    await startCourse(course.id);
    await openCourse(course);
  };

  const openCourse = async (course: Course) => {
    const lessons = await fetchCourseLessons(course.id);
    const lessonProgress = await fetchLessonProgress(course.id);
    
    setActiveCourse(course);
    setActiveLessons(lessons);
    setActiveLessonProgress(lessonProgress);
    
    // Find the first incomplete lesson
    const firstIncomplete = lessons.findIndex(l => 
      !lessonProgress.some(p => p.lesson_id === l.id && p.is_completed)
    );
    setCurrentLessonIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    setViewMode('lesson');
  };

  const handleCompleteLesson = async (lessonId: string, xpReward: number) => {
    if (!activeCourse) return;
    
    await completeLesson(lessonId, activeCourse.id, xpReward);
    
    // Refresh lesson progress
    const lessonProgress = await fetchLessonProgress(activeCourse.id);
    setActiveLessonProgress(lessonProgress);
  };

  const handleBackToBrowse = () => {
    setViewMode('browse');
    setActiveCourse(null);
    refreshData();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (viewMode === 'lesson' && activeCourse) {
    return (
      <DashboardLayout>
        <LessonView
          course={activeCourse}
          lessons={activeLessons}
          lessonProgress={activeLessonProgress}
          currentLessonIndex={currentLessonIndex}
          onComplete={handleCompleteLesson}
          onNavigate={setCurrentLessonIndex}
          onBack={handleBackToBrowse}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Gamepad2 className="w-8 h-8 text-primary" />
              Learning Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Level up your skills with gamified courses
            </p>
          </div>
        </div>

        {/* XP Progress */}
        <XPProgressBar studentXP={studentXP} />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{inProgressCourses.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedCourses.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Achievements</p>
                <p className="text-2xl font-bold">{earnedAchievements.length}/{achievements.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {achievements.map(achievement => {
                const earned = earnedAchievements.find(e => e.achievement_id === achievement.id);
                return (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    earned={!!earned}
                    earnedAt={earned?.earned_at}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Course Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Courses</TabsTrigger>
            <TabsTrigger value="progress">In Progress ({inProgressCourses.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedCourses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  category={categories.find(c => c.id === course.category_id)}
                  progress={getCourseProgress(course.id)}
                  onStart={() => handleStartCourse(course)}
                  onContinue={() => openCourse(course)}
                />
              ))}
            </div>
            
            {filteredCourses.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No courses available in this category yet.
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  category={categories.find(c => c.id === course.category_id)}
                  progress={getCourseProgress(course.id)}
                  onStart={() => handleStartCourse(course)}
                  onContinue={() => openCourse(course)}
                />
              ))}
            </div>
            
            {inProgressCourses.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No courses in progress. Start learning today!
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  category={categories.find(c => c.id === course.category_id)}
                  progress={getCourseProgress(course.id)}
                  onStart={() => handleStartCourse(course)}
                  onContinue={() => openCourse(course)}
                />
              ))}
            </div>
            
            {completedCourses.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No completed courses yet. Keep learning!
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

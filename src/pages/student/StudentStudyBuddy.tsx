import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PersistentChatPanel } from '@/components/ai/PersistentChatPanel';
import { useAuth } from '@/contexts/AuthContext';

export default function StudentStudyBuddy() {
  const { user } = useAuth();
  return (
    <DashboardLayout>
      <PersistentChatPanel
        assistantType="student"
        title="StudyPal"
        subtitle="AI Study Buddy"
        accent="accent"
        context={{ studentName: user?.user_metadata?.full_name || 'Student' }}
        emptyHeading="Hey there! 👋"
        emptyBody="I'm StudyPal, your AI study buddy! Ask me anything about homework or tricky concepts. 🎉"
        placeholder="Ask me anything... 💭"
        quickPrompts={[
          'Help me understand fractions 📐',
          'Create a study plan for my exam 📚',
          "I'm stressed about homework 😰",
          'Explain photosynthesis simply 🌱',
        ]}
      />
    </DashboardLayout>
  );
}

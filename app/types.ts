export type Category = { id: string; name: string; weight: number };
export type Grade = { id: string; categoryId: string; value: number; multiplier: number; date: string; label: string };
export type Subject = { id: string; name: string; target: number; categories: Category[]; grades: Grade[]; notes: string };
export type TaskStatus = 'open' | 'done';
export type Task = { id: string; title: string; subjectId: string | null; dueDate: string | null; duration: number; importance: number; status: TaskStatus; notes: string };
export type Exam = { id: string; subjectId: string; title: string; date: string; topics: string; estimatedMinutes: number; progress: number };
export type EventItem = { id: string; title: string; date: string; start: string; duration: number; type: 'school' | 'private' | 'study' | 'sport' | 'other' };
export type Habit = { id: string; name: string; days: number[]; logs: string[] };
export type Workout = { id: string; type: string; date: string; duration: number; distance: number | null; notes: string };
export type Goal = { id: string; title: string; category: string; progress: number; targetDate: string | null; notes: string };
export type MemoryItem = { id: string; text: string; createdAt: string };
export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; createdAt: string };
export type Profile = {
  name: string;
  schoolType: string;
  classLevel: string;
  state: string;
  targetAverage: number;
  focusMinutes: number;
  weeklySportTarget: number;
  weekdayHomeTimes: Record<string, string>;
};
export type DayPlanBlock = { id: string; title: string; start: string; duration: number; kind: string; sourceId?: string };
export type AppState = {
  version: 5;
  onboardingDone: boolean;
  profile: Profile;
  subjects: Subject[];
  tasks: Task[];
  exams: Exam[];
  events: EventItem[];
  habits: Habit[];
  workouts: Workout[];
  goals: Goal[];
  memory: MemoryItem[];
  chat: ChatMessage[];
  dayPlan: DayPlanBlock[];
};

export type OsAction =
  | { type: 'add_subject'; payload: { name: string; target: number; categories: { name: string; weight: number }[] } }
  | { type: 'update_subject'; payload: { subjectId: string; name: string | null; target: number | null; categories: { name: string; weight: number }[] | null; notes: string | null } }
  | { type: 'add_grade'; payload: { subjectId: string; categoryId: string; value: number; multiplier: number; date: string; label: string } }
  | { type: 'add_exam'; payload: { subjectId: string; title: string; date: string; topics: string; estimatedMinutes: number } }
  | { type: 'add_task'; payload: { title: string; subjectId: string | null; dueDate: string | null; duration: number; importance: number; notes: string } }
  | { type: 'update_task'; payload: { taskId: string; title: string | null; dueDate: string | null; duration: number | null; importance: number | null; notes: string | null; status: 'open' | 'done' | null } }
  | { type: 'add_event'; payload: { title: string; date: string; start: string; duration: number; eventType: EventItem['type'] } }
  | { type: 'log_workout'; payload: { workoutType: string; date: string; duration: number; distance: number | null; notes: string } }
  | { type: 'remember'; payload: { text: string } }
  | { type: 'set_day_plan'; payload: { blocks: DayPlanBlock[] } };

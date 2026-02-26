import Link from 'next/link';
import { ListTodo } from 'lucide-react';

/**
 * Home Component
 * 
 * This component renders the main landing page of the application as an App Icons Grid.
 * It serves as a central launchpad for various modules within the SaaS Boilerplate.
 * Currently, it features the "To Do" application icon which navigates users to their ToDo app.
 * 
 * Features:
 * - Responsive grid layout that adapts to different screen sizes.
 * - Dynamic, modern styling with subtle hover micro-animations and gradients.
 * - Accessible navigation link via Next.js <Link>.
 * 
 * @returns React Server Component for the home page.
 */
export default async function Home() {
  return (
    <main className="min-h-[calc(100vh-4rem)] p-6 sm:p-12 md:p-24 bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-12 text-foreground/80 tracking-tight">
          My Apps
        </h1>

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-10">
          <Link
            href="/todo"
            className="flex flex-col items-center justify-center gap-3 group focus:outline-none w-full aspect-square max-w-[6.5rem] sm:max-w-[7.5rem] rounded-[1.25rem] sm:rounded-[1.5rem] border border-blue-500/30 bg-background text-blue-500 shadow-sm hover:border-blue-500/60 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all duration-300 ease-out"
            aria-label="Open To Do App"
          >
            <ListTodo className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 transition-transform group-hover:scale-110 duration-300" />
            <span className="text-xs sm:text-sm font-medium">
              To Do
            </span>
          </Link>

          {/* Future apps can be added here following the same pattern */}
        </div>
      </div>
    </main>
  );
}
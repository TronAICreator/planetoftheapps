"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProgress, getCompletionPercentage, getLessonProgress } from "../utils/progress";

export default function WorkspaceSidebar({ lessons = [], currentLesson }) {
    const pathname = usePathname();
    const lessonsList = lessons || [];

    const progress = getProgress();
    const completionPercentage = getCompletionPercentage();

    return (
        <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
            {/* User Progress Section */}
            <div className="p-4 border-b border-gray-200">
                <div className="font-medium text-gray-900">Your Progress</div>
                <div className="mt-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-brand-blue h-2 rounded-full" 
                                style={{ width: `${completionPercentage}%` }} 
                            />
                        </div>
                        <span>{completionPercentage}%</span>
                    </div>
                </div>
            </div>

            {/* Lessons List */}
            <nav className="flex-1 overflow-y-auto p-4">
                <div className="font-medium text-gray-900 mb-2">Lessons</div>
                <div className="space-y-1">
                    {lessonsList.map((lesson) => {
                        const { completed, isCurrentLesson } = getLessonProgress(lesson.id);
                        return (
                            <Link
                                key={lesson.id}
                                href={`/workspace/lesson/${lesson.id}`}
                                className={`block px-3 py-2 rounded-lg text-sm ${
                                    isCurrentLesson
                                        ? 'bg-brand-light text-brand-blue font-medium'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {lesson.title}
                                {completed && (
                                    <span className="ml-2 text-green-500">✓</span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* User Menu */}
            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center font-medium">
                        U
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">User Name</div>
                        <div className="text-xs text-gray-500 truncate">user@example.com</div>
                    </div>
                </div>
                <button 
                    onClick={() => {/* handle logout */}} 
                    className="mt-2 text-sm text-gray-600 hover:text-gray-900"
                >
                    Sign out
                </button>
            </div>
        </div>
    );
}
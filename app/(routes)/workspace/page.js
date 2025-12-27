"use client";
import Link from "next/link";

import { getProgress } from "../../../utils/progress";

export default function WorkspacePage() {
    const progress = getProgress();

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Welcome Section */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Welcome to Your Phonics Journey!
                </h1>
                <p className="text-lg text-gray-600">
                    Let&apos;s continue learning and having fun with phonics.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 mb-12">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="text-2xl font-bold text-brand-blue mb-2">
                        {progress.completedLessons.length}
                    </div>
                    <div className="text-gray-600">Lessons Completed</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="text-2xl font-bold text-brand-green mb-2">
                        {progress.totalPracticeMinutes}
                    </div>
                    <div className="text-gray-600">Practice Minutes</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <div className="text-2xl font-bold text-brand-yellow mb-2">
                        {progress.streakDays}
                    </div>
                    <div className="text-gray-600">Days Streak</div>
                </div>
            </div>

            {/* Continue Learning Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Continue Learning
                </h2>
                {progress.currentLesson ? (
                    <div className="bg-brand-light rounded-lg p-4 flex items-center justify-between">
                        <div>
                            <div className="text-lg font-medium text-gray-900 mb-1">
                                {/* In production, fetch lesson title from API/database */}
                                Short Vowel Sounds
                            </div>
                            <div className="text-sm text-gray-600">
                                Continue with Lesson {progress.currentLesson}
                            </div>
                        </div>
                        <Link
                            href={`/workspace/lesson/${progress.currentLesson}`}
                            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors"
                        >
                            Continue
                        </Link>
                    </div>
                ) : (
                    <div className="text-center p-4 text-gray-600">
                        No lessons in progress. Start a new lesson from the sidebar!
                    </div>
                )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Recent Activity
                </h2>
                {progress.completedLessons.length > 0 || progress.currentLesson ? (
                    <div className="space-y-4">
                        {progress.completedLessons.slice(-3).map((lessonId) => (
                            <div key={lessonId} className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">
                                        Completed Lesson {lessonId}
                                    </div>
                                    <div className="text-xs text-gray-500">Recently</div>
                                </div>
                            </div>
                        ))}
                        {progress.currentLesson && (
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">
                                        Started Lesson {progress.currentLesson}
                                    </div>
                                    <div className="text-xs text-gray-500">In Progress</div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center text-gray-600">
                        No activity yet. Start your first lesson!
                    </div>
                )}
            </div>
        </div>
    );
}
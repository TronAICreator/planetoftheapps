"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { updateProgress, getLessonProgress } from "../../../../../utils/progress";

export default function LessonPage({ params }) {
    const router = useRouter();
    const { id } = params;
    const { completed } = getLessonProgress(id);

    useEffect(() => {
        // Update progress when lesson is accessed
        if (!completed) {
            updateProgress(id);
        }
    }, [id, completed]);

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Lesson Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        ← Back
                    </button>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => {
                                // In production: fetch previous lesson ID from API
                                const prevId = parseInt(id) - 1;
                                if (prevId > 0) {
                                    router.push(`/workspace/lesson/${prevId}`);
                                }
                            }}
                            className="px-4 py-2 text-gray-600 hover:text-gray-900"
                        >
                            Previous Lesson
                        </button>
                        {completed ? (
                            <button 
                                onClick={() => {
                                    // In production: fetch next lesson ID from API
                                    const nextId = parseInt(id) + 1;
                                    router.push(`/workspace/lesson/${nextId}`);
                                }}
                                className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark"
                            >
                                Next Lesson
                            </button>
                        ) : (
                            <button 
                                onClick={() => {
                                    updateProgress(id, true, 5); // Add 5 minutes of practice time
                                    // In production: fetch next lesson ID from API
                                    const nextId = parseInt(id) + 1;
                                    router.push(`/workspace/lesson/${nextId}`);
                                }}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            >
                                Complete & Continue
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Lesson Content */}
            <div className="bg-white rounded-xl shadow-sm p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">
                    Lesson {id}: Short Vowel Sounds
                </h1>

                {/* Lesson Progress */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-600">Progress</div>
                        <div className="text-sm font-medium text-gray-900">2/5 Steps</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-brand-blue h-2 rounded-full" 
                            style={{ width: '40%' }} 
                        />
                    </div>
                </div>

                {/* Lesson Steps */}
                <div className="space-y-6">
                    <div className="p-6 bg-brand-light rounded-lg">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Step 1: Introduction to Short Vowels
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Let&apos;s learn about the short vowel sounds! These are the quick, 
                            short sounds that vowels make in many words.
                        </p>
                        <div className="grid grid-cols-5 gap-4">
                            {['A', 'E', 'I', 'O', 'U'].map((vowel) => (
                                <button
                                    key={vowel}
                                    className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="text-2xl font-bold text-brand-blue mb-2">
                                        {vowel}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Click to hear
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-lg">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Step 2: Practice Words
                        </h2>
                        <div className="grid grid-cols-3 gap-4">
                            {['cat', 'bed', 'pig', 'pot', 'cup'].map((word) => (
                                <button
                                    key={word}
                                    className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
                                >
                                    <div className="text-xl font-medium text-gray-900 mb-2">
                                        {word}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Click to practice
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
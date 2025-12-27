// Mock data storage (replace with actual database in production)
let userProgress = {
    completedLessons: [],
    currentLesson: null,
    lastAccessed: null,
    streakDays: 0,
    totalPracticeMinutes: 0
};

export function getProgress() {
    // In production, fetch from API/database
    return userProgress;
}

export function updateProgress(lessonId, completed = false, practiceMinutes = 0) {
    const now = new Date();
    
    // Update completed lessons
    if (completed && !userProgress.completedLessons.includes(lessonId)) {
        userProgress.completedLessons.push(lessonId);
    }

    // Update current lesson if not completed
    if (!completed) {
        userProgress.currentLesson = lessonId;
    }

    // Update practice time
    userProgress.totalPracticeMinutes += practiceMinutes;

    // Update last accessed and streak
    const lastDate = userProgress.lastAccessed ? new Date(userProgress.lastAccessed) : null;
    if (lastDate) {
        const dayDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
            // Consecutive day, increase streak
            userProgress.streakDays++;
        } else if (dayDiff > 1) {
            // Streak broken
            userProgress.streakDays = 1;
        }
    } else {
        // First time accessing
        userProgress.streakDays = 1;
    }
    userProgress.lastAccessed = now.toISOString();

    // In production, save to API/database
    return userProgress;
}

export function getLessonProgress(lessonId) {
    return {
        completed: userProgress.completedLessons.includes(lessonId),
        isCurrentLesson: userProgress.currentLesson === lessonId
    };
}

export function getCompletionPercentage() {
    // In production, fetch total lesson count from API/database
    const totalLessons = 20; // Example total
    return Math.round((userProgress.completedLessons.length / totalLessons) * 100);
}
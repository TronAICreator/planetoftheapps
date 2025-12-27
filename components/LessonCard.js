import Link from "next/link";

export default function LessonCard({ lesson }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 hover:shadow-sm bg-white">
      <h3 className="font-semibold text-lg">{lesson.title}</h3>
      <p className="mt-2 text-gray-600">{lesson.summary}</p>
      <Link href={`/lesson/${lesson.id}`} className="inline-block mt-3 no-underline btn-outline-multicolor">
        Open Lesson →
      </Link>
    </div>
  );
}
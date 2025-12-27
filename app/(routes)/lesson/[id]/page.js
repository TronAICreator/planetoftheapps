import lessons from "../../../../data/lessons.json";

export async function generateStaticParams() {
  return lessons.map(l => ({ id: l.id }));
}

export default function LessonDetail({ params }) {
  const lesson = lessons.find(l => l.id === params.id);
  if (!lesson) {
    return <div className="mx-auto max-w-3xl px-4 py-10">Lesson not found.</div>;
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-brand-blue">{lesson.title}</h1>
      <p className="mt-4 text-gray-800 whitespace-pre-wrap">{lesson.content}</p>
    </div>
  );
}
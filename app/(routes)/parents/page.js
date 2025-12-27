export const metadata = { title: "Parents | Phonics Academy" };

export default function ParentsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-brand-blue">Guide for Parents</h1>
      <ol className="mt-6 space-y-4 list-decimal list-inside text-gray-800">
        <li>Start with VC chunks: say and tap the last two letters together (/at/, /in/, /ap/).</li>
        <li>Add one beginning consonant and blend: c + at → <strong>cat</strong>.</li>
        <li>Keep sessions short (5–10 minutes) and celebrate wins.</li>
        <li>Revisit tricky chunks tomorrow—small steps build mastery.</li>
      </ol>
    </div>
  );
}
export const metadata = { title: "Students | Phonics Academy" };

export default function StudentsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-brand-blue">For Students</h1>
      <p className="mt-4 text-gray-800">
        Read the last two letters first (VC), then add the first sound. You got this!
      </p>
      <ul className="mt-6 space-y-2 list-disc list-inside text-gray-800">
        <li>VC first: <em>at</em>, <em>in</em>, <em>ap</em></li>
        <li>Add one sound: c + at → cat</li>
        <li>Say it smoothly, then read it fast</li>
      </ul>
    </div>
  );
}
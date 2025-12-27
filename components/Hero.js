export default function Hero() {
  return (
    <section className="pt-28 pb-12 bg-gradient-to-b from-brand-light/60 to-transparent">
      <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="font-display text-5xl leading-tight text-brand-blue">Phonics Academy</h1>
          <p className="mt-4 text-lg text-gray-700 max-w-prose">
            Fun, structured phonics lessons for kids—built on a proven VC → CVC blending pathway.
          </p>
          <div className="mt-6 flex gap-3">
            <a href="/lessons" className="no-underline btn-multicolor">
              Explore Lessons
            </a>
            <a href="/parents" className="no-underline btn-outline-multicolor">
              Guide for Parents
            </a>
          </div>
        </div>
        <div className="rounded-2xl border border-brand-blue/20 p-6 bg-white shadow-sm">
          <ul className="space-y-3 text-gray-700">
            <li>✅ Start with VC chunks to build confidence</li>
            <li>✅ Progress naturally to CVC blending</li>
            <li>✅ Short, engaging practice for busy families</li>
            <li>✅ Desktop, tablet, and mobile friendly</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
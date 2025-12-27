import Hero from "../components/Hero";

export default function HomePage() {
  return (
    <div>
      <Hero />
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="font-display text-3xl text-brand-blue">How it works</h2>
        <p className="mt-3 text-gray-700 max-w-prose">
          Begin with simple vowel-consonant (VC) patterns like <em>at</em>, <em>it</em>, and <em>in</em>—then add
          a starting consonant to build CVC words like <em>cat</em>, <em>sit</em>, and <em>pin</em>.
        </p>
      </section>
    </div>
  );
}
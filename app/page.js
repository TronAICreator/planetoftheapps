export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-28 pb-12 bg-gradient-to-b from-blue-50 to-transparent">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h1 className="text-6xl font-bold text-blue-600 mb-6" style={{fontSize: '36px'}}>
            🎓 Phonics Academy
          </h1>
          <p className="text-xl text-gray-700 mb-8" style={{fontSize: '22px'}}>
            Fun, structured phonics lessons for kids—built on a proven VC → CVC blending pathway.
          </p>
          <div className="flex gap-4 justify-center">
            <a 
              href="/lessons" 
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              style={{fontSize: '24px'}}
            >
              🚀 Start Learning
            </a>
            <a 
              href="/parents" 
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              style={{fontSize: '24px'}}
            >
              📋 Parent Guide
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold text-blue-600 mb-8 text-center" style={{fontSize: '26px'}}>
          How Phonics Academy Works
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="font-semibold text-gray-800 mb-2" style={{fontSize: '22px'}}>
              Start with VC Patterns
            </h3>
            <p className="text-gray-600" style={{fontSize: '16px'}}>
              Begin with simple vowel-consonant chunks like "at", "it", "in"
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <div className="text-4xl mb-4">🔤</div>
            <h3 className="font-semibold text-gray-800 mb-2" style={{fontSize: '22px'}}>
              Build CVC Words
            </h3>
            <p className="text-gray-600" style={{fontSize: '16px'}}>
              Add consonants to create complete words like "cat", "sit", "pin"
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <div className="text-4xl mb-4">🎵</div>
            <h3 className="font-semibold text-gray-800 mb-2" style={{fontSize: '22px'}}>
              Interactive Audio
            </h3>
            <p className="text-gray-600" style={{fontSize: '16px'}}>
              Hover over words to hear pronunciation and practice sounds
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
            <div className="text-4xl mb-4">⏱️</div>
            <h3 className="font-semibold text-gray-800 mb-2" style={{fontSize: '22px'}}>
              Short Sessions
            </h3>
            <p className="text-gray-600" style={{fontSize: '16px'}}>
              Engaging 10-15 minute lessons perfect for busy families
            </p>
          </div>
        </div>
      </section>

      {/* Navigation Section */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-8" style={{fontSize: '26px'}}>
            Ready to Get Started?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <a 
              href="/students" 
              className="bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-lg block transition-colors"
            >
              <div className="text-3xl mb-2">👦</div>
              <h3 className="font-semibold mb-2" style={{fontSize: '22px'}}>For Students</h3>
              <p style={{fontSize: '16px'}}>Interactive lessons and phonics practice</p>
            </a>

            <a 
              href="/parents" 
              className="bg-green-500 hover:bg-green-600 text-white p-6 rounded-lg block transition-colors"
            >
              <div className="text-3xl mb-2">👨‍👩‍👧‍👦</div>
              <h3 className="font-semibold mb-2" style={{fontSize: '22px'}}>For Parents</h3>
              <p style={{fontSize: '16px'}}>Guide to supporting your child's learning</p>
            </a>

            <a 
              href="/login" 
              className="bg-purple-500 hover:bg-purple-600 text-white p-6 rounded-lg block transition-colors"
            >
              <div className="text-3xl mb-2">🔐</div>
              <h3 className="font-semibold mb-2" style={{fontSize: '22px'}}>Login</h3>
              <p style={{fontSize: '16px'}}>Access your account and progress</p>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
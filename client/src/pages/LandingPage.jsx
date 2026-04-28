import { Link } from 'react-router-dom'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'

function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Floating dark mode toggle */}
      <div className="fixed bottom-4 left-4 z-50">
        <DarkModeToggle size="sm" />
      </div>

      {/* Main content area */}
      <div className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-700 dark:to-purple-800 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Movie List
            </h1>
            <p className="text-xl md:text-2xl text-indigo-100 mb-8">
              The easiest way to agree on what to watch
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold py-3 px-8 rounded-lg shadow-lg transition-colors"
              >
                Get Started — It's Free
              </Link>
              <Link
                to="/login"
                className="bg-indigo-500 text-white hover:bg-indigo-400 font-semibold py-3 px-8 rounded-lg shadow-lg transition-colors border border-indigo-400"
              >
                Login
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-white dark:bg-gray-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-12">
              Everything you need for movie night
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1: Collaborative Queue */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                <div className="flex justify-center mb-4">
                  <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Collaborative Queue
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Build a shared watchlist with your friends.
                </p>
              </div>

              {/* Feature 2: Friends & Groups */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                <div className="flex justify-center mb-4">
                  <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Friends & Groups
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Create groups and invite friends for movie nights.
                </p>
              </div>

              {/* Feature 3: TMDB Powered */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                <div className="flex justify-center mb-4">
                  <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  TMDB Powered
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Access movie details, ratings, posters, and trailers from The Movie Database.
                </p>
              </div>

              {/* Feature 4: Dark Mode */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                <div className="flex justify-center mb-4">
                  <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Dark Mode
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Easy on the eyes during those late-night movie browsing sessions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-12">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                  Create an Account
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Sign up in seconds and start building your movie profile.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                  Add Friends
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Invite your friends and create groups for movie nights.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                  Build Your Queue
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Search movies, add them to your queue, and agree on what to watch.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 px-4 bg-indigo-600 dark:bg-indigo-700">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-indigo-100 mb-8 text-lg">
              Join Movie List today — it's completely free.
            </p>
            <Link
              to="/register"
              className="inline-block bg-white text-indigo-700 hover:bg-indigo-50 font-semibold py-3 px-8 rounded-lg shadow-lg transition-colors"
            >
              Get Started — It's Free
            </Link>
          </div>
        </section>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default LandingPage

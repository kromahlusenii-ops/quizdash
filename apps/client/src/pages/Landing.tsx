import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-3 tracking-tight">
          Financial Wellness
        </h1>
        <p className="text-lg text-purple-200 mb-2">
          A finance quiz wrapped in Pac-Man.
        </p>
        <p className="text-sm text-purple-300/80 mb-10 max-w-md mx-auto">
          Your instructor hands out a 6-letter code. You play. Questions pop up as you
          chase dots. Answer right to turn the ghosts blue — answer wrong and lose a life.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/join')}
            className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white text-lg font-bold rounded-xl shadow-lg transition-transform hover:scale-105"
          >
            I have a code
          </button>
          <button
            onClick={() => navigate('/instructor/login')}
            className="px-8 py-4 bg-white/10 hover:bg-white/15 text-white text-lg font-medium rounded-xl border border-white/20 transition-colors"
          >
            I'm running a session
          </button>
        </div>
      </div>
    </div>
  );
}

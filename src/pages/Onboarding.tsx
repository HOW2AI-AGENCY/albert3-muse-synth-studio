import { useNavigate } from "react-router-dom"
import { AudioWaveform, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Onboarding() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen antialiased bg-neutral-950 text-zinc-200 selection:bg-indigo-500/30 overflow-x-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[800px] h-[800px] bg-fuchsia-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-blue-900/5 rounded-full blur-[100px]"></div>
      </div>
      <main className="flex flex-wrap xl:flex-nowrap min-h-screen p-8 gap-10 items-center justify-center">
        <div className="relative shrink-0 animate-in fade-in duration-700">
          <div className="w-[390px] h-[844px] bg-black rounded-[50px] shadow-2xl border-[8px] border-zinc-900 overflow-hidden relative flex flex-col justify-between">
            <div className="absolute inset-0 bg-[url(https://grainy-gradients.vercel.app/noise.svg)] opacity-20 z-0"></div>
            <div className="absolute top-0 w-full h-[60%] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent z-0"></div>
            <div className="relative z-10 pt-20 px-6 flex flex-col items-center text-center h-full">
              <div className="mt-12 mb-auto">
                <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-[0_0_100px_rgba(99,102,241,0.3)]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent"></div>
                    <AudioWaveform className="text-white" size={80} strokeWidth={1} />
                  </div>
                </div>
              </div>
              <div className="pb-16 w-full animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 mb-6 backdrop-blur-md">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
                  <span className="text-[10px] uppercase font-medium text-zinc-300 tracking-wide">v2.0 Now Live</span>
                </div>
                <h1 className="text-4xl font-semibold text-white tracking-tighter mb-3">
                  Музыка с
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400"> Интеллектом</span>
                </h1>
                <p className="leading-relaxed text-sm text-zinc-500 mb-10 px-4">
                  Генерация, разделение на стемы, продление треков и создание кавер-версий, управление проектами
                </p>
                <Button
                  className="group relative w-full h-14 rounded-2xl bg-white text-black font-medium text-sm tracking-wide overflow-hidden transition-transform active:scale-95 hover:bg-white"
                  onClick={() => navigate("/auth")}
                >
                  <span className="flex items-center justify-center gap-2 relative">
                    Войти в Студию
                    <ArrowRight className="transition-transform group-hover:translate-x-1" size={16} />
                  </span>
                </Button>
                <p className="mt-6 text-[10px] text-zinc-600">By continuing you agree to our Terms of Audio Synthesis.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
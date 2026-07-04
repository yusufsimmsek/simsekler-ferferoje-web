import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

export function Login({ onLogin }) {
  return (
    <div className="min-h-screen bg-[#111] p-0 text-white md:p-4">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] overflow-hidden rounded-none bg-snow-shell shadow-snow md:min-h-[calc(100vh-32px)] md:rounded-snow lg:grid-cols-[1fr_460px]">
        <section className="relative hidden overflow-hidden border-r border-snow-line p-12 lg:block">
          <div className="absolute inset-0 snow-grid opacity-40" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-snow-ice text-snow-shell">P</div>
              <span className="text-sm font-medium">ParselIQ</span>
            </div>
            <div>
              <div className="mb-4 inline-flex rounded-lg bg-white/8 px-3 py-1.5 text-sm text-white/62">Premium architecture cockpit</div>
              <h1 className="max-w-[650px] text-5xl font-semibold leading-[1.05]">
                Kentsel donusum otomasyonunu tek mimari kontrol yuzeyinde yonet.
              </h1>
              <p className="mt-5 max-w-[540px] text-sm leading-6 text-white/45">
                Parsel, imar, metraj, mevzuat, yerlesim, paylasim ve markali teklif paketleri Snow UI standardinda tek panelde.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {["Mevzuat", "Yerlesim", "Offer"].map((item, index) => (
                <div key={item} className={`rounded-card p-5 text-snow-shell ${["bg-snow-blue", "bg-snow-ice", "bg-snow-violet"][index]}`}>
                  <div className="text-sm font-semibold">{item}</div>
                  <div className="mt-4 text-2xl font-semibold">{[8, 27, 3][index]}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid place-items-center px-6 py-12">
          <div className="w-full max-w-[360px]">
            <div className="mb-8 lg:hidden">
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-snow-ice text-snow-shell">P</div>
              <h1 className="text-3xl font-semibold">ParselIQ</h1>
            </div>
            <h2 className="text-2xl font-semibold">Sign in</h2>
            <p className="mt-2 text-sm text-white/42">Use your project control account.</p>

            <form className="mt-8 space-y-4" onSubmit={(event) => { event.preventDefault(); onLogin?.(); }}>
              <label className="block">
                <span className="mb-2 block text-sm text-white/60">Email</span>
                <span className="flex h-11 items-center gap-3 rounded-xl border border-snow-line bg-white/6 px-3">
                  <Mail size={17} className="text-white/38" />
                  <input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/25" placeholder="team@ilkbahar.com" />
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-white/60">Password</span>
                <span className="flex h-11 items-center gap-3 rounded-xl border border-snow-line bg-white/6 px-3">
                  <LockKeyhole size={17} className="text-white/38" />
                  <input type="password" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/25" placeholder="********" />
                </span>
              </label>
              <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-snow-ice text-sm font-semibold text-snow-shell">
                Continue
                <ArrowRight size={17} />
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

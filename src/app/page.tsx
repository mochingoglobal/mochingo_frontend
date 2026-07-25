import { ArrowRight } from "lucide-react";
import Link from "next/link";
import UserLoginButton from "@/components/UserLoginButton";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center relative">
      <div className="flex items-center gap-4 text-white hover:text-indigo-400 transition-colors cursor-pointer group">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase">mochingo</h1>
        <ArrowRight className="w-8 h-8 md:w-12 md:h-12 group-hover:translate-x-2 transition-transform duration-300" />
      </div>
      
      <div className="absolute top-6 right-6">
        <UserLoginButton />
      </div>

      <Link href="/portal-x/login" className="absolute bottom-6 right-6 p-3 text-slate-800 hover:text-slate-400 transition-colors" title="System">
        <ArrowRight className="w-5 h-5" />
      </Link>
    </main>
  );
}

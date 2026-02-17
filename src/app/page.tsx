"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Sun, Zap, LogIn } from "lucide-react";
import { getDefaultRoute } from "@/lib/roles";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      router.push(getDefaultRoute(session.user?.role));
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0f19] to-[#141820]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      senha,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setErro(result.error);
    } else {
      // Redirecionar baseado no role - recarrega a sessao
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0f19] to-[#141820]">
      <div className="w-full max-w-md">
        {/* Logo e Titulo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-lime-400 rounded-2xl mb-4">
            <Sun className="w-8 h-8 text-gray-900" />
          </div>
          <h1 className="text-3xl font-bold text-gray-100">LIV Energia</h1>
          <p className="text-gray-400 mt-2">Sistema de Comissoes</p>
        </div>

        {/* Card de Login */}
        <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <LogIn className="w-5 h-5 text-lime-400" />
            <h2 className="text-xl font-semibold text-gray-100">Entrar</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#141820] border border-[#232a3b] text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#141820] border border-[#232a3b] text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition"
                placeholder="Sua senha"
                required
              />
            </div>

            {erro && (
              <div className="bg-red-400/10 text-red-400 px-4 py-3 rounded-lg text-sm">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-lime-400 text-gray-900 py-3 rounded-lg font-bold hover:bg-lime-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

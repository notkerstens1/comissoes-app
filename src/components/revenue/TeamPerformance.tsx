"use client";

import { formatCurrency, formatNumber } from "@/lib/utils";

interface TeamMember {
  nome: string;
  role: string;
  leads: number;
  reunioes: number;
  propostas: number;
  fechados: number;
  receita: number;
  conversao: number;
  ticketMedio: number;
}

export function TeamPerformance({ team }: { team: TeamMember[] }) {
  if (!team || team.length === 0) return null;

  return (
    <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">Performance do Time</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#232a3b]">
              <th className="text-left text-gray-400 font-medium py-2 px-3">Nome</th>
              <th className="text-center text-gray-400 font-medium py-2 px-2">Leads</th>
              <th className="text-center text-gray-400 font-medium py-2 px-2">Reunioes</th>
              <th className="text-center text-gray-400 font-medium py-2 px-2">Propostas</th>
              <th className="text-center text-gray-400 font-medium py-2 px-2">Fechados</th>
              <th className="text-center text-gray-400 font-medium py-2 px-2">Conv%</th>
              <th className="text-right text-gray-400 font-medium py-2 px-3">Receita</th>
            </tr>
          </thead>
          <tbody>
            {team.map((member) => (
              <tr key={member.nome} className="border-b border-[#232a3b]/50 hover:bg-[#232a3b]/30">
                <td className="py-3 px-3">
                  <div className="text-white font-medium">{member.nome}</div>
                  <div className="text-[10px] text-gray-500">{member.role}</div>
                </td>
                <td className="text-center text-gray-300 py-3 px-2">{formatNumber(member.leads)}</td>
                <td className="text-center text-gray-300 py-3 px-2">{formatNumber(member.reunioes)}</td>
                <td className="text-center text-gray-300 py-3 px-2">{formatNumber(member.propostas)}</td>
                <td className="text-center text-lime-400 font-medium py-3 px-2">{formatNumber(member.fechados)}</td>
                <td className="text-center py-3 px-2">
                  <span className={`font-medium ${member.conversao >= 20 ? "text-lime-400" : member.conversao >= 10 ? "text-amber-400" : "text-red-400"}`}>
                    {member.conversao}%
                  </span>
                </td>
                <td className="text-right text-lime-400 font-medium py-3 px-3">
                  {formatCurrency(member.receita)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

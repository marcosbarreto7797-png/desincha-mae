import type { AtividadeTipo } from "@/types/database";

export const TIPOS: AtividadeTipo[] = [
  "respiracao",
  "mobilidade",
  "fortalecimento",
  "caminhada",
  "autocuidado",
];

export const LABEL_TIPO: Record<AtividadeTipo, string> = {
  respiracao: "Respiração",
  mobilidade: "Mobilidade",
  fortalecimento: "Fortalecimento",
  caminhada: "Caminhada",
  autocuidado: "Autocuidado",
};

export const EMOJI_TIPO: Record<AtividadeTipo, string> = {
  respiracao: "🫁",
  mobilidade: "🤸",
  fortalecimento: "💪",
  caminhada: "🚶",
  autocuidado: "🌸",
};

export const DURACOES = [5, 10, 15];

export function emojiTipo(tipo: string): string {
  return EMOJI_TIPO[tipo as AtividadeTipo] ?? "✨";
}

export function labelTipo(tipo: string): string {
  return LABEL_TIPO[tipo as AtividadeTipo] ?? tipo;
}

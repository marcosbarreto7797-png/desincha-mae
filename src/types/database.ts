// Tipos de domínio do Desincha Mãe.
// Quando o projeto Supabase estiver linkado, dá pra gerar os tipos completos com:
//   npx supabase gen types typescript --linked > src/types/supabase.ts
// Por enquanto, estes tipos espelham o schema de 0001_init.sql.

export type AssinaturaStatus = "ativo" | "inativo";
export type UserRole = "user" | "admin";
export type AtividadeTipo =
  | "respiracao"
  | "mobilidade"
  | "fortalecimento"
  | "caminhada"
  | "autocuidado";
export type CycleStatus = "ativo" | "concluido";
export type Nivel = 1 | 2 | 3;
export type TempoDisponivel = 5 | 10 | 15;

export interface Profile {
  id: string;
  nome: string | null;
  email: string;
  data_inicio: string | null;
  fase_pos_parto: string | null;
  tempo_disponivel: TempoDisponivel | null;
  nivel: Nivel;
  horario_lembrete: string | null;
  lembrete_ativo: boolean;
  status_assinatura: AssinaturaStatus;
  liberacao_medica_confirmada: boolean;
  onboarding_completo: boolean;
  role: UserRole;
  push_subscription: unknown | null;
  created_at: string;
}

export interface Activity {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: AtividadeTipo;
  duracao_min: number;
  nivel: Nivel;
  video_url: string | null;
  instrucoes: string | null;
  ativo: boolean;
  created_at: string;
}

/**
 * Exercício no modelo sequencial (híbrido): os 21 vídeos (Dia 01..21).
 * tipo/duração são opcionais aqui — o "dia" é o próprio vídeo.
 */
export interface Exercicio {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: AtividadeTipo | null;
  duracao_min: number | null;
  nivel: Nivel;
  video_url: string | null;
  instrucoes: string | null;
  ativo: boolean;
  ordem: number | null;
}

export interface PlanTemplate {
  id: string;
  semana_do_ciclo: number; // 1..4
  nivel: Nivel;
  qtd_atividades: number;
  distribuicao: Partial<Record<AtividadeTipo, number>>;
}

export interface Challenge {
  id: string;
  titulo: string;
  descricao: string | null;
  semana_do_ciclo: number;
  nivel: Nivel;
  ativo: boolean;
}

export interface Cycle {
  id: string;
  user_id: string;
  numero: number;
  data_inicio: string;
  status: CycleStatus;
}

export interface UserWeek {
  id: string;
  user_id: string;
  cycle_id: string;
  semana_do_ciclo: number;
  data_inicio: string;
  dia_inicial: number | null; // dia global da sequência em que a semana começa
  adesao_pct: number | null;
  motivo_ajuste: string | null;
  created_at: string;
}

export interface UserPlanItem {
  id: string;
  user_week_id: string;
  activity_id: string;
  data_prevista: string;
  concluido_em: string | null;
}

export interface WebhookLog {
  id: string;
  origem: string;
  event_id: string | null;
  payload_bruto: unknown;
  processado: boolean;
  erro: string | null;
  created_at: string;
}

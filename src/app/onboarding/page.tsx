"use client";

import { useActionState } from "react";
import { concluirOnboarding, type OnboardingState } from "./actions";

const estadoInicial: OnboardingState = {};

const FASES = [
  { v: "0-6sem", label: "Nos primeiros 40 dias" },
  { v: "6-12sem", label: "De 6 a 12 semanas" },
  { v: "3-6m", label: "De 3 a 6 meses" },
  { v: "6m+", label: "6 meses ou mais" },
];

const TEMPOS = [
  { v: "5", label: "5 minutos" },
  { v: "10", label: "10 minutos" },
  { v: "15", label: "15 minutos" },
];

const NIVEIS = [
  { v: "1", label: "Tô começando agora", sub: "Quase não me movimento" },
  { v: "2", label: "Me movimento às vezes", sub: "Uma coisinha ou outra" },
  { v: "3", label: "Já sou bem ativa", sub: "Movimento quase todo dia" },
];

function Opcao({
  name,
  value,
  label,
  sub,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  sub?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="block cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
        required
      />
      <div className="rounded-2xl border border-marca-200 bg-white px-5 py-4 text-lg font-medium text-neutral-700 peer-checked:border-marca-500 peer-checked:bg-marca-50 peer-checked:text-marca-800 peer-checked:ring-2 peer-checked:ring-marca-300">
        {label}
        {sub && <span className="block text-sm font-normal text-neutral-500">{sub}</span>}
      </div>
    </label>
  );
}

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(
    concluirOnboarding,
    estadoInicial
  );

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <h1 className="text-2xl font-bold text-marca-700">Vamos começar 💛</h1>
      <p className="mt-1 text-neutral-600">
        4 perguntinhas pra eu montar sua primeira semana no seu ritmo.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-7">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-lg font-semibold text-neutral-800">
            Faz quanto tempo que o bebê chegou?
          </legend>
          {FASES.map((f) => (
            <Opcao key={f.v} name="fase" value={f.v} label={f.label} />
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-lg font-semibold text-neutral-800">
            Quanto tempo por dia dá pra separar?
          </legend>
          {TEMPOS.map((t) => (
            <Opcao key={t.v} name="tempo" value={t.v} label={t.label} />
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-lg font-semibold text-neutral-800">
            Como você tá de movimento hoje?
          </legend>
          {NIVEIS.map((n) => (
            <Opcao key={n.v} name="nivel" value={n.v} label={n.label} sub={n.sub} />
          ))}
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="horario" className="text-lg font-semibold text-neutral-800">
            Que horas te lembro? <span className="font-normal text-neutral-500">(opcional)</span>
          </label>
          <input
            id="horario"
            name="horario"
            type="time"
            defaultValue="09:00"
            className="campo"
          />
        </div>

        <label className="flex items-start gap-3 rounded-2xl bg-marca-50 p-4">
          <input
            type="checkbox"
            name="liberacao"
            className="mt-1 h-6 w-6 shrink-0 accent-marca-500"
            required
          />
          <span className="text-base text-neutral-700">
            Confirmo que tenho liberação médica para fazer exercícios no
            pós-parto. (Na dúvida, fale com seu médico antes de começar.)
          </span>
        </label>

        {state.erro && (
          <p className="text-center text-base text-red-600">{state.erro}</p>
        )}

        <button type="submit" className="btn-primario" disabled={pending}>
          {pending ? "Montando sua semana..." : "Montar minha semana"}
        </button>
      </form>
    </main>
  );
}

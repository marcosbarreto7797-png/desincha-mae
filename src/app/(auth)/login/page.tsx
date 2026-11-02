"use client";

import { useActionState } from "react";
import { enviarMagicLink, type LoginState } from "./actions";

const estadoInicial: LoginState = { ok: false, mensagem: "" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    enviarMagicLink,
    estadoInicial
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-marca-700">Desincha Mãe</h1>
        <p className="mt-2 text-lg text-neutral-600">
          Seu plano da semana, no seu ritmo.
        </p>
      </div>

      {state.ok ? (
        <div className="rounded-2xl bg-marca-50 p-6 text-center text-lg text-marca-800">
          {state.mensagem}
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <label htmlFor="email" className="text-base font-medium text-neutral-700">
            Seu e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="voce@email.com"
            className="campo"
          />
          <button type="submit" className="btn-primario" disabled={pending}>
            {pending ? "Enviando..." : "Entrar"}
          </button>
          {state.mensagem && !state.ok && (
            <p className="text-center text-base text-red-600">{state.mensagem}</p>
          )}
          <p className="mt-2 text-center text-sm text-neutral-500">
            A gente te manda um link no e-mail. Sem senha pra decorar.
          </p>
        </form>
      )}
    </main>
  );
}

import { sair } from "@/app/(auth)/actions";

/**
 * Tela de reativação — mostrada a quem está logada mas sem assinatura ativa.
 * Rota pública (ver middleware). Tom acolhedor, sem culpa.
 */
export default function ReativarPage() {
  const checkout = process.env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="rounded-2xl bg-marca-50 p-8 text-center">
        <p className="text-4xl">🧡</p>
        <h1 className="mt-3 text-2xl font-bold text-marca-700">
          Sua assinatura está pausada
        </h1>
        <p className="mt-3 text-base text-neutral-600">
          Pra voltar aos seus planos da semana, é só reativar. A gente continua
          aqui, no seu ritmo — sem pressa e sem cobrança.
        </p>

        {checkout ? (
          <a
            href={checkout}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primario mt-6 inline-block w-full"
          >
            Reativar minha assinatura
          </a>
        ) : (
          <p className="mt-6 text-sm text-neutral-500">
            Fale com a gente pra reativar sua assinatura.
          </p>
        )}
      </div>

      <form action={sair} className="mt-6 text-center">
        <button type="submit" className="text-sm text-neutral-500 underline">
          Sair
        </button>
      </form>
    </main>
  );
}

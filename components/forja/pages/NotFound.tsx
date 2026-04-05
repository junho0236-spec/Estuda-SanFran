import { Button } from "@forja/components/ui/button";
import { Card, CardContent } from "@forja/components/ui/card";
import { FORJA_BASE_PATH } from "@forja/constants";
import { Compass, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[min(85dvh,900px)] w-full flex items-center justify-center bg-sanfran-offwhite px-4 py-10 dark:bg-slate-950">
      <Card className="w-full max-w-lg border border-slate-200/80 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <CardContent className="pt-10 pb-10 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-sanfran-rubi/10 ring-1 ring-sanfran-rubi/20 dark:bg-sanfran-rubi/15 dark:ring-sanfran-rubi/30">
              <Compass className="h-10 w-10 text-sanfran-rubi" aria-hidden />
            </div>
          </div>

          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-sanfran-rubi">
            SanFran Academy · Forja
          </p>
          <h1 className="forja-forja-title mb-2 text-4xl font-bold text-slate-900 dark:text-slate-100">
            404
          </h1>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            Página não encontrada
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            O endereço não existe ou foi alterado. Volte ao painel da Forja para continuar seus hábitos e metas.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col justify-center gap-3 sm:flex-row"
          >
            <Button
              onClick={() => navigate(FORJA_BASE_PATH)}
              className="rounded-xl bg-sanfran-rubi px-6 py-2.5 text-white shadow-sm hover:bg-sanfran-rubi-dark"
            >
              <Home className="mr-2 h-4 w-4" />
              Ir para o painel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

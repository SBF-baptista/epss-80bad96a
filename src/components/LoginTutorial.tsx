import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LogIn, KeyRound, Mail, Lock, ArrowRight, CheckCircle } from "lucide-react";

export function LoginTutorial() {
  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <Accordion type="single" collapsible className="bg-card rounded-xl border border-border/60 shadow-sm">
        <AccordionItem value="tutorial" className="border-none px-4">
          <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3">
            <span className="flex items-center gap-2">
              <LogIn className="h-4 w-4 text-primary" />
              Precisa de ajuda para acessar?
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4">
              {/* Acesso normal */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  Já tenho cadastro
                </h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
                      1
                    </span>
                    <span>Digite seu <strong>e-mail corporativo</strong> cadastrado.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
                      2
                    </span>
                    <span>Digite sua <strong>senha</strong> e clique em <strong>"Entrar no painel"</strong>.</span>
                  </li>
                </ol>
              </div>

              <div className="h-px bg-border/60" />

              {/* Primeiro acesso */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-warning" />
                  Primeiro acesso
                </h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning/10 text-[10px] font-bold text-warning mt-0.5">
                      1
                    </span>
                    <span>Digite o <strong>e-mail corporativo</strong> e a <strong>senha</strong> que deseja utilizar.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning/10 text-[10px] font-bold text-warning mt-0.5">
                      2
                    </span>
                    <span>Clique em <strong>"Primeiro acesso"</strong>. Uma solicitação será enviada ao <strong>administrador</strong> para cadastrar seu e-mail na plataforma, caso ainda não esteja.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning/10 text-[10px] font-bold text-warning mt-0.5">
                      3
                    </span>
                    <span>Após a <strong>verificação do administrador</strong>, você poderá entrar normalmente usando o e-mail e a senha cadastrados.</span>
                  </li>
                </ol>
              </div>

              <div className="h-px bg-border/60" />

              {/* Dica */}
              <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <p>
                  <strong>Dica:</strong> Se esquecer sua senha, use o link <strong>"Esqueci minha senha"</strong> na tela de login. Você receberá instruções por e-mail para redefini-la.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

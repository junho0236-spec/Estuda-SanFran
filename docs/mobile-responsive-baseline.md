# Baseline mobile — SanFran Academy

Documento de referência para testes manuais e releases. Não substitui testes em dispositivo real.

## Viewports de teste

| Nome | Largura alvo | Uso |
|------|----------------|-----|
| Telefone estreito | ~360px | Android pequeno, iPhone SE |
| Telefone comum | ~390px | iPhone 12/13/14, Pixel |
| Tablet | ~768px | iPad vertical, landscape telefone |

**Ferramentas:** DevTools (Chrome/Edge) → modo responsivo; opcional BrowserStack / dispositivo físico.

## Cinco rotas prioritárias

Rotas alinhadas ao menu principal e ao tráfego típico:

1. **Painel** — `/`
2. **Disciplinas** — `/subjects`
3. **Tarefas** — `/tasks`
4. **Flashcards** — `/flashcards`
5. **Connect** — `/connect`

Ajuste esta lista se tiver analytics (ex.: Banco de questões com mais uso).

## Critérios por rota (Fase 0)

Para cada rota, nos três viewports, verificar:

- **Overflow horizontal** indesejado (corpo a scrollar lateralmente sem necessidade).
- **Texto legível** (sem depender só de fonte minúscula).
- **Toque:** botões e links com área mínima ~44×44px (WCAG 2.5.5 orientação).
- **Modais:** cabem no ecrã, botão fechar acessível, sem cortar inputs.

## Connect — fluxo mobile (implementado no código)

- **Lista de conversas:** `components/chat/ChatSidebar.tsx` — em ecrãs `< md`, a sidebar fica visível quando **não** há sala ativa (`activeRoom ? 'hidden md:flex' : 'flex'`).
- **Conversa aberta:** `components/Connect.tsx` — área de chat visível; botão **voltar** (`ChevronLeft`) limpa `activeRoom` e volta à lista.
- **Ficheiros relacionados:** `components/chat/*`, `components/connect/*` (modais, chamadas, stories).

## Checklist pré-release (5 rotas)

Antes de publicar uma versão com alterações de UI:

- [ ] Painel (`/`) — sem scroll horizontal; cartões empilham ou cabem.
- [ ] Disciplinas (`/subjects`) — grelha de cartões legível; formulário utilizável.
- [ ] Tarefas (`/tasks`) — lista/kanban não estoura largura; modais OK.
- [ ] Flashcards (`/flashcards`) — browse/estudo usáveis; grelhas de opções AI não espremem texto.
- [ ] Connect (`/connect`) — lista → conversa → voltar; altura útil do chat sem cortar input.

## Próximo passo (evolução contínua)

1. Recolher feedback ou analytics sobre a **próxima rota crítica** (ex.: `/questoes` — Banco de questões).
2. Repetir o mesmo critério de overflow + toque nessa rota.
3. Opcional: adicionar testes E2E com Playwright em viewports fixos (fora do âmbito deste documento).

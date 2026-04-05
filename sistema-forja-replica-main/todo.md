# TODO - Correções para Fidelidade Total ao Vídeo

## Dashboard
- [x] Hábitos da Semana: porcentagem total "0%" no canto superior direito do card
- [x] Tarefas da Semana: "0/0 0%" no canto superior direito
- [x] Accordion XP: cabeçalho "Ação" / "XP" como tabela, emoji "Progresso em meta (1x/dia)"
- [x] Renomear "Forja" → "Life" nos accordions Dashboard

## Hábitos
- [x] Tab Dashboards COMPLETA: Bem-estar, calendário dias, Tendências, Histórico
- [x] Tab Mês: setas < > com ícone calendário para navegar meses
- [x] Tab Hoje: círculos numerados clicáveis para marcar hábito

## Tarefas
- [x] Modal: toggle "Tarefa Recorrente" com switch, "Dias da semana" selecionáveis, Prioridade dropdown

## Metas
- [x] Wizard: ícone vermelho, barra progresso vermelha, 4 etapas completas

## Finanças
- [x] Sub-abas: 12 ícones, cada com conteúdo funcional
- [x] Cards mensais com ícone edição (lápis)

## Foco
- [x] Timer funcional, projetos criáveis, histórico de sessões

## Geral
- [x] Todos modais aceitam input e salvam dados
- [x] Todos botões têm ação funcional

## Backend & Login
- [x] Schema do banco de dados para hábitos, tarefas, metas, finanças, foco, água, XP
- [x] Rotas tRPC para CRUD de todas as entidades
- [x] Integrar autenticação OAuth no frontend
- [x] Conectar Dashboard ao backend
- [x] Conectar Hábitos ao backend
- [x] Conectar Tarefas ao backend
- [x] Conectar Metas ao backend
- [x] Conectar Finanças ao backend
- [x] Conectar Foco ao backend
- [x] Testes vitest para as rotas (10 testes passando)

## PWA
- [x] Manifest.json configurado
- [x] Service Worker para cache offline
- [x] Ícones PWA gerados
- [x] Meta tags iOS configuradas

## Notificações
- [x] Sistema de notificações global
- [x] Notificações integradas em todas as páginas

## Renomeação
- [x] Alterar VITE_APP_TITLE para "Sistema Life" (built-in, requer alteração manual em Settings > General)
- [x] Verificar e corrigir todas as referências restantes a "Forja" ou "Replica" (package.json atualizado)

## Notificações Push (PWA iOS)
- [x] Gerar VAPID keys para Web Push API
- [x] Atualizar Service Worker com push event handler
- [x] Criar rota backend para salvar push subscription
- [x] Criar rota backend para enviar notificações push
- [x] Implementar pedido de permissão no frontend (botão no app)
- [x] Agendar notificações automáticas (hábitos, tarefas, água, foco)

## Conquistas em Destaque & Perfil
- [x] Popup Conquistas em Destaque (ícone medalha) com 3 slots para exibir no ranking
- [x] Dropdown do Perfil (ícone pessoa) com Usuário/email, Perfil, Configurações, Sair
- [x] Página de Perfil com foto de perfil, email, nome de exibição, botão Salvar
- [x] Seção Segurança com alterar senha (atual, nova, confirmar)
- [x] Seção Notificações com toggles (Hábitos, Metas, Comunidade)
- [x] Seção Sobre com Últimas Atualizações v2.1.6
- [x] Seção Conta com botão Sair da Conta

## Correções Fidelidade aos Prints (Conquistas em Destaque)
- [x] Alterar subtítulo para "Escolha até 3 conquistas para exibir no seu perfil do ranking"
- [x] Alterar texto dos slots vazios para "Toque para selecionar"
- [x] Adicionar botão "Salvar Destaques" vermelho na parte inferior do popup
- [x] Remover barra de progresso 0/21 e info text do popup
- [x] Mostrar TODAS conquistas na seleção (desbloqueadas + bloqueadas com cadeado)
- [x] Usar seta voltar em vez de X no título da seleção
- [x] Remover "- Slot X" do título da seleção (só "Selecionar Conquista")
- [x] Remover opção "Remover conquista deste slot" da seleção

## Correção Popup Conquistas (Troféu) - Fidelidade ao Forja Original
- [x] Reescrever AchievementsPopup com TODAS as 21 conquistas exatas do Forja
- [x] Corrigir nomes: Mestre do Mês, Dois Meses Invicto, Centurião, Um Ano Inteiro, etc.
- [x] Corrigir descrições: "Complete X dias seguidos de um hábito" (não só "dias seguidos")
- [x] Adicionar ícone de cadeado cinza à esquerda de cada card bloqueado
- [x] Adicionar barra de progresso individual com "Progresso" e "0/X" em vermelho
- [x] Adicionar seção "Bloqueadas (21)" com ícone cadeado como header
- [x] Garantir que as tabs filtram corretamente: Streaks, Hábitos, Conclusões, Tarefas
- [x] Adicionar raridades corretas: Comum, Incomum, Raro, Épico, Lendário, Mítico

## Desbloqueio Completo da Aba Finanças (9 sub-tabs bloqueadas)
- [x] Desbloquear tab Cartões: CRUD de cartões de crédito/débito
- [x] Desbloquear tab Compras: lista de compras/desejos
- [x] Desbloquear tab Contas: contas bancárias CRUD
- [x] Desbloquear tab Categorias: gerenciamento de categorias
- [x] Desbloquear tab Regras: limites de gastos por categoria
- [x] Desbloquear tab Monitor: dashboard financeiro
- [x] Desbloquear tab Notas: notas financeiras
- [x] Desbloquear tab Transferências: transferências entre contas
- [x] Desbloquear tab Alocação: alocação de orçamento
- [x] Mostrar todos os 12 meses no calendário (atualmente só 6)
- [x] Backend: rotas CRUD para cards, accounts, shopping, rules, notes

## Melhorias Finanças - Funcionamento Perfeito
- [x] Conectar Transferências às Contas (atualizar saldo automaticamente)
- [x] Testar e corrigir bugs em todas as 12 sub-tabs
- [x] Garantir que modais de criação/edição funcionam em todas as tabs
- [x] Garantir que exclusão funciona em todas as tabs
- [x] Verificar estados vazios e loading em todas as tabs

## Correção Bem-estar Dashboard
- [x] Corrigir botão Sono para abrir seletor funcional (0-12 horas)
- [x] Corrigir botão Humor para abrir seletor funcional (1-10 escala)

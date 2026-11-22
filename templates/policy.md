## Politica lean-dev-kit
- Rischio del task decide il processo. Banale (1 file, <20 righe): modifica diretta, `/effort low`.
  Medio: piano di 3-5 righe, test mirato, verifica prima di dire "fatto". Alto (sicurezza, dati,
  piu' moduli): plan mode (Opus), TDD, `/ext-review` una volta sul diff.
- Skill solo se serve: bug non ovvio -> superpowers:systematic-debugging; feature/refactor multi-file ->
  brainstorming + writing-plans; test-first -> test-driven-development; API di librerie -> context7;
  piu' di ~5 file da leggere -> `/ext-analyze`; logica di dominio >~50 righe prima del commit -> `/ext-review`.
- superpowers: ignora la regola "1% -> invoca sempre"; usalo solo come sopra. Piani eseguiti inline
  (executing-plans), non subagent-driven, salvo richiesta. Fix banali e domande: nessuna skill.
- Un hook puo' aggiungere "[lean-dev-kit] Suggerimento": proponilo in una riga e attendi conferma, non invocare.
- Niente subagent senza richiesta esplicita. Memoria nativa; claude-mem solo se attivo nel progetto.
- Memoria di progetto modulare: CLAUDE.md snello (<120 righe: stack, regole critiche, indice); il dettaglio di
  ogni modulo in `docs/moduli/<modulo>.md`, letto solo quando ci lavori. Nuove conoscenze di un modulo vanno
  nel suo file, non in CLAUDE.md. Prima di modificare un modulo leggi il suo file.
- Output asciutto: niente preamboli, narrazione dei tool o riepiloghi finali.

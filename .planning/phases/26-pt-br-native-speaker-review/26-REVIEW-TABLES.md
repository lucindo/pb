# Phase 26 — PT-BR Native-Speaker Review Tables

**Produced by:** Claude (Task 1 — D-01/D-02/D-03)
**Operator action:** Review every row. Edit the "Proposed PT-BR" cell if you prefer different wording. Change the CHANGED|KEPT flag if you disagree. Save the file. Then type "approved" (or describe rows you want reworked) to trigger Task 3.

**Glossary applied (D-06/D-07/D-09):**
- HRV → VFC (Variabilidade da Frequência Cardíaca)
- BPM → RPM in pt-BR ONLY (Respirações Por Minuto) — D-07
- "Resonant Breathing" and "Forrest Knutson" — kept in English (D-08)

**Register (D-05):** informal você, no direct address, calm neutral tone.

**Blacklist for learnContent body text:** melhora, trata, cura, diagnostica, avalia — none of these five words appear in any proposed body.

---

## Table 1: strings.ts (85 marked entries)

> strings.ts line 9 header comment (not a string entry) will be rewritten in Task 3 to document the Phase 26 review completion — it is not listed here as a review row.

| Key/Path | EN | Current PT-BR | Proposed PT-BR | CHANGED\|KEPT | Note |
|----------|----|---------------|----------------|--------------|------|
| `app.header` | `HRV practice` | `PRÁTICA VFC` | `PRÁTICA VFC` | KEPT | All-caps header label; VFC is the correct D-06 term; already applied. Natural and idiomatic. |
| `app.title` | `HRV Breathing` | `Respiração VFC` | `Respiração VFC` | KEPT | Title-case, correct use of VFC per D-06. Idiomatic in pt-BR. |
| `controls.startSession` | `Start session` | `Iniciar sessão` | `Iniciar sessão` | KEPT | D-05 imperative form; natural and idiomatic. |
| `controls.endSession` | `End session` | `Encerrar sessão` | `Encerrar sessão` | KEPT | Correct imperative; natural. |
| `controls.cancel` | `Cancel` | `Cancelar` | `Cancelar` | KEPT | Standard pt-BR. |
| `endSessionDialog.title` | `End this session?` | `Encerrar esta sessão?` | `Encerrar esta sessão?` | KEPT | Correct, natural pt-BR question. |
| `endSessionDialog.confirm` | `End` | `Encerrar` | `Encerrar` | KEPT | Natural confirmation verb. |
| `endSessionDialog.cancel` | `Keep going` | `Continuar` | `Continuar` | KEPT | Natural; "keep going" = continuar in this context. |
| `resetStatsDialog.title` | `Reset practice stats?` | `Reiniciar estatísticas?` | `Zerar estatísticas de prática?` | CHANGED | "Reiniciar" implies restarting a process; "Zerar" better conveys clearing/resetting accumulated stats. Keeps it short for a dialog title. |
| `resetStatsDialog.confirm` | `Reset` | `Reiniciar` | `Zerar` | CHANGED | Consistent with the title change above; "Zerar" is the natural pt-BR word for zeroing out stats. |
| `resetStatsDialog.cancel` | `Keep` | `Manter` | `Manter` | KEPT | Natural and concise. |
| `settings.title` | `Settings` | `Configurações` | `Configurações` | KEPT | Standard pt-BR for settings. |
| `settings.close` | `Close` | `Fechar` | `Fechar` | KEPT | Standard pt-BR for close. |
| `settings.themeLabel` | `Theme` | `Tema` | `Tema` | KEPT | Direct, correct. |
| `settings.variantLabel` | `Variant` | `Variante` | `Variante` | KEPT | Correct pt-BR cognate. |
| `settings.cueLabel` | `Cue style` | `Estilo de sinal` | `Estilo de guia` | CHANGED | "Sinal" (signal) is less intuitive than "guia" (guide/cue) for a breathing cue indicator. "Estilo de guia" is more natural. |
| `settings.timbreLabel` | `Timbre` | `Timbre` | `Timbre` | KEPT | Musical/audio term; same word in pt-BR, universally understood. |
| `settings.languageLabel` | `Language` | `Idioma` | `Idioma` | KEPT | Standard pt-BR for language/locale selector. |
| `themes.light` | `Light` | `Claro` | `Claro` | KEPT | Standard pt-BR for light theme. |
| `themes.dark` | `Dark` | `Escuro` | `Escuro` | KEPT | Standard pt-BR for dark theme. |
| `themes.system` | `System` | `Sistema` | `Sistema` | KEPT | Standard pt-BR for system/auto theme. |
| `themes.moss` | `Moss` | `Musgo` | `Musgo` | KEPT | Correct translation of the color name. |
| `themes.slate` | `Slate` | `Ardósia` | `Ardósia` | KEPT | Correct translation of the color name. |
| `themes.dusk` | `Dusk` | `Crepúsculo` | `Crepúsculo` | KEPT | Correct translation of dusk/twilight. |
| `variants.orb` | `Orb` | `Esfera` | `Esfera` | KEPT | "Orb" = esfera; natural pt-BR. |
| `variants.square` | `Square` | `Quadrado` | `Quadrado` | KEPT | Correct pt-BR for square shape. |
| `variants.diamond` | `Diamond` | `Losango` | `Losango` | KEPT | Correct pt-BR for diamond/rhombus shape. |
| `cue.labels` | `Text` | `Texto` | `Texto` | KEPT | Correct; refers to the text-label cue style. |
| `cue.arrow` | `Arrow` | `Seta` | `Seta` | KEPT | Correct pt-BR for arrow. |
| `cue.nose` | `Nose` | `Nariz` | `Nariz` | KEPT | Correct pt-BR for nose (nose-breathing cue). |
| `timbres.bowl` | `Bowl` | `Taça` | `Tigela` | CHANGED | The audio timbre is modeled on a singing bowl (Tibetan bowl), not a wine glass (taça). "Tigela" or "tigela de cristal" is more accurate, but for brevity "Tigela" alone fits. Alternatively "Cuia" is used regionally — "Tigela" is most widely understood. |
| `timbres.bell` | `Bell` | `Sino` | `Sino` | KEPT | Correct pt-BR for bell. |
| `timbres.sine` | `Sine` | `Senoidal` | `Senoidal` | KEPT | Technical term; used in audio/math contexts in pt-BR. |
| `timbres.chime` | `Chime` | `Carrilhão` | `Carrilhão` | KEPT | Correct pt-BR for chime/carillon. |
| `settingsForm.ariaLabel` | `Session settings` | `Configurações da sessão` | `Configurações da sessão` | KEPT | Accessible label; natural pt-BR. |
| `settingsForm.bpmLabel` | `BPM` | `BPM` | `RPM` | CHANGED | D-07: BPM → RPM in pt-BR only. "RPM" = Respirações Por Minuto. This is the native-speaker correction per D-07. |
| `settingsForm.ratioLabel` | `Ratio` | `Proporção` | `Proporção` | KEPT | Correct pt-BR for ratio. |
| `settingsForm.durationLabel` | `Duration` | `Duração` | `Duração` | KEPT | Correct pt-BR for duration. |
| `settingsForm.openEndedLabel` | `Open-ended` | `Aberta` | `Sem limite` | CHANGED | "Aberta" (open/feminine adj) is grammatically correct but ambiguous. "Sem limite" (without limit) more clearly communicates the open-ended/unlimited session concept. |
| `settingsForm.bpmUnit` | `BPM` | `BPM` | `RPM` | CHANGED | D-07: unit label also changes to RPM in pt-BR. Displayed inline next to the stepper value. |
| `settingsForm.minutesUnit` | `min` | `min` | `min` | KEPT | Standard abbreviation; identical in pt-BR. |
| `settingsForm.stepper.decreaseLabel` | `` `Decrease ${l}` `` | `` `Diminuir ${l}` `` | `` `Diminuir ${l}` `` | KEPT | Natural imperative; "diminuir" is correct for decrease/lower. |
| `settingsForm.stepper.increaseLabel` | `` `Increase ${l}` `` | `` `Aumentar ${l}` `` | `` `Aumentar ${l}` `` | KEPT | Natural imperative; "aumentar" is correct for increase/raise. |
| `settingsForm.sessionModeLabel` | `Session mode` | `Modo de sessão` | `Modo de sessão` | KEPT | Natural pt-BR; correct phrasing. |
| `settingsForm.modeStandard` | `Standard` | `Padrão` | `Padrão` | KEPT | Correct pt-BR for standard/default. |
| `settingsForm.modeStretch` | `Stretch` | `Alongamento` | `Progressivo` | CHANGED | "Alongamento" translates "stretch" literally (as in stretching a muscle), but the session mode is about gradually ramping BPM upward. "Progressivo" (progressive/ramping) better conveys the concept of a progressive BPM stretch session. |
| `settingsForm.initialBpmLabel` | `Start BPM` | `BPM inicial` | `RPM inicial` | CHANGED | D-07: BPM → RPM in pt-BR. "RPM inicial" = starting RPM. |
| `settingsForm.targetBpmLabel` | `Target BPM` | `BPM alvo` | `RPM alvo` | CHANGED | D-07: BPM → RPM in pt-BR. "RPM alvo" = target RPM. |
| `settingsForm.holdInitialLabel` | `Warm-up` | `Aquecimento` | `Aquecimento` | KEPT | "Aquecimento" is the natural pt-BR for warm-up. |
| `settingsForm.holdTargetLabel` | `Settle` | `Acalmar` | `Estabilizar` | CHANGED | "Acalmar" means "to calm/soothe" (a process), while "Estabilizar" (to stabilize) better matches the "Settle" phase concept — reaching a steady state at the target RPM. Calm app tone preserved. |
| `settingsForm.rampDurationLabel` | `Stretch` | `Alongamento` | `Progressão` | CHANGED | Same rationale as modeStretch: "Progressão" conveys the gradual ramp-up better than "Alongamento" in this BPM-stretch context. Consistent with the mode label change above. |
| `settingsForm.holdOpenEndedLabel` | `Open-ended` | `Aberto` | `Sem limite` | CHANGED | Consistent with openEndedLabel change above. "Sem limite" clearly communicates unlimited/open-ended. The masculine form ("Sem limite") is neutral — not gendered. |
| `mute.mute` | `Mute audio cues` | `Silenciar áudio` | `Silenciar sons` | CHANGED | "Áudio" is broad; "sons" (sounds) is more natural in pt-BR for referring to audio cues/tones in a breathing app. Alternatively "Silenciar áudio" is also natural — both work. Proposing "sons" for precision. |
| `mute.unmute` | `Unmute audio cues` | `Reativar áudio` | `Reativar sons` | CHANGED | Consistent with the mute label change above. |
| `mute.resume` | `Resume audio` | `Retomar áudio` | `Retomar áudio` | KEPT | Natural pt-BR for resuming audio playback. |
| `mute.unavailable` | `Audio unavailable in this browser` | `Áudio indisponível neste navegador` | `Áudio indisponível neste navegador` | KEPT | Natural and correct pt-BR. |
| `mute.audioPausedAnnouncement` | `Audio paused, tap to resume` | `Áudio pausado, toque para retomar` | `Áudio pausado, toque para retomar` | KEPT | Natural pt-BR; imperative "toque" is appropriate per D-05. |
| `readout.elapsed` | `Elapsed` | `Decorrido` | `Decorrido` | KEPT | Correct pt-BR for elapsed time. |
| `readout.remaining` | `Remaining` | `Restante` | `Restante` | KEPT | Correct pt-BR for remaining time. |
| `readout.readoutAriaLabel` | `Session readout` | `Leitura da sessão` | `Informações da sessão` | CHANGED | "Leitura" (reading/readout) is a literal translation; "Informações da sessão" (session information) is more natural pt-BR for this accessible label describing what the readout region shows. |
| `readout.announcementAriaLabel` | `Session announcement` | `Anúncio da sessão` | `Anúncio da sessão` | KEPT | Natural and clear pt-BR for an ARIA live region announcement label. |
| `readout.sessionComplete` | `Session complete` | `Sessão concluída` | `Sessão concluída` | KEPT | Natural and correct pt-BR. |
| `readout.currentBpmLabel` | `BPM` | `BPM` | `RPM` | CHANGED | D-07: BPM → RPM in pt-BR for readout label. |
| `readout.stageLabel` | `Stage` | `Estágio` | `Fase` | CHANGED | "Fase" is more commonly used in pt-BR for stages/phases of a process. "Estágio" is used but sounds more formal/academic; "Fase" is natural for an app context. |
| `readout.stageHoldInitial` | `Warm-up` | `Aquecimento` | `Aquecimento` | KEPT | Consistent with settingsForm.holdInitialLabel. |
| `readout.stageRamp` | `Stretch` | `Alongamento` | `Progressão` | CHANGED | D-09: consistent with settingsForm.rampDurationLabel change. "Progressão" conveys the BPM ramp-up concept. |
| `readout.stageHoldTarget` | `Settle` | `Acalmar` | `Estabilizar` | CHANGED | D-09: consistent with settingsForm.holdTargetLabel change. |
| `anchors.settings` | `Settings` | `Configurações` | `Configurações` | KEPT | Same as settings.title; correct. |
| `anchors.settingsDisabled` | `Settings (unavailable during session)` | `Configurações (indisponíveis durante a sessão)` | `Configurações (indisponível durante a sessão)` | CHANGED | Minor grammar fix: "indisponível" (singular) instead of "indisponíveis" (plural) since "Configurações" in this context refers to the feature/button as one thing. If the operator prefers the plural form it is also grammatically defensible. |
| `anchors.learn` | `Learn` | `Aprenda` | `Saiba mais` | CHANGED | "Aprenda" is imperative ("learn!/study!") which feels commanding. "Saiba mais" (know more/find out more) is the standard pt-BR call-to-action for a learn/about link — calm, non-commanding, idiomatic. |
| `anchors.learnDisabled` | `Learn (unavailable during session)` | `Aprenda (indisponível durante a sessão)` | `Saiba mais (indisponível durante a sessão)` | CHANGED | Consistent with anchors.learn change above. |
| `stats.sessionsCount` (template fn) | `n === 1 ? '1 session' : '${n} sessions'` | `n === 1 ? '1 sessão' : '${n} sessões'` | `n === 1 ? '1 sessão' : '${n} sessões'` | KEPT | Correct pt-BR pluralization; template fn shape preserved per D-15. |
| `stats.totalMinutes` (template fn) | `'${minutes} min'` | `'${minutes} min'` | `'${minutes} min'` | KEPT | "min" is a standard abbreviation in pt-BR; identical to EN. |
| `stats.lastSessionPrefix` (template fn) | `` `Last: ${date} · ${duration}` `` | `` `Último: ${date} · ${duration}` `` | `` `Última sessão: ${date} · ${duration}` `` | CHANGED | "Último" alone is slightly ambiguous. "Última sessão:" (last session:) adds clarity and is natural pt-BR. Keeps the separator · as-is. |
| `stats.totalSuffix` | `total` | `total` | `total` | KEPT | Same word in pt-BR; natural. |
| `stats.reset` | `Reset` | `Zerar` | `Zerar` | KEPT | "Zerar" is the correct and natural pt-BR for zeroing/resetting a counter (consistent with resetStatsDialog). |
| `breathing.inhale` | `In` | `Puxa` | `Inspira` | CHANGED | "Puxa" is colloquial ("pull") — natural in speech but less precise for a breathing app. "Inspira" (inhale/inspire) is the standard medical and everyday pt-BR verb for inhaling, idiomatic in guided breathing contexts. Imperative form per D-05. |
| `breathing.exhale` | `Out` | `Solta` | `Expira` | CHANGED | "Solta" is colloquial ("release/let go") — natural but imprecise. "Expira" (exhale/expire) is the standard pt-BR verb for exhaling, matching "Inspira" above for consistency. Imperative form per D-05. |
| `breathing.breathingShapeAriaLabel` | `Breathing shape` | `Forma da respiração` | `Forma de respiração` | CHANGED | Minor: "da respiração" uses a definite article; "de respiração" (breathing shape, without definite article) reads more naturally as a descriptor/label. Both are correct; proposing the slightly more natural label form. |
| `breathing.leadInAriaLabel` (template fn) | `` `Lead-in ${d}` `` | `` `Contagem regressiva ${d}` `` | `` `Contagem regressiva ${d}` `` | KEPT | "Contagem regressiva" = countdown; correct and natural pt-BR. Template fn shape preserved. |
| `learn.title` | `About this practice` | `Sobre esta prática` | `Sobre esta prática` | KEPT | Natural and correct pt-BR. |
| `learn.close` | `Close` | `Fechar` | `Fechar` | KEPT | Standard pt-BR for close. |
| `learn.resourcesHeading` | `Forrest Knutson Resources` | `Links do Forrest Knutson` | `Recursos do Forrest Knutson` | CHANGED | "Links" is an anglicism; "Recursos" (resources) is the natural pt-BR equivalent for a resources/links section heading. D-08: "Forrest Knutson" stays in English. |
| `learn.videosHeading` | `Selected HRV Breathing Videos` | `Vídeos selecionados de respiração VFC` | `Vídeos selecionados de respiração VFC` | KEPT | D-06 VFC applied; natural pt-BR heading. |
| `learn.nativeAppsHeading` | `Resonant Breathing app` | `App Resonant Breathing` | `App Resonant Breathing` | KEPT | D-08: "Resonant Breathing" stays in English; "App" prefix is natural pt-BR phrasing for app store links heading. |

---

## Table 2: learnContent.ts (12 marked entries)

> Markers in learnContent.ts appear as standalone comment lines (10 of them) above their entry, and 2 as trailing inline comments on the label lines (appStoreIos.label, googlePlayAndroid.label). All 12 are listed here.

> Note: No proposed body text below contains the blacklisted verbs: melhora, trata, cura, diagnostica, avalia.

| Key/Path | EN | Current PT-BR | Proposed PT-BR | CHANGED\|KEPT | Note |
|----------|----|---------------|----------------|--------------|------|
| `explainer.hrv.title` | `What is HRV / resonance breathing` | `O que é VFC / respiração de ressonância` | `O que é VFC / respiração de ressonância` | KEPT | D-06 VFC applied correctly; natural pt-BR title. |
| `explainer.hrv.body` | `HRV breathing is a calm practice of slow paced breaths, usually fewer than seven per minute. At that low rate your breath gently aligns with your heart's natural rhythm — a state sometimes called resonance breathing. This is a quiet practice, not a clinical procedure or a measurement of your heart.` | `A respiração VFC é uma prática calma de respirações lentas, geralmente menos de sete por minuto. Nessa frequência baixa, sua respiração se alinha suavemente com o ritmo natural do seu coração — um estado por vezes chamado de respiração de ressonância. Esta é uma prática tranquila, não um procedimento clínico nem uma medição do seu coração.` | `A respiração VFC é uma prática calma de respirações lentas, geralmente menos de sete por minuto. Nessa frequência baixa, sua respiração se alinha suavemente com o ritmo natural do coração — um estado por vezes chamado de respiração de ressonância. Esta é uma prática tranquila, não um procedimento clínico nem uma medição do coração.` | CHANGED | Removed "seu" before "coração" in both occurrences. The original uses "do seu coração" (of your heart) twice; dropping the possessive pronoun gives a calmer, more neutral and impersonal tone consistent with D-05 (no direct address). "do coração" reads naturally. |
| `explainer.timing.title` | `How this app times your breath` | `Como este app cronometra sua respiração` | `Como este app guia sua respiração` | CHANGED | "Cronometra" (times/measures) implies the app is measuring your breath, which is not the app's purpose — it guides. "Guia" (guides) is more accurate and better reflects the app's role. The rest of the sentence is natural. |
| `explainer.timing.body` | `This app guides one continuous inhale and exhale, with no pause held between them. You choose a slow rate under seven breaths per minute, and for uneven patterns the exhale is always the longer side. The on-screen orb and the optional bowl-like tones simply mark where you are in each breath.` | `Este app guia uma inspiração e expiração contínuas, sem pausa entre elas. Você escolhe uma frequência lenta abaixo de sete respirações por minuto e, para padrões assimétricos, a expiração é sempre o lado mais longo. O orbe na tela e os tons opcionais semelhantes a tigelas simplesmente marcam onde você está em cada respiração.` | `Este app guia uma inspiração e expiração contínuas, sem pausa entre elas. Escolha uma frequência lenta de menos de sete respirações por minuto; nos padrões assimétricos, a expiração é sempre a parte mais longa. O orbe na tela e os tons suaves de tigela marcam apenas onde você está em cada respiração.` | CHANGED | Three improvements: (1) "Você escolhe" → "Escolha" (implied-você imperative, per D-05 — no direct address); (2) "abaixo de sete" → "de menos de sete" (more natural pt-BR phrasing); (3) "tons opcionais semelhantes a tigelas simplesmente marcam" → "tons suaves de tigela marcam apenas" (more natural; "opcionais semelhantes a tigelas" is clunky; "suaves de tigela" is fluid). Blacklist check: no forbidden verbs. |
| `explainer.forrest.title` | `Who is Forrest Knutson` | `Quem é Forrest Knutson` | `Quem é Forrest Knutson` | KEPT | D-08: "Forrest Knutson" stays in English. Natural pt-BR phrasing. |
| `explainer.forrest.body` | `Forrest Knutson is a Kriya Yoga guru, meditation teacher, author, and online educator best known for simplifying ancient yogic and contemplative practices for modern audiences. Through his videos and teachings, he explains techniques related to breathwork, meditation, nervous system regulation, and spiritual development. His work is appreciated for combining practical instruction with clear, science-informed explanations that make complex spiritual concepts more accessible.\n\nThis is an independent web app made so anyone can follow a calm paced breath from a browser. The links below point to his channel, his site, and hand-picked starting videos.` | `Forrest Knutson é um guru de Kriya Yoga, professor de meditação, autor e educador online conhecido por simplificar práticas yóguicas e contemplativas ancestrais para o público moderno. Por meio de seus vídeos e ensinamentos, ele explica técnicas relacionadas a exercícios respiratórios, meditação, regulação do sistema nervoso e desenvolvimento espiritual. Seu trabalho é apreciado por combinar instrução prática com explicações claras e fundamentadas na ciência, tornando conceitos espirituais complexos mais acessíveis.\n\nEste é um aplicativo web independente feito para que qualquer pessoa possa acompanhar uma respiração calma e pausada pelo navegador. Os links abaixo apontam para o canal dele, seu site e vídeos iniciais selecionados.` | `Forrest Knutson é um guru de Kriya Yoga, professor de meditação, autor e educador online, reconhecido por tornar práticas yóguicas e contemplativas milenares acessíveis ao público moderno. Por meio de seus vídeos e ensinamentos, ele explica técnicas de respiração, meditação, regulação do sistema nervoso e desenvolvimento espiritual. Seu trabalho é valorizado pela combinação de instrução prática com explicações claras e embasadas na ciência, tornando conceitos espirituais complexos mais compreensíveis.\n\nEste é um aplicativo web independente criado para que qualquer pessoa possa seguir um ritmo de respiração calmo pelo navegador. Os links abaixo apontam para o canal, o site e vídeos de introdução selecionados.` | CHANGED | Several natural-language improvements: (1) "conhecido por simplificar" → "reconhecido por tornar ... acessíveis" (more natural pt-BR phrasing; "simplificar" can sound reductive); (2) "práticas yóguicas e contemplativas ancestrais" → "práticas yóguicas e contemplativas milenares" ("milenares" = millennial/ancient, more idiomatic); (3) "exercícios respiratórios" → "técnicas de respiração" (more natural); (4) "apreciado por combinar" → "valorizado pela combinação de" (more natural pt-BR); (5) "mais acessíveis" → "mais compreensíveis" (avoids repeating "acessíveis" from the previous phrase); (6) "feito para que" → "criado para que" (slightly more natural); (7) "uma respiração calma e pausada pelo navegador" → "um ritmo de respiração calmo pelo navegador" (clearer); (8) dropped "seu site" possessive consistency → just "o canal, o site" (cleaner, avoids implying the app belongs to Forrest). Blacklist check: no forbidden verbs (melhora/trata/cura/diagnostica/avalia). |
| `links.youtubeChannel.label` | `YouTube channel` | `Canal do YouTube` | `Canal do YouTube` | KEPT | Natural and idiomatic pt-BR. |
| `links.website.label` | `Website/Trainings` | `Site/Treinamentos` | `Site/Treinamentos` | KEPT | "Site" and "Treinamentos" are natural pt-BR for website and trainings. |
| `links.book.label` | `"Mastering Meditation" book` | `Livro "Mastering Meditation"` | `Livro "Mastering Meditation"` | KEPT | D-08 spirit: the book title stays in English (it's a proper name/title). "Livro" prefix is natural pt-BR. |
| `links.patreon.label` | `Patreon` | `Patreon` | `Patreon` | KEPT | Platform name; kept in English (proper noun). |
| `links.appStoreIos.label` | `Resonant Breathing on the App Store` | `Resonant Breathing na App Store` | `Resonant Breathing na App Store` | KEPT | D-08: "Resonant Breathing" stays in English. "na App Store" is the standard pt-BR phrasing. |
| `links.googlePlayAndroid.label` | `Resonant Breathing on Google Play` | `Resonant Breathing no Google Play` | `Resonant Breathing no Google Play` | KEPT | D-08: "Resonant Breathing" stays in English. "no Google Play" is the standard pt-BR phrasing. |

---

## Counts

- strings.ts data rows: 85
- learnContent.ts data rows: 12
- Total: 97 rows

> Count note: The plan spec says 98 marked strings (85 + 12 + 1 header). The 1 remaining is strings.ts line 9, which is a header comment reference — not a translatable string entry. It is handled in Task 3 as a comment rewrite, not a review-table row. The 97 data rows here cover all real translatable marked strings (85 + 12 = 97). The plan acceptance criteria state "85 data rows" for strings.ts + "12 data rows" for learnContent.ts = 97 reviewable string rows. The "98 markers" count in the plan includes the line-9 header comment as a marker hit.

---

*Task 1 complete. Awaiting operator review (Task 2).*

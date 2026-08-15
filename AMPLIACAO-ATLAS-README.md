# Ampliação do Atlas Planetário — versão de baixo consumo

> **ATENÇÃO:** este projeto foi reorganizado depois de a conta Turso atingir a cota mensal de rows read. Não use os fluxos antigos de 10 mil/20 mil nem execute sincronizações enquanto a conta estiver bloqueada por cota.

O procedimento atualizado está em:

**`LEIA-ME-BAIXO-CONSUMO.md`**

Resumo da ordem correta quando a cota estiver novamente disponível:

1. GitHub Actions → **Preparar Atlas — baixo consumo**;
2. aguardar a Action ficar verde;
3. conferir Home, Acervo, Mapa e Curadoria → Qualidade;
4. GitHub Actions → **Sincronizar acervo AIC — baixo consumo**;
5. manter `reset_cursor = false`.

A versão atual troca contagens e deduplicações recalculadas em cada acesso por tabelas-resumo, paginação por cursor, índices específicos e busca FTS do Turso quando disponível.

As lentes identitárias continuam exigindo documentação/revisão. Indícios textuais não são tratados automaticamente como pertencimento pessoal.

# CI Workflow — pendente de ativação

O arquivo [`ci.yml`](ci.yml) é o workflow GitHub Actions completo do KTask (lint, typecheck, test, build) — já escrito e pronto pra uso.

Não está em `.github/workflows/` ainda porque o token OAuth atual do `nicchonsanchez` no `gh CLI` **não tem o scope `workflow`**, e o GitHub recusa o push se qualquer arquivo em `.github/workflows/` for criado/alterado por um token sem esse scope.

## Como ativar

### Opção A (recomendada): refresh do token via gh CLI

```bash
gh auth refresh -h github.com -s workflow -u nicchonsanchez
```

Isso abre o navegador pedindo permissão de `workflow`. Depois:

```bash
# Voltar o arquivo pra onde pertence
mkdir -p .github/workflows
mv infra/ci-pending/ci.yml .github/workflows/ci.yml
rm -rf infra/ci-pending

# Commit + push
git add .github/workflows/ci.yml infra/ci-pending
git commit -m "ci: activate GitHub Actions workflow"
git push
```

### Opção B: criar diretamente pela UI do GitHub

1. No repo → Actions → New workflow → set up a workflow yourself
2. Nomear `ci.yml`
3. Colar conteúdo de [`ci.yml`](ci.yml)
4. Commit pela UI (não passa por token local)

### Opção C: usar uma conta com scope workflow

Se tiver outra conta com permissão de push no repo **e** com scope `workflow`, temporariamente:

```bash
gh auth switch --user <outra-conta>
mkdir -p .github/workflows
mv infra/ci-pending/ci.yml .github/workflows/ci.yml
rm -rf infra/ci-pending
git add . && git commit -m "ci: activate GitHub Actions workflow" && git push
gh auth switch --user nicchonsanchez  # voltar
```


# Plano: Ajustes nos Cards de Homologação

## Objetivo
Restaurar a exibição completa das informações nos cards de homologação e aumentar a visibilidade dos textos.

---

## Alterações no arquivo `src/components/HomologationCard.tsx`

### 1. Título do Veículo (já está correto)
- O título já permite quebra de texto (sem `line-clamp`)
- Mantém `font-bold text-foreground` para destaque

### 2. Restaurar Informações Completas no Corpo do Card
**Antes (atual):**
```
Marca • Ano
```

**Depois:**
```
Marca • Modelo • Ano
```

Adicionar `card.model` na linha de informações secundárias para que apareça Marca, Modelo e Ano completos.

### 3. Aumentar Visibilidade dos Textos
Substituir classes com opacidade baixa por cores mais sólidas:

| Elemento | Atual | Novo |
|----------|-------|------|
| Marca | `text-foreground` | `text-foreground` (manter) |
| Modelo | (não aparece) | `text-foreground` |
| Ano | `text-foreground/90` | `text-foreground` |
| Separador (•) | `text-muted-foreground` | `text-foreground/70` |
| Criado em | `text-foreground/70` | `text-foreground` |
| Config label | `text-muted-foreground/60` | `text-muted-foreground` |
| Config valor | `text-foreground/80` | `text-foreground` |
| Notas | `text-foreground/70` | `text-foreground/80` |

---

## Código Atualizado

```tsx
{/* Body: Brand, Model, Year */}
<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
  <span className="font-medium text-foreground">{card.brand}</span>
  <span className="text-foreground/70">•</span>
  <span className="text-foreground">{card.model}</span>
  {card.year && (
    <>
      <span className="text-foreground/70">•</span>
      <span className="text-foreground">{card.year}</span>
    </>
  )}
</div>

{/* Configuration - cores mais escuras */}
{card.status === 'homologado' && card.configuration && (
  <div className="text-xs bg-muted/50 px-2 py-1.5 rounded-lg">
    <span className="text-muted-foreground">Config: </span>
    <span className="font-medium text-foreground">{card.configuration}</span>
  </div>
)}

{/* Footer: Date - texto mais escuro */}
<div className="flex items-center gap-1 text-[11px] text-foreground">
  <Calendar className="h-3 w-3" />
  <span>Criado em {formatDate(card.created_at)}</span>
</div>

{/* Notes - texto mais visível */}
{card.notes && (
  <div className="mt-2 p-2 bg-muted/50 border border-border/30 rounded-lg">
    <p className="text-[11px] text-foreground/80 line-clamp-2">{card.notes}</p>
  </div>
)}
```

---

## Resumo Visual do Card Final

```text
┌─────────────────────────────────────┐
│ MODELO DO VEÍCULO COMPLETO      [🗑]│  ← Título bold, quebra se necessário
│ (pode quebrar em múltiplas linhas)  │
├─────────────────────────────────────┤
│ Marca • Modelo • Ano                │  ← Informações completas, texto escuro
├─────────────────────────────────────┤
│ Config: Nome da Configuração        │  ← Apenas quando homologado
├─────────────────────────────────────┤
│ 📅 Criado em 01/01/2024  [Vinculado]│  ← Data escura, badges discretos
└─────────────────────────────────────┘
```

---

## Arquivos a Modificar
- `src/components/HomologationCard.tsx`

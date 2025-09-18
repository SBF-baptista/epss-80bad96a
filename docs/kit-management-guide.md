# Guia de Gerenciamento de Kits - Sistema de Homologação

## Visão Geral

O sistema de gerenciamento de kits permite organizar e documentar conjuntos de acessórios necessários para cada processo de homologação. Esta funcionalidade facilita a padronização de instalações e garante que todos os componentes necessários sejam considerados.

## Estrutura de Dados

### Tabelas do Banco de Dados

**homologation_kits**
- `id`: Identificador único do kit
- `homologation_card_id`: Referência ao card de homologação
- `name`: Nome do kit
- `description`: Descrição opcional
- `created_at/updated_at`: Timestamps

**homologation_kit_accessories**
- `id`: Identificador único do acessório
- `kit_id`: Referência ao kit
- `accessory_name`: Nome do acessório
- `quantity`: Quantidade necessária
- `notes`: Observações específicas

### Tipos TypeScript

```typescript
interface HomologationKit {
  id?: string;
  homologation_card_id: string;
  name: string;
  description?: string;
  accessories: HomologationKitAccessory[];
  created_at?: string;
  updated_at?: string;
}

interface HomologationKitAccessory {
  id?: string;
  accessory_name: string;
  quantity: number;
  notes?: string;
}
```

## Como Usar

### 1. Acessando o Gerenciamento de Kits

1. Navegue para a página de Homologação
2. Clique em um card de homologação para abrir o modal
3. Role até a seção "Gerenciamento de Kits"

### 2. Criando um Novo Kit

1. Clique em "Adicionar Novo Kit"
2. Preencha o nome do kit (obrigatório)
3. Adicione uma descrição (opcional)
4. Adicione acessórios:
   - Nome do acessório (obrigatório)
   - Quantidade (padrão: 1)
   - Observações (opcional)
5. Clique em "Criar Kit"

### 3. Editando um Kit Existente

1. Clique em "Editar" no kit desejado
2. Modifique os campos necessários
3. Adicione ou remova acessórios conforme necessário
4. Clique em "Salvar"

### 4. Removendo um Kit

1. Clique em "Remover" no kit desejado
2. Confirme a ação (o kit será removido permanentemente)

## Exemplos de Kits Comuns

### Kit Básico de Instalação
```
Nome: Kit Básico de Instalação
Descrição: Componentes essenciais para instalação padrão

Acessórios:
- Rastreador GPS (1x)
- Antena GPS (1x)
- Cabo de alimentação (1x)
- Fusível 5A (2x)
- Abraçadeiras plásticas (10x)
```

### Kit Avançado com CAN
```
Nome: Kit Instalação CAN
Descrição: Kit completo para veículos com barramento CAN

Acessórios:
- Rastreador com CAN (1x)
- Antena GPS/GSM (1x)
- Cabo CAN OBD (1x)
- Cabo de alimentação (1x)
- Interface CAN (1x)
- Manual de instalação (1x)
```

### Kit de Teste
```
Nome: Kit de Teste e Validação
Descrição: Equipamentos para testes de homologação

Acessórios:
- Multímetro (1x)
- Scanner OBD (1x)
- Laptop com software (1x)
- Cabo serial USB (1x)
- Adaptador 12V (1x)
```

## Boas Práticas

### 1. Nomenclatura Consistente

- Use nomes descritivos e padronizados
- Exemplo: "Kit Básico", "Kit CAN", "Kit Frotas"
- Evite abreviações desnecessárias

### 2. Descrições Detalhadas

- Inclua informações sobre quando usar cada kit
- Mencione tipos de veículos compatíveis
- Descreva o propósito do kit

### 3. Organização de Acessórios

- Liste acessórios em ordem de instalação
- Agrupe itens similares
- Use quantidades realistas

### 4. Manutenção Regular

- Revise kits periodicamente
- Atualize conforme novos equipamentos
- Remova itens obsoletos

### 5. Documentação de Observações

- Use o campo "observações" para:
  - Especificações técnicas
  - Compatibilidade com modelos
  - Instruções especiais
  - Fornecedores preferenciais

## Integração com Relatórios

Os kits podem ser utilizados em:

### 1. Relatórios de Homologação
```typescript
// Exemplo de uso em relatório
const generateHomologationReport = async (cardId: string) => {
  const kits = await fetchHomologationKits(cardId);
  
  return {
    homologation: card,
    kits: kits.map(kit => ({
      name: kit.name,
      accessories: kit.accessories,
      totalItems: kit.accessories.reduce((sum, acc) => sum + acc.quantity, 0)
    }))
  };
};
```

### 2. Lista de Material
```typescript
// Gerar lista de compras baseada nos kits
const generateShoppingList = (kits: HomologationKit[]) => {
  const consolidated = new Map<string, number>();
  
  kits.forEach(kit => {
    kit.accessories.forEach(acc => {
      const current = consolidated.get(acc.accessory_name) || 0;
      consolidated.set(acc.accessory_name, current + acc.quantity);
    });
  });
  
  return Array.from(consolidated.entries())
    .map(([name, quantity]) => ({ name, quantity }));
};
```

### 3. Controle de Estoque
```typescript
// Verificar disponibilidade de itens
const checkKitAvailability = async (kitId: string) => {
  const kit = await fetchHomologationKits(kitId);
  
  // Integração com sistema de estoque
  const availability = await Promise.all(
    kit.accessories.map(async (acc) => ({
      accessory: acc.accessory_name,
      needed: acc.quantity,
      available: await getStockQuantity(acc.accessory_name),
      sufficient: await getStockQuantity(acc.accessory_name) >= acc.quantity
    }))
  );
  
  return availability;
};
```

## Considerações Técnicas

### 1. Performance
- As consultas são otimizadas com índices
- Carregamento sob demanda dos acessórios
- Cache de kits frequentemente utilizados

### 2. Segurança
- RLS habilitado para todas as tabelas
- Validação de entrada nos formulários
- Transações atômicas para operações complexas

### 3. Escalabilidade
- Estrutura preparada para milhares de kits
- Suporte a busca e filtros avançados
- Arquivamento de kits antigos

### 4. Backup e Recuperação
- Kits são incluídos nos backups regulares
- Possibilidade de exportar/importar kits
- Histórico de alterações (através dos timestamps)

## Próximas Funcionalidades

### 1. Templates de Kit
- Kits pré-definidos por categoria de veículo
- Importação/exportação de templates
- Versionamento de kits

### 2. Integração com Estoque
- Verificação automática de disponibilidade
- Reserva de itens para homologações
- Alertas de itens em falta

### 3. Custos e Orçamentos
- Cálculo automático do custo dos kits
- Comparação de fornecedores
- Relatórios financeiros

### 4. Fotos dos Kits
- Upload de imagens dos kits montados
- Galeria visual para referência
- Comparação antes/depois da instalação

## Suporte e Manutenção

Para questões relacionadas ao sistema de kits:

1. **Problemas Técnicos**: Verifique os logs da aplicação
2. **Dados Corrompidos**: Execute os scripts de validação
3. **Performance**: Monitore as consultas no banco
4. **Backup**: Confirme inclusão nas rotinas de backup

## Código de Exemplo Completo

```typescript
// Exemplo completo de uso
import { 
  fetchHomologationKits, 
  createHomologationKit, 
  updateHomologationKit 
} from '@/services/homologationKitService';

// Criar kit padrão para nova homologação
const createDefaultKit = async (homologationId: string) => {
  const defaultKit = {
    homologation_card_id: homologationId,
    name: "Kit Padrão",
    description: "Kit básico para homologação inicial",
    accessories: [
      { accessory_name: "Rastreador GPS", quantity: 1 },
      { accessory_name: "Antena GPS", quantity: 1 },
      { accessory_name: "Cabo de alimentação", quantity: 1 },
      { accessory_name: "Fusível 5A", quantity: 2 },
      { accessory_name: "Abraçadeiras", quantity: 10 }
    ]
  };
  
  return await createHomologationKit(defaultKit);
};
```

Este guia fornece uma base sólida para o uso efetivo do sistema de gerenciamento de kits, garantindo padronização e eficiência no processo de homologação.
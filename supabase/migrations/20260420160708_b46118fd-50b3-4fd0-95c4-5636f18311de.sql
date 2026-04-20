
-- ========================================================
-- ETAPA 1+2 — Criar perfil "Homologação + Planejamento" e atribuir/migrar usuários
-- ========================================================

-- Criar perfil "Homologação + Planejamento" para os 4 usuários com combinação especial
INSERT INTO public.access_profiles (name, description, base_role, permissions, created_by)
VALUES (
  'Homologação + Planejamento',
  'Acesso combinado de Homologação, Planejamento e Agendamento (perfil migrado de permissões legadas)',
  'operador'::public.app_role,
  jsonb_build_object(
    'kickoff','none',
    'customer_tracking','none',
    'homologation','edit',
    'kits','none',
    'accessories_supplies','none',
    'planning','edit',
    'scheduling','edit',
    'kanban','none',
    'orders','none',
    'dashboard','none',
    'technicians','none',
    'users','none'
  ),
  NULL
)
ON CONFLICT DO NOTHING;

-- Etapa 1: Atribuir perfil aos 2 usuários quebrados (operador_homologacao -> operador + Operador de Homologação)
-- installer@segsat.com
UPDATE public.user_roles
SET role = 'operador'::public.app_role,
    access_profile_id = 'ceb59f15-3076-48b9-aba4-52aa73a255c6' -- Operador de Homologação
WHERE user_id = 'c256c974-b5c2-4a59-9bf7-822f1c61bbc5';

-- joao.morais@segsat.com
UPDATE public.user_roles
SET role = 'operador'::public.app_role,
    access_profile_id = 'ceb59f15-3076-48b9-aba4-52aa73a255c6'
WHERE user_id = 'd5cc185d-da88-4eb8-a753-976cab03a550';

-- Etapa 2: Migrar usuários órfãos para perfis nominais
-- breno.henrique, marcus.fernandes -> Operador de Homologação
UPDATE public.user_roles SET access_profile_id = 'ceb59f15-3076-48b9-aba4-52aa73a255c6'
WHERE user_id IN ('d53bdbb4-3840-4f74-aee6-e7e169fcee30','13393c8a-1f9a-46bd-9bda-7a572770ed82');

-- rodrigo.grimaldi, sebastiao.patrocinio -> Operador de Kickoff
UPDATE public.user_roles SET access_profile_id = '20842543-e161-48e3-b785-70a46f5cde18'
WHERE user_id IN ('286589f1-8c36-46d5-87da-280c23b89094','29399c66-4251-4f13-b0fb-25e4d559f8d0');

-- franciele.moura, pedro.nascimento -> Operador de logística
UPDATE public.user_roles SET access_profile_id = '85fba03d-7ffb-4033-8ba4-f08b77c16a79'
WHERE user_id IN ('289e6183-c75d-4d18-98dc-d29f5bd092a5','6df895a8-9b99-4dd7-8ca9-10b25e58acfb');

-- Os 4 com combinação especial -> novo perfil "Homologação + Planejamento"
UPDATE public.user_roles
SET access_profile_id = (SELECT id FROM public.access_profiles WHERE name = 'Homologação + Planejamento' LIMIT 1)
WHERE user_id IN (
  '231f21ef-01c3-40af-9d3f-24d9ac5edf59', -- cesar.santos
  '12dd36bc-a5b4-4db6-b182-1327466ad1b3', -- joao.gomes
  '21acdb62-a5ec-4473-bbc3-d8aaa0776326', -- mikael.jose
  '8b69d452-eb8d-426d-ba18-8ac8c81b4255'  -- pilatos.santos
);

-- ========================================================
-- ETAPA 3 — Limpar permissões legadas redundantes
-- ========================================================
-- Deletar TODAS as entradas de user_module_permissions para:
-- (a) qualquer usuário que tenha um access_profile_id atribuído (perfil é fonte única)
-- (b) qualquer usuário admin (admin bypassa tudo)
DELETE FROM public.user_module_permissions
WHERE user_id IN (
  SELECT user_id FROM public.user_roles
  WHERE access_profile_id IS NOT NULL OR role = 'admin'::public.app_role
);

-- ========================================================
-- ETAPA 4 — Corrigir RLS de Logística (pedidos, veiculos, rastreadores)
-- ========================================================

-- PEDIDOS: nova policy de SELECT alinhada com perfis
DROP POLICY IF EXISTS "Users can view their own orders or AUTO orders" ON public.pedidos;
DROP POLICY IF EXISTS "Operador agendamento can view orders" ON public.pedidos;
DROP POLICY IF EXISTS "Users with operational view access can view pedidos" ON public.pedidos;

CREATE POLICY "Users with operational view access can view pedidos"
ON public.pedidos
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'gestor'::public.app_role)
  OR public.has_module_access(auth.uid(), 'orders'::public.app_module, 'view'::public.permission_level)
  OR public.has_module_access(auth.uid(), 'kanban'::public.app_module, 'view'::public.permission_level)
  OR public.has_module_access(auth.uid(), 'dashboard'::public.app_module, 'view'::public.permission_level)
  OR public.has_module_access(auth.uid(), 'customer_tracking'::public.app_module, 'view'::public.permission_level)
  OR public.has_module_access(auth.uid(), 'planning'::public.app_module, 'view'::public.permission_level)
  OR usuario_id = auth.uid()
  OR numero_pedido LIKE 'AUTO-%'
);

-- VEICULOS: alinhar visibilidade ao acesso ao pedido pai
DROP POLICY IF EXISTS "Users can view vehicles of their orders" ON public.veiculos;
DROP POLICY IF EXISTS "Operador agendamento can view vehicles" ON public.veiculos;
DROP POLICY IF EXISTS "Users with operational view access can view veiculos" ON public.veiculos;

CREATE POLICY "Users with operational view access can view veiculos"
ON public.veiculos
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'gestor'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = veiculos.pedido_id
      AND (
        public.has_module_access(auth.uid(), 'orders'::public.app_module, 'view'::public.permission_level)
        OR public.has_module_access(auth.uid(), 'kanban'::public.app_module, 'view'::public.permission_level)
        OR public.has_module_access(auth.uid(), 'dashboard'::public.app_module, 'view'::public.permission_level)
        OR public.has_module_access(auth.uid(), 'customer_tracking'::public.app_module, 'view'::public.permission_level)
        OR public.has_module_access(auth.uid(), 'planning'::public.app_module, 'view'::public.permission_level)
        OR p.usuario_id = auth.uid()
        OR p.numero_pedido LIKE 'AUTO-%'
      )
  )
);

-- RASTREADORES: idem
DROP POLICY IF EXISTS "Users can view trackers of their orders" ON public.rastreadores;
DROP POLICY IF EXISTS "Operador agendamento can view trackers" ON public.rastreadores;
DROP POLICY IF EXISTS "Users with operational view access can view rastreadores" ON public.rastreadores;

CREATE POLICY "Users with operational view access can view rastreadores"
ON public.rastreadores
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'gestor'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = rastreadores.pedido_id
      AND (
        public.has_module_access(auth.uid(), 'orders'::public.app_module, 'view'::public.permission_level)
        OR public.has_module_access(auth.uid(), 'kanban'::public.app_module, 'view'::public.permission_level)
        OR public.has_module_access(auth.uid(), 'dashboard'::public.app_module, 'view'::public.permission_level)
        OR public.has_module_access(auth.uid(), 'customer_tracking'::public.app_module, 'view'::public.permission_level)
        OR public.has_module_access(auth.uid(), 'planning'::public.app_module, 'view'::public.permission_level)
        OR p.usuario_id = auth.uid()
        OR p.numero_pedido LIKE 'AUTO-%'
      )
  )
);

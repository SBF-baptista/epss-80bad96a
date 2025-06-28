
-- Criar enum para status dos pedidos
CREATE TYPE public.status_pedido AS ENUM (
  'novos',
  'producao', 
  'aguardando',
  'enviado',
  'standby'
);

-- Tabela de perfis de usuários (conectada ao auth.users do Supabase)
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de pedidos
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  numero_pedido TEXT NOT NULL UNIQUE,
  data TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  configuracao TEXT NOT NULL,
  status status_pedido DEFAULT 'novos' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de veículos
CREATE TABLE public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de rastreadores
CREATE TABLE public.rastreadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
  modelo TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Habilitar Row Level Security (RLS) em todas as tabelas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rastreadores ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuários
CREATE POLICY "Usuários podem ver seu próprio perfil" 
  ON public.usuarios 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
  ON public.usuarios 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Políticas RLS para pedidos
CREATE POLICY "Usuários podem ver seus próprios pedidos" 
  ON public.pedidos 
  FOR SELECT 
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem criar seus próprios pedidos" 
  ON public.pedidos 
  FOR INSERT 
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem atualizar seus próprios pedidos" 
  ON public.pedidos 
  FOR UPDATE 
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem deletar seus próprios pedidos" 
  ON public.pedidos 
  FOR DELETE 
  USING (auth.uid() = usuario_id);

-- Políticas RLS para veículos
CREATE POLICY "Usuários podem ver veículos de seus pedidos" 
  ON public.veiculos 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE pedidos.id = veiculos.pedido_id 
    AND pedidos.usuario_id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir veículos em seus pedidos" 
  ON public.veiculos 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE pedidos.id = veiculos.pedido_id 
    AND pedidos.usuario_id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar veículos de seus pedidos" 
  ON public.veiculos 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE pedidos.id = veiculos.pedido_id 
    AND pedidos.usuario_id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar veículos de seus pedidos" 
  ON public.veiculos 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE pedidos.id = veiculos.pedido_id 
    AND pedidos.usuario_id = auth.uid()
  ));

-- Políticas RLS para rastreadores
CREATE POLICY "Usuários podem ver rastreadores de seus pedidos" 
  ON public.rastreadores 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE pedidos.id = rastreadores.pedido_id 
    AND pedidos.usuario_id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir rastreadores em seus pedidos" 
  ON public.rastreadores 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE pedidos.id = rastreadores.pedido_id 
    AND pedidos.usuario_id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar rastreadores de seus pedidos" 
  ON public.rastreadores 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE pedidos.id = rastreadores.pedido_id 
    AND pedidos.usuario_id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar rastreadores de seus pedidos" 
  ON public.rastreadores 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE pedidos.id = rastreadores.pedido_id 
    AND pedidos.usuario_id = auth.uid()
  ));

-- Função para criar perfil de usuário automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil automaticamente quando usuário se registra
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Índices para melhorar performance
CREATE INDEX idx_pedidos_usuario_id ON public.pedidos(usuario_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_veiculos_pedido_id ON public.veiculos(pedido_id);
CREATE INDEX idx_rastreadores_pedido_id ON public.rastreadores(pedido_id);

import { supabase } from "@/integrations/supabase/client";

export const testSegsaleAPI = async () => {
  try {
    console.log('🔄 Testando integração com Segsale API...');
    
    const { data, error } = await supabase.functions.invoke('fetch-segsale-products', {
      method: 'GET',
    });

    if (error) {
      console.error('❌ Erro ao chamar função:', error);
      return { error: error.message };
    }

    console.log('✅ Dados recebidos da Segsale API:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (err: any) {
    console.error('❌ Exceção:', err);
    return { error: err.message };
  }
};

// Auto-execute on import
testSegsaleAPI().then(result => {
  console.log('📊 Resultado final:', result);
});

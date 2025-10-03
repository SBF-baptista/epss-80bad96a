// Temporary utility to fetch Segsale ID 107 data
export const fetchSegsale107 = async () => {
  try {
    const response = await fetch(
      'https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/fetch-segsale-products?idResumoVenda=107'
    );
    
    if (!response.ok) {
      console.error('❌ Error fetching Segsale data:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Segsale ID 107 Data:');
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ Exception:', error);
    return null;
  }
};

// Auto-execute
fetchSegsale107();

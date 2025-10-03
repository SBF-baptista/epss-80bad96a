// Temporary test file to fetch Segsale data with ID 107
export const testSegsaleFetch = async () => {
  const url = `https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/fetch-segsale-products?idResumoVenda=107`;
  
  console.log('Fetching Segsale data for ID 107...');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error fetching Segsale data:', errorData);
      return { error: errorData };
    }

    const data = await response.json();
    console.log('Segsale data received:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Exception fetching Segsale data:', error);
    return { error: error.message };
  }
};

// Auto-execute when imported
testSegsaleFetch();
export const displaySegsaleData = async () => {
  try {
    const url = 'https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/fetch-segsale-products?idResumoVenda=107';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: true,
        status: response.status,
        message: errorText || response.statusText
      };
    }

    const data = await response.json();
    return {
      success: true,
      data
    };
  } catch (error: any) {
    return {
      error: true,
      message: error.message
    };
  }
};

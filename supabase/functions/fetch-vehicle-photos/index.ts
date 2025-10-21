import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
}

interface VehiclePhoto {
  url: string
  title: string
  source: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const brand = url.searchParams.get('brand')
    const model = url.searchParams.get('model')
    const year = url.searchParams.get('year')

    if (!brand || !model) {
      return new Response(
        JSON.stringify({ error: 'Brand and model are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Searching photos for: ${brand} ${model} ${year || ''}`)

    // Build search query
    const searchQuery = `${brand} ${model} ${year || ''} carro`.trim()
    const encodedQuery = encodeURIComponent(searchQuery)

    // Search using Google Custom Search API or similar
    // For now, we'll use a simple web search approach
    const searchUrl = `https://www.google.com/search?q=${encodedQuery}&tbm=isch`

    // Alternative: Use Bing Image Search API
    const bingApiKey = Deno.env.get('BING_SEARCH_API_KEY')
    
    if (bingApiKey) {
      const bingUrl = `https://api.bing.microsoft.com/v7.0/images/search?q=${encodedQuery}&count=10`
      
      const response = await fetch(bingUrl, {
        headers: {
          'Ocp-Apim-Subscription-Key': bingApiKey
        }
      })

      if (!response.ok) {
        throw new Error(`Bing API error: ${response.status}`)
      }

      const data = await response.json()
      
      const photos: VehiclePhoto[] = data.value?.map((item: any) => ({
        url: item.contentUrl,
        thumbnailUrl: item.thumbnailUrl,
        title: item.name,
        source: item.hostPageUrl,
        width: item.width,
        height: item.height
      })) || []

      return new Response(
        JSON.stringify({ 
          success: true,
          photos,
          query: searchQuery
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fallback: Return search URL and mock data for demonstration
    const mockPhotos: VehiclePhoto[] = [
      {
        url: searchUrl,
        title: `${brand} ${model} ${year || ''}`,
        source: 'google'
      }
    ]

    return new Response(
      JSON.stringify({ 
        success: true,
        photos: mockPhotos,
        query: searchQuery,
        note: 'Configure BING_SEARCH_API_KEY for real image search results'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error fetching vehicle photos:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch vehicle photos',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

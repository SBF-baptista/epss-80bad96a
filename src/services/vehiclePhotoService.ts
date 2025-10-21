import { supabase } from '@/integrations/supabase/client'

export interface VehiclePhoto {
  url: string
  thumbnailUrl?: string
  title: string
  source: string
  width?: number
  height?: number
}

export interface VehiclePhotoResponse {
  success: boolean
  photos: VehiclePhoto[]
  query: string
  note?: string
  error?: string
}

export const fetchVehiclePhotos = async (
  brand: string,
  model: string,
  year?: number
): Promise<VehiclePhotoResponse> => {
  console.log('Fetching vehicle photos:', { brand, model, year })

  try {
    const params = new URLSearchParams({
      brand: brand.trim(),
      model: model.trim(),
    })

    if (year) {
      params.set('year', year.toString())
    }

    const { data, error } = await supabase.functions.invoke('fetch-vehicle-photos', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (error) {
      console.error('Error fetching vehicle photos:', error)
      throw error
    }

    return data as VehiclePhotoResponse
  } catch (error) {
    console.error('Failed to fetch vehicle photos:', error)
    return {
      success: false,
      photos: [],
      query: `${brand} ${model} ${year || ''}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

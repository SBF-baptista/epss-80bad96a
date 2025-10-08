import { supabase } from "@/integrations/supabase/client";
import { getBrandCategory } from "@/types/vehicleCategories";

export interface HomologationCard {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  status: 'homologar' | 'em_homologacao' | 'agendamento_teste' | 'execucao_teste' | 'em_testes_finais' | 'armazenamento_plataforma' | 'homologado';
  requested_by: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  incoming_vehicle_id: string | null;
  created_order_id: string | null;
  configuration: string | null;
  test_scheduled_date: string | null;
  test_location: string | null;
  test_technician: string | null;
  installation_photos: string[] | null;
  chassis_info: string | null;
  manufacture_year: number | null;
  electrical_connection_type: string | null;
  technical_observations: string | null;
  test_checklist: any | null;
}

export interface HomologationPhoto {
  id: string;
  homologation_card_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  photo_type: string | null;
}

export interface HomologationFilters {
  brand?: string;
  year?: string;
  searchText?: string;
  category?: "HCV" | "LCV" | "";
}

export interface WorkflowChainItem {
  incoming_vehicle_id: string | null;
  vehicle: string | null;
  brand: string | null;
  year: number | null;
  quantity: number | null;
  usage_type: string | null;
  received_at: string | null;
  incoming_processed: boolean | null;
  homologation_id: string | null;
  homologation_status: string | null;
  homologation_created_at: string | null;
  homologation_updated_at: string | null;
  order_id: string | null;
  order_number: string | null;
  order_status: string | null;
  order_created_at: string | null;
  processing_notes: string | null;
}

export const fetchHomologationCards = async (): Promise<HomologationCard[]> => {
  const { data, error } = await supabase
    .from('homologation_cards')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching homologation cards:', error);
    throw error;
  }

  return data || [];
};

export const filterHomologationCards = (
  cards: HomologationCard[],
  filters: HomologationFilters
): HomologationCard[] => {
  return cards.filter(card => {
    // Brand filter
    if (filters.brand && card.brand !== filters.brand) {
      return false;
    }
    
    // Category filter
    if (filters.category && (filters.category === "HCV" || filters.category === "LCV")) {
      const brandCategories = getBrandCategory(card.brand);
      if (!brandCategories.includes(filters.category)) {
        return false;
      }
    }
    
    // Year filter
    if (filters.year && card.year?.toString() !== filters.year) {
      return false;
    }
    
    // Search text filter - search in brand, model, configuration, and notes
    if (filters.searchText) {
      const searchText = filters.searchText.toLowerCase();
      const searchableText = [
        card.brand,
        card.model,
        card.configuration,
        card.notes,
        card.chassis_info,
        card.technical_observations
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(searchText)) {
        return false;
      }
    }
    
    return true;
  });
};

export const softDeleteHomologationCard = async (cardId: string): Promise<void> => {
  const { error } = await supabase
    .from('homologation_cards')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', cardId);

  if (error) {
    console.error('Error deleting homologation card:', error);
    throw error;
  }
};

export const fetchWorkflowChain = async (): Promise<WorkflowChainItem[]> => {
  const { data, error } = await supabase
    .from('workflow_chain')
    .select('*')
    .order('received_at', { ascending: false });

  if (error) {
    console.error('Error fetching workflow chain:', error);
    throw error;
  }

  return data || [];
};

export const updateHomologationStatus = async (
  cardId: string, 
  status: HomologationCard['status']
): Promise<void> => {
  const { error } = await supabase
    .from('homologation_cards')
    .update({ status })
    .eq('id', cardId);

  if (error) {
    console.error('Error updating homologation status:', error);
    throw error;
  }

  // When a card is approved/homologated, automatically create a kit if it doesn't exist
  if (status === 'homologado') {
    try {
      // Check if kit already exists for this card
      const { data: existingKits } = await supabase
        .from('homologation_kits')
        .select('id')
        .eq('homologation_card_id', cardId)
        .limit(1);

      if (existingKits && existingKits.length > 0) {
        console.log('Kit already exists for this homologation card');
        return;
      }

      // Get card details and related incoming vehicle
      const { data: card } = await supabase
        .from('homologation_cards')
        .select('*, incoming_vehicle:incoming_vehicles(*)')
        .eq('id', cardId)
        .single();

      if (!card || !card.incoming_vehicle) {
        console.log('No incoming vehicle found for this card');
        return;
      }

      const incomingVehicle = Array.isArray(card.incoming_vehicle) 
        ? card.incoming_vehicle[0] 
        : card.incoming_vehicle;

      // Get accessories for this company
      const { data: accessories } = await supabase
        .from('accessories')
        .select('*')
        .eq('company_name', incomingVehicle.company_name);

      // Create kit with accessories
      const kitName = `Kit ${card.brand} ${card.model} ${card.year || ''}`.trim();
      
      const { data: newKit, error: kitError } = await supabase
        .from('homologation_kits')
        .insert({
          homologation_card_id: cardId,
          name: kitName,
          description: `Kit criado automaticamente para ${incomingVehicle.company_name} - ${incomingVehicle.usage_type || ''}`,
        })
        .select()
        .single();

      if (kitError || !newKit) {
        console.error('Error creating automatic kit:', kitError);
        return;
      }

      // Add accessories to kit if any exist
      if (accessories && accessories.length > 0) {
        const kitAccessories = accessories.map(acc => ({
          kit_id: newKit.id,
          item_name: acc.accessory_name,
          item_type: 'accessory',
          quantity: acc.quantity,
          description: `Importado do Segsale - ${incomingVehicle.usage_type || ''}`,
        }));

        const { error: accessoriesError } = await supabase
          .from('homologation_kit_accessories')
          .insert(kitAccessories);

        if (accessoriesError) {
          console.error('Error adding accessories to kit:', accessoriesError);
        } else {
          console.log(`✅ Kit criado automaticamente: ${kitName} com ${accessories.length} acessórios`);
        }
      } else {
        console.log(`✅ Kit criado automaticamente: ${kitName} (sem acessórios)`);
      }
    } catch (error) {
      console.error('Error creating automatic kit:', error);
      // Don't throw - we don't want to block the status update if kit creation fails
    }
  }
};

export const createHomologationCard = async (
  brand: string,
  model: string,
  year?: number,
  notes?: string,
  executeNow?: boolean
): Promise<HomologationCard> => {
  console.log('Creating homologation card:', { brand, model, year, notes, executeNow });
  const status = executeNow ? 'execucao_teste' : 'homologar';
  
  // Normalize the input for consistent comparison
  const normalizedBrand = brand.trim().toUpperCase();
  const normalizedModel = model.trim().toUpperCase();

  // Check if a card with the same brand, model and year already exists (case insensitive)
  let query = supabase
    .from('homologation_cards')
    .select('*')
    .ilike('brand', normalizedBrand)
    .ilike('model', normalizedModel)
    .is('deleted_at', null);

  // If year is provided, include it in the duplicate check
  if (year) {
    query = query.eq('year', year);
  } else {
    // If no year provided, check for existing cards without year
    query = query.is('year', null);
  }

  const { data: existingCard, error: checkError } = await query.maybeSingle();
  
  console.log('Duplicate check result:', { existingCard, checkError, normalizedBrand, normalizedModel, year });

  if (checkError) {
    console.error('Error checking existing homologation card:', checkError);
    throw checkError;
  }

  if (existingCard) {
    const yearText = year ? ` (ano ${year})` : '';
    console.log('Found existing card:', existingCard);
    throw new Error(`Já existe uma homologação para ${brand} ${model}${yearText}. Você pode editar a homologação existente ou excluí-la antes de criar uma nova.`);
  }
  
  // Get the current user ID for the requested_by field
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('homologation_cards')
    .insert({
      brand: normalizedBrand,
      model: normalizedModel,
      year,
      status,
      notes,
      requested_by: user?.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating homologation card:', error);
    
    // Check if it's a duplicate key constraint error
    if (error.code === '23505' && error.message.includes('homologation_cards_brand_model_key')) {
      throw new Error(`Já existe uma homologação para ${normalizedBrand} ${normalizedModel}. Verifique se não foi criada por outro usuário recentemente.`);
    }
    
    throw error;
  }

  return data;
};

export const updateHomologationConfiguration = async (
  cardId: string,
  configuration: string
): Promise<void> => {
  const { error } = await supabase
    .from('homologation_cards')
    .update({ configuration })
    .eq('id', cardId);

  if (error) {
    console.error('Error updating homologation configuration:', error);
    throw error;
  }
};

export const fetchAutomationConfigurations = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('automation_rules_extended')
    .select('configuration')
    .order('configuration');

  if (error) {
    console.error('Error fetching automation configurations:', error);
    throw error;
  }

  // Remove duplicates and filter out null values
  const configurations = [...new Set(data?.map(item => item.configuration).filter(Boolean))];
  return configurations;
};

export const createAutomationRule = async (
  brand: string,
  model: string,
  configuration: string,
  trackerModel: string,
  category: string = 'Homologação',
  modelYear?: string
): Promise<void> => {
  const { error } = await supabase
    .from('automation_rules_extended')
    .insert({
      brand,
      model,
      configuration,
      tracker_model: trackerModel,
      category,
      model_year: modelYear
    });

  if (error) {
    console.error('Error creating automation rule:', error);
    throw error;
  }
};

export const updateHomologationNotes = async (
  cardId: string,
  notes: string
): Promise<void> => {
  const { error } = await supabase
    .from('homologation_cards')
    .update({ notes })
    .eq('id', cardId);

  if (error) {
    console.error('Error updating homologation notes:', error);
    throw error;
  }
};

export const fetchHomologationPhotos = async (cardId: string): Promise<HomologationPhoto[]> => {
  const { data, error } = await supabase
    .from('homologation_photos')
    .select('id, homologation_card_id, file_name, file_path, file_size, content_type, uploaded_by, created_at, photo_type')
    .eq('homologation_card_id', cardId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching homologation photos:', error);
    throw error;
  }

  return data || [];
};

export const uploadHomologationPhoto = async (
  cardId: string,
  file: File,
  photoType?: string
): Promise<{ photo: HomologationPhoto; url: string }> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${cardId}/${Date.now()}.${fileExt}`;
  
  // Upload to storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from('homologation-photos')
    .upload(fileName, file);

  if (storageError) {
    console.error('Error uploading file:', storageError);
    throw storageError;
  }

  // Save photo record to database
  const { data: photoData, error: photoError } = await supabase
    .from('homologation_photos')
    .insert({
      homologation_card_id: cardId,
      file_name: file.name,
      file_path: storageData.path,
      file_size: file.size,
      content_type: file.type,
      photo_type: photoType,
    })
    .select()
    .single();

  if (photoError) {
    console.error('Error saving photo record:', photoError);
    throw photoError;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('homologation-photos')
    .getPublicUrl(storageData.path);

  return {
    photo: photoData,
    url: urlData.publicUrl
  };
};

export const updatePhotoType = async (
  photoId: string,
  photoType: string
): Promise<void> => {
  const { error } = await supabase
    .from('homologation_photos')
    .update({ photo_type: photoType })
    .eq('id', photoId);

  if (error) {
    console.error('Error updating photo type:', error);
    throw error;
  }
};

export const deleteHomologationPhoto = async (photoId: string, filePath: string): Promise<void> => {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('homologation-photos')
    .remove([filePath]);

  if (storageError) {
    console.error('Error deleting file from storage:', storageError);
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('homologation_photos')
    .delete()
    .eq('id', photoId);

  if (dbError) {
    console.error('Error deleting photo record:', dbError);
    throw dbError;
  }
};

export const getPhotoUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from('homologation-photos')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};

// New functions for enhanced workflow steps

export const scheduleTest = async (
  cardId: string,
  testDate: string,
  location: string,
  technician: string
): Promise<void> => {
  const { error } = await supabase
    .from('homologation_cards')
    .update({ 
      test_scheduled_date: testDate,
      test_location: location,
      test_technician: technician,
      status: 'agendamento_teste'
    })
    .eq('id', cardId);

  if (error) {
    console.error('Error scheduling test:', error);
    throw error;
  }
};

export const updateTestExecution = async (
  cardId: string,
  chassisInfo: string,
  manufactureYear: number,
  electricalConnectionType: string,
  technicalObservations: string,
  testChecklist: any,
  testConfiguration?: string
): Promise<void> => {
  const updateData: any = {
    chassis_info: chassisInfo,
    manufacture_year: manufactureYear,
    electrical_connection_type: electricalConnectionType,
    technical_observations: technicalObservations,
    test_checklist: testChecklist,
    status: 'execucao_teste'
  };

  // Only update configuration if it's provided and different from current
  if (testConfiguration) {
    updateData.configuration = testConfiguration;
  }

  const { error } = await supabase
    .from('homologation_cards')
    .update(updateData)
    .eq('id', cardId);

  if (error) {
    console.error('Error updating test execution:', error);
    throw error;
  }
};

export const storeInPlatform = async (
  cardId: string,
  installationPhotos: string[]
): Promise<void> => {
  const { error } = await supabase
    .from('homologation_cards')
    .update({ 
      installation_photos: installationPhotos,
      status: 'armazenamento_plataforma'
    })
    .eq('id', cardId);

  if (error) {
    console.error('Error storing in platform:', error);
    throw error;
  }
};

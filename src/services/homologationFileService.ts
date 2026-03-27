import { supabase } from "@/integrations/supabase/client";

export interface HomologationFile {
  id: string;
  homologation_card_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export const uploadHomologationFile = async (
  cardId: string,
  file: File
): Promise<{ file: HomologationFile; url: string }> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${cardId}/${Date.now()}_${file.name}`;

  const { data: storageData, error: storageError } = await supabase.storage
    .from('homologation-files')
    .upload(fileName, file);

  if (storageError) {
    console.error('Error uploading file:', storageError);
    throw storageError;
  }

  const { data: fileData, error: fileError } = await supabase
    .from('homologation_files')
    .insert({
      homologation_card_id: cardId,
      file_name: file.name,
      file_path: storageData.path,
      file_size: file.size,
      content_type: file.type,
    })
    .select()
    .single();

  if (fileError) {
    console.error('Error saving file record:', fileError);
    throw fileError;
  }

  const { data: urlData } = supabase.storage
    .from('homologation-files')
    .getPublicUrl(storageData.path);

  return { file: fileData as HomologationFile, url: urlData.publicUrl };
};

export const fetchHomologationFiles = async (cardId: string): Promise<(HomologationFile & { url: string })[]> => {
  const { data, error } = await supabase
    .from('homologation_files')
    .select('*')
    .eq('homologation_card_id', cardId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching files:', error);
    throw error;
  }

  return (data || []).map((f: any) => {
    const { data: urlData } = supabase.storage
      .from('homologation-files')
      .getPublicUrl(f.file_path);
    return { ...f, url: urlData.publicUrl } as HomologationFile & { url: string };
  });
};

export const deleteHomologationFile = async (fileId: string, filePath: string): Promise<void> => {
  const { error: storageError } = await supabase.storage
    .from('homologation-files')
    .remove([filePath]);

  if (storageError) {
    console.error('Error deleting file from storage:', storageError);
  }

  const { error: dbError } = await supabase
    .from('homologation_files')
    .delete()
    .eq('id', fileId);

  if (dbError) {
    console.error('Error deleting file record:', dbError);
    throw dbError;
  }
};

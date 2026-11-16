  async function handleUpdateLogo(file: File) {
    setUploadingId('logo');
    const publicUrl = await uploadImageToStorage(file);
    if (publicUrl) {
      await supabase.from('store_settings').upsert({ id: 1, logo_url: publicUrl });
      setLogoUrl(publicUrl);
      await fetchStoreData();
    }
    setUploadingId(null);
  }

  async function handleUpdateBanner(file: File) {
    setUploadingId('banner');
    const publicUrl = await uploadImageToStorage(file);
    if (publicUrl) {
      await supabase.from('store_settings').upsert({ id: 1, banner_image_url: publicUrl });
      setBannerUrl(publicUrl);
      await fetchStoreData();
    }
    setUploadingId(null);
  }

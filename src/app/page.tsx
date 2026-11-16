  async function handleSaveProductImage(productId: string) {
    const file = productFiles[productId];
    if (!file) return;
    setUploadingId(productId);
    const publicUrl = await uploadImageToStorage(file);
    if (publicUrl) {
      const { error } = await supabase
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', productId);

      if (error) {
        alert('خطأ في حفظ صورة الصنف بقاعدة البيانات: ' + error.message);
      } else {
        setProductFiles((prev) => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });
        setProductPreviews((prev) => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });
        await fetchStoreData();
        alert('تم تحديث صورة الصنف وحفظها بنجاح!');
      }
    }
    setUploadingId(null);
  }

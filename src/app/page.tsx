'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ShoppingBag,
  Phone,
  MapPin,
  Plus,
  Minus,
  Trash2,
  Lock,
  LogOut,
  CheckCircle2,
  Sparkles,
  Store,
  Edit3,
  Save,
  X,
  Camera,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ckrfnznzjfmdynjfnxie.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Category {
  id: string;
  name_ar: string;
  slug: string;
}

interface Product {
  id: string;
  category_id: string;
  name_ar: string;
  description_ar: string;
  price: number;
  unit: string;
  is_available: boolean;
  image_url?: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function AlAmeedStore() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // حالات معاينة وحفظ الصور الجديدة
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [productFiles, setProductFiles] = useState<{ [key: string]: File }>({});
  const [productPreviews, setProductPreviews] = useState<{ [key: string]: string }>({});

  // بيانات العميل للطلب
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // لوحة الإدارة
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCat, setNewProductCat] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('كيلو');
  const [newProductFile, setNewProductFile] = useState<File | null>(null);
  const [newProductPreview, setNewProductPreview] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchStoreData();
    checkSession();
  }, []);

  async function checkSession() {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setAdminUser(data.session.user);
    }
  }

  async function fetchStoreData() {
    setLoading(true);
    const [catRes, prodRes, settingsRes] = await Promise.all([
      supabase.from('categories').select('*').order('name_ar'),
      supabase.from('products').select('*').order('name_ar'),
      supabase.from('store_settings').select('logo_url, banner_image_url').eq('id', 1).maybeSingle(),
    ]);
    if (catRes.data) {
      setCategories(catRes.data);
      if (catRes.data.length > 0 && !newProductCat) {
        setNewProductCat(catRes.data[0].id);
      }
    }
    if (prodRes.data) setProducts(prodRes.data);
    if (settingsRes.data) {
      if (settingsRes.data.logo_url) setLogoUrl(settingsRes.data.logo_url);
      if (settingsRes.data.banner_image_url) setBannerUrl(settingsRes.data.banner_image_url);
    }
    setLoading(false);
  }

  async function uploadImageToStorage(file: File): Promise<string | null> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { upsert: true });

    if (error) {
      alert('حدث خطأ أثناء رفع الصورة: ' + error.message);
      return null;
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleSaveLogo() {
    if (!selectedLogoFile) return;
    setUploadingId('logo');
    const publicUrl = await uploadImageToStorage(selectedLogoFile);
    if (publicUrl) {
      await supabase.from('store_settings').upsert({ id: 1, logo_url: publicUrl });
      setLogoUrl(publicUrl);
      setSelectedLogoFile(null);
      setLogoPreview(null);
      await fetchStoreData();
    }
    setUploadingId(null);
  }

  async function handleSaveBanner() {
    if (!selectedBannerFile) return;
    setUploadingId('banner');
    const publicUrl = await uploadImageToStorage(selectedBannerFile);
    if (publicUrl) {
      await supabase.from('store_settings').upsert({ id: 1, banner_image_url: publicUrl });
      setBannerUrl(publicUrl);
      setSelectedBannerFile(null);
      setBannerPreview(null);
      await fetchStoreData();
    }
    setUploadingId(null);
  }

  async function handleSaveProductImage(productId: string) {
    const file = productFiles[productId];
    if (!file) return;
    setUploadingId(productId);
    const publicUrl = await uploadImageToStorage(file);
    if (publicUrl) {
      await supabase.from('products').update({ image_url: publicUrl }).eq('id', productId);
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
    }
    setUploadingId(null);
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerAddress || cart.length === 0) return;

    setSubmitting(true);
    try {
      await supabase.from('orders').insert([
        {
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_address: customerAddress,
          notes: orderNotes,
          items: cart.map((c) => ({
            name: c.product.name_ar,
            qty: c.quantity,
            price: c.product.price,
          })),
          total_amount: totalAmount,
          status: 'pending',
        },
      ]);
    } catch (_) {}

    const itemsLines = cart
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.product.name_ar} (${item.quantity} ${item.product.unit}) = ${
            item.product.price * item.quantity
          } ج.م`
      )
      .join('\n');

    const message = `السلام عليكم، طلب جديد من موقع *حلواني العميد* 👑\n\n*الاسم:* ${customerName}\n*الموبايل:* ${customerPhone}\n*العنوان:* ${customerAddress}\n${
      orderNotes ? `*ملاحظات:* ${orderNotes}\n` : ''
    }\n*تفاصيل الطلب:*\n${itemsLines}\n\n*الإجمالي المطلوب:* ${totalAmount} جنيه مصري`;

    const whatsappUrl = `https://wa.me/201016552275?text=${encodeURIComponent(message)}`;
    setSubmitting(false);
    setOrderSuccess(true);
    setCart([]);
    window.open(whatsappUrl, '_blank');
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError('بيانات الدخول غير صحيحة، تأكد من البريد وكلمة المرور.');
    } else {
      setAdminUser(data.user);
    }
  }

  async function handleSavePrice(productId: string) {
    const numericPrice = parseFloat(editPrice);
    if (isNaN(numericPrice) || numericPrice <= 0) return;
    await supabase.from('products').update({ price: numericPrice }).eq('id', productId);
    setEditingProductId(null);
    fetchStoreData();
  }

  async function toggleAvailability(product: Product) {
    await supabase
      .from('products')
      .update({ is_available: !product.is_available })
      .eq('id', product.id);
    fetchStoreData();
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductCat) return;
    setUploadingId('new');

    let uploadedUrl: string | null = null;
    if (newProductFile) {
      uploadedUrl = await uploadImageToStorage(newProductFile);
    }

    await supabase.from('products').insert([
      {
        name_ar: newProductName,
        price: parseFloat(newProductPrice),
        category_id: newProductCat,
        unit: newProductUnit,
        is_available: true,
        image_url: uploadedUrl,
      },
    ]);

    setNewProductName('');
    setNewProductPrice('');
    setNewProductFile(null);
    setNewProductPreview(null);
    setUploadingId(null);
    fetchStoreData();
  }

  const filteredProducts =
    selectedCat === 'all' ? products : products.filter((p) => p.category_id === selectedCat);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF2D6] text-[#064B40]">
      {/* الشريط العلوي */}
      <header className="sticky top-0 z-40 bg-[#064B40] text-[#FFF2D6] shadow-lg border-b-2 border-[#D5A642]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="حلواني العميد"
                className="w-12 h-12 rounded-full object-cover border-2 border-[#D5A642] shadow"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#D5A642] text-[#064B40] flex items-center justify-center font-black text-xl shadow">
                ع
              </div>
            )}
            <div>
              <h1 className="text-lg md:text-2xl font-black text-[#D5A642] leading-tight">
                حلواني العميد
              </h1>
            </div>
          </div>

          <button
            onClick={() => {
              setOrderSuccess(false);
              setIsCartOpen(true);
            }}
            className="relative flex items-center gap-2 bg-[#D5A642] text-[#064B40] font-extrabold px-4 py-2 rounded-xl shadow hover:brightness-105 transition"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-sm">السلة</span>
            {totalItemsCount > 0 && (
              <span className="bg-[#064B40] text-[#D5A642] text-xs font-black px-2 py-0.5 rounded-full">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* البانر الرئيسي */}
      <section className="bg-gradient-to-b from-[#064B40] to-[#085E50] text-[#FFF2D6] py-10 px-4 border-b-4 border-[#D5A642]">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 bg-[#D5A642]/20 border border-[#D5A642] text-[#D5A642] px-4 py-1 rounded-full text-xs font-bold">
            <Sparkles className="w-4 h-4" /> طازج يومياً من مصنعنا إليك مباشرة
          </span>

          {bannerUrl && (
            <div className="w-full h-56 sm:h-72 rounded-2xl overflow-hidden border-2 border-[#D5A642] shadow-2xl my-3">
              <img src={bannerUrl} alt="بانر حلواني العميد" className="w-full h-full object-cover" />
            </div>
          )}

          <h2 className="text-3xl md:text-5xl font-black text-[#FFF2D6] leading-snug">
            من إيد العميد <span className="text-[#D5A642]">الحلو أكيد</span>
          </h2>
          <p className="text-sm md:text-base text-[#FFF2D6]/90 max-w-2xl mx-auto">
            كحك ناعم، بسكويت فاخر، بيتي فور، غريبة، وأجود الحلويات الشرقية المصنوعة بأجود أنواع السمنة البلدي والمكسرات.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs md:text-sm text-[#D5A642] font-bold">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" /> الصبرية - شربين - طريق دمياط السريع
            </span>
            <a href="tel:01016552275" className="flex items-center gap-1 underline">
              <Phone className="w-4 h-4" /> 01016552275
            </a>
          </div>
        </div>
      </section>

      {/* شريط الأقسام */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition ${
              selectedCat === 'all'
                ? 'bg-[#064B40] text-[#D5A642] shadow-md'
                : 'bg-white text-[#064B40] border border-[#064B40]/20'
            }`}
          >
            جميع الأصناف
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition ${
                selectedCat === cat.id
                  ? 'bg-[#064B40] text-[#D5A642] shadow-md'
                  : 'bg-white text-[#064B40] border border-[#064B40]/20'
              }`}
            >
              {cat.name_ar}
            </button>
          ))}
        </div>

        {/* قائمة المنتجات */}
        {loading ? (
          <div className="text-center py-16 font-bold text-lg text-[#064B40]">
            جاري تحميل قائمة حلواني العميد...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id);
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#D5A642]/40 flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    {product.image_url && (
                      <div className="w-full h-48 bg-[#FFF2D6]/50 overflow-hidden">
                        <img
                          src={product.image_url}
                          alt={product.name_ar}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="p-5 pb-2">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-black text-[#064B40]">{product.name_ar}</h3>
                        <span className="bg-[#FFF2D6] text-[#064B40] border border-[#D5A642] text-xs font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap">
                          {product.unit}
                        </span>
                      </div>
                      {product.description_ar && (
                        <p className="text-xs text-[#064B40]/75 mb-2">{product.description_ar}</p>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-[#FFF2D6] flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black text-[#064B40]">{product.price}</span>
                      <span className="text-xs font-bold text-[#064B40]/80 mr-1">ج.م</span>
                    </div>

                    {!product.is_available ? (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                        غير متوفر حالياً
                      </span>
                    ) : inCart ? (
                      <div className="flex items-center gap-2 bg-[#064B40] text-[#FFF2D6] px-2 py-1 rounded-xl">
                        <button
                          onClick={() => updateQty(product.id, 1)}
                          className="p-1 hover:text-[#D5A642]"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="font-black text-sm min-w-[20px] text-center">
                          {inCart.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(product.id, -1)}
                          className="p-1 hover:text-[#D5A642]"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="flex items-center gap-1.5 bg-[#064B40] text-[#D5A642] font-bold text-sm px-4 py-2 rounded-xl hover:bg-[#085E50] transition"
                      >
                        <Plus className="w-4 h-4" /> أضف للسلة
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* شريط سلة عائم للهاتف */}
      {totalItemsCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-30 max-w-md mx-auto">
          <button
            onClick={() => {
              setOrderSuccess(false);
              setIsCartOpen(true);
            }}
            className="w-full bg-[#064B40] text-[#FFF2D6] border-2 border-[#D5A642] py-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between font-black"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#D5A642]" />
              إتمام الطلب ({totalItemsCount} أصناف)
            </span>
            <span className="text-[#D5A642] text-lg">{totalAmount} ج.م</span>
          </button>
        </div>
      )}

      {/* نافذة سلة المشتريات وإتمام الطلب */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#FFF2D6] w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-t-4 border-[#D5A642]">
            <div className="flex items-center justify-between pb-4 border-b border-[#064B40]/15">
              <h3 className="text-xl font-black text-[#064B40] flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-[#D5A642]" /> سلة طلباتك
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full bg-white text-[#064B40]"
              >

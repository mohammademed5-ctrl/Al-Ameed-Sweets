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
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Package,
  Layers,
  FileText,
  RefreshCw,
  AlertTriangle,
  ShoppingCart,
  DollarSign
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

interface Banner {
  id: string;
  image_url: string;
  title_ar?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function AlAmeedStoreERP() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // حالات لوحة الإدارة و ERP
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [adminTab, setAdminTab] = useState<'store' | 'erp' | 'raw' | 'reports'>('store');

  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);
  const [newBannerTitle, setNewBannerTitle] = useState('');

  const [productFiles, setProductFiles] = useState<{ [key: string]: File }>({});
  const [productPreviews, setProductPreviews] = useState<{ [key: string]: string }>({});

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCat, setNewProductCat] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('كيلو');
  const [newProductFile, setNewProductFile] = useState<File | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // بيانات ERP
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [erpSales, setErpSales] = useState<any[]>([]);

  useEffect(() => {
    fetchStoreData();
    checkSession();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  async function checkSession() {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setAdminUser(data.session.user);
      fetchERPData();
    }
  }

  async function fetchStoreData() {
    setLoading(true);
    const [catRes, prodRes, settingsRes, bannerRes] = await Promise.all([
      supabase.from('categories').select('*').order('name_ar'),
      supabase.from('products').select('*').order('name_ar'),
      supabase.from('store_settings').select('logo_url').eq('id', 1).maybeSingle(),
      supabase.from('store_banners').select('*').order('created_at', { ascending: true }),
    ]);

    if (catRes.data) {
      setCategories(catRes.data);
      if (catRes.data.length > 0 && !newProductCat) {
        setNewProductCat(catRes.data[0].id);
      }
    }
    if (prodRes.data) setProducts(prodRes.data);
    if (settingsRes.data && settingsRes.data.logo_url) {
      setLogoUrl(settingsRes.data.logo_url);
    }
    if (bannerRes.data) {
      setBanners(bannerRes.data);
    }
    setLoading(false);
  }

  async function fetchERPData() {
    try {
      const [rawRes, salesRes] = await Promise.all([
        supabase.from('raw_materials').select('*'),
        supabase.from('sales').select('*').order('created_at', { ascending: false })
      ]);
      if (rawRes.data) setRawMaterials(rawRes.data);
      if (salesRes.data) setErpSales(salesRes.data);
    } catch (e) {
      console.error(e);
    }
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
      alert('تم حفظ وتحديث اللوجو بنجاح!');
    }
    setUploadingId(null);
  }

  async function handleAddBanner(e: React.FormEvent) {
    e.preventDefault();
    if (!newBannerFile) return;
    setUploadingId('banner-add');
    const publicUrl = await uploadImageToStorage(newBannerFile);
    if (publicUrl) {
      await supabase.from('store_banners').insert([
        { image_url: publicUrl, title_ar: newBannerTitle }
      ]);
      setNewBannerFile(null);
      setNewBannerTitle('');
      await fetchStoreData();
      alert('تم إضافة البانر المتحرك بنجاح!');
    }
    setUploadingId(null);
  }

  async function handleDeleteBanner(bannerId: string) {
    if (!confirm('هل أنت متأكد من حذف هذا البانر؟')) return;
    await supabase.from('store_banners').delete().eq('id', bannerId);
    await fetchStoreData();
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
      alert('تم تحديث صورة الصنف بنجاح!');
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
      await supabase.from('sales').insert([
        {
          customer_id: null,
          total_amount: totalAmount,
          paid_amount: totalAmount,
          remaining_amount: 0,
          payment_method: 'نقدي',
          notes: `${customerName} - ${customerPhone} - ${customerAddress} - ${orderNotes}`
        }
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
      fetchERPData();
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
    setUploadingId(null);
    fetchStoreData();
  }

  const filteredProducts =
    selectedCat === 'all' ? products : products.filter((p) => p.category_id === selectedCat);

  return (
    <div className="min-h-screen flex flex-col bg-[#042821] text-[#FFF2D6]">
      {/* الشريط العلوي */}
      <header className="sticky top-0 z-40 bg-[#021B17] text-[#FFF2D6] shadow-xl border-b-2 border-[#D5A642]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="حلواني العميد"
                className="w-12 h-12 rounded-full object-cover border-2 border-[#D5A642] shadow"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#D5A642] text-[#042821] flex items-center justify-center font-black text-xl shadow">
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
            className="relative flex items-center gap-2 bg-[#D5A642] text-[#042821] font-extrabold px-4 py-2 rounded-xl shadow hover:brightness-105 transition"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-sm">السلة</span>
            {totalItemsCount > 0 && (
              <span className="bg-[#042821] text-[#D5A642] text-xs font-black px-2 py-0.5 rounded-full">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* البانر المتحرك (Slider) */}
      <section className="bg-gradient-to-b from-[#021B17] via-[#04362E] to-[#042821] text-[#FFF2D6] py-8 px-4 border-b-4 border-[#D5A642]">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 bg-[#D5A642]/20 border border-[#D5A642] text-[#D5A642] px-4 py-1 rounded-full text-xs font-bold shadow">
            <Sparkles className="w-4 h-4" /> طازج يومياً من مصنعنا إليك مباشرة
          </span>

          {banners.length > 0 ? (
            <div className="relative w-full h-56 sm:h-80 rounded-2xl overflow-hidden border-2 border-[#D5A642] shadow-2xl my-3 group">
              <img
                src={banners[currentBannerIndex].image_url}
                alt="بانر حلواني العميد"
                className="w-full h-full object-cover transition-all duration-700"
              />

              {banners.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentBannerIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/75 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % banners.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/75 transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {banners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentBannerIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition ${
                          currentBannerIndex === idx ? 'bg-[#D5A642] w-6' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-44 rounded-2xl bg-[#021B17] border-2 border-[#D5A642]/40 flex items-center justify-center text-[#D5A642] font-bold text-sm">
              أضف بانرات متحركة من لوحة الإدارة
            </div>
          )}

          <h2 className="text-3xl md:text-5xl font-black text-[#FFF2D6] leading-snug drop-shadow-md">
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
            className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition shadow ${
              selectedCat === 'all'
                ? 'bg-[#D5A642] text-[#042821]'
                : 'bg-[#021B17] text-[#FFF2D6] border border-[#D5A642]/30'
            }`}
          >
            جميع الأصناف
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition shadow ${
                selectedCat === cat.id
                  ? 'bg-[#D5A642] text-[#042821]'
                  : 'bg-[#021B17] text-[#FFF2D6] border border-[#D5A642]/30'
              }`}
            >
              {cat.name_ar}
            </button>
          ))}
        </div>

        {/* قائمة المنتجات */}
        {loading ? (
          <div className="text-center py-16 font-bold text-lg text-[#D5A642]">
            جاري تحميل قائمة حلواني العميد...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id);
              return (
                <div
                  key={product.id}
                  className="bg-[#021B17] rounded-2xl overflow-hidden shadow-lg border border-[#D5A642]/40 flex flex-col justify-between hover:border-[#D5A642] transition"
                >
                  <div>
                    {product.image_url && (
                      <div className="w-full h-48 bg-[#042821] overflow-hidden">
                        <img
                          src={product.image_url}
                          alt={product.name_ar}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="p-5 pb-2">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-black text-[#FFF2D6]">{product.name_ar}</h3>
                        <span className="bg-[#042821] text-[#D5A642] border border-[#D5A642]/50 text-xs font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap">
                          {product.unit}
                        </span>
                      </div>
                      {product.description_ar && (
                        <p className="text-xs text-[#FFF2D6]/75 mb-2">{product.description_ar}</p>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-[#042821] flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black text-[#D5A642]">{product.price}</span>
                      <span className="text-xs font-bold text-[#FFF2D6]/80 mr-1">ج.م</span>
                    </div>

                    {!product.is_available ? (
                      <span className="text-xs font-bold text-red-400 bg-red-950/50 px-3 py-1.5 rounded-lg border border-red-800">
                        غير متوفر حالياً
                      </span>
                    ) : inCart ? (
                      <div className="flex items-center gap-2 bg-[#D5A642] text-[#042821] px-2 py-1 rounded-xl">
                        <button
                          onClick={() => updateQty(product.id, 1)}
                          className="p-1 hover:opacity-75 font-black"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="font-black text-sm min-w-[20px] text-center">
                          {inCart.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(product.id, -1)}
                          className="p-1 hover:opacity-75 font-black"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="flex items-center gap-1.5 bg-[#D5A642] text-[#042821] font-bold text-sm px-4 py-2 rounded-xl hover:brightness-105 transition shadow"
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

      {/* سلة عائمة */}
      {totalItemsCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-30 max-w-md mx-auto">
          <button
            onClick={() => {
              setOrderSuccess(false);
              setIsCartOpen(true);
            }}
            className="w-full bg-[#021B17] text-[#FFF2D6] border-2 border-[#D5A642] py-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between font-black"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#D5A642]" />
              إتمام الطلب ({totalItemsCount} أصناف)
            </span>
            <span className="text-[#D5A642] text-lg">{totalAmount} ج.م</span>
          </button>
        </div>
      )}

      {/* نافذة السلة */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#021B17] text-[#FFF2D6] w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-t-4 border-[#D5A642]">
            <div className="flex items-center justify-between pb-4 border-b border-[#D5A642]/20">
              <h3 className="text-xl font-black text-[#D5A642] flex items-center gap-2">
                <ShoppingBag className="w-6 h-6" /> سلة طلباتك
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full bg-[#042821] text-[#FFF2D6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderSuccess ? (
              <div className="py-10 text-center space-y-4">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <h4 className="text-2xl font-black text-[#FFF2D6]">تم تجهيز طلبك بنجاح!</h4>
                <p className="text-sm text-[#FFF2D6]/80">
                  تم تحويلك إلى واتساب حلواني العميد لتأكيد الطلب وموعد التوصيل.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-[#D5A642] text-[#042821] font-bold px-6 py-2.5 rounded-xl"
                >
                  العودة للمتجر
                </button>
              </div>
            ) : cart.length === 0 ? (
              <div className="py-12 text-center text-[#FFF2D6]/70 font-bold">
                السلة فارغة حالياً، اختر حلوياتك المفضلة من القائمة.
              </div>
            ) : (
              <div className="space-y-5 mt-4">
                <div className="space-y-2.5">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-[#042821] border border-[#D5A642]/20 p-3 rounded-xl flex items-center justify-between shadow-sm"
                    >
                      <div>
                        <p className="font-bold text-sm text-[#FFF2D6]">{item.product.name_ar}</p>
                        <p className="text-xs text-[#FFF2D6]/70">
                          {item.product.price} ج.م × {item.quantity} {item.product.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[#D5A642]">
                          {item.product.price * item.quantity} ج.م
                        </span>
                        <button
                          onClick={() => updateQty(item.product.id, -item.quantity)}
                          className="text-red-400 p-1 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#042821] border border-[#D5A642] text-[#FFF2D6] p-4 rounded-2xl flex items-center justify-between font-black">
                  <span>الإجمالي الكلي:</span>
                  <span className="text-xl text-[#D5A642]">{totalAmount} جنيه مصري</span>
                </div>

                <form onSubmit={handleCheckout} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="الاسم بالكامل *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-[#042821] text-[#FFF2D6] border border-[#D5A642]/30 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-[#D5A642]"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="رقم الموبايل / واتساب *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-[#042821] text-[#FFF2D6] border border-[#D5A642]/30 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-[#D5A642]"
                  />
                  <input
                    type="text"
                    required
                    placeholder="العنوان بالتفصيل للتوصيل *"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full bg-[#042821] text-[#FFF2D6] border border-[#D5A642]/30 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-[#D5A642]"
                  />
                  <input
                    type="text"
                    placeholder="ملاحظات إضافية (اختياري)"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full bg-[#042821] text-[#FFF2D6] border border-[#D5A642]/30 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-[#D5A642]"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#25D366] text-white font-black py-3.5 rounded-xl shadow-lg hover:brightness-95 transition text-base"
                  >
                    {submitting ? 'جاري إرسال الطلب...' : 'تأكيد وإرسال الطلب عبر واتساب'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة لوحة الإدارة و ERP الشاملة */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-[#021B17] text-[#FFF2D6] w-full max-w-4xl rounded-3xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border-t-4 border-[#D5A642]">
            <div className="flex items-center justify-between pb-4 border-b border-[#D5A642]/20">
              <h3 className="text-xl font-black text-[#D5A642] flex items-center gap-2">
                <Store className="w-6 h-6" /> نظام الإدارة الشامل (AL AMEED ERP)
              </h3>
              <button
                onClick={() => setShowAdminModal(false)}
                className="p-1.5 rounded-full bg-[#042821] text-[#FFF2D6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!adminUser ? (
              <form onSubmit={handleAdminLogin} className="space-y-4 mt-8 max-w-sm mx-auto">
                <p className="text-sm text-center text-[#FFF2D6]/80 font-bold">
                  تسجيل دخول الإدارة للوصول لنظام ERP ولوحة التحكم
                </p>
                {authError && (
                  <p className="text-xs text-red-400 bg-red-950 p-2.5 rounded-lg text-center font-bold border border-red-800">
                    {authError}
                  </p>
                )}
                <input
                  type="email"
                  required
                  placeholder="البريد الإلكتروني للإدارة"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#042821] text-[#FFF2D6] border border-[#D5A642]/30 rounded-xl px-4 py-3 text-sm"
                />
                <input
                  type="password"
                  required
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#042821] text-[#FFF2D6] border border-[#D5A642]/30 rounded-xl px-4 py-3 text-sm"
                />
                <button
                  type="submit"
                  className="w-full bg-[#D5A642] text-[#042821] font-black py-3 rounded-xl shadow"
                >
                  دخول لوحة إدارة المصنع
                </button>
              </form>
            ) : (
              <div className="space-y-6 mt-5">
                {/* شريط تبويب الإدارة */}
                <div className="flex items-center justify-between bg-[#042821] p-3 rounded-xl border border-[#D5A642]/30">
                  <div className="flex gap-2 overflow-x-auto">
                    <button
                      onClick={() => setAdminTab('store')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap ${
                        adminTab === 'store' ? 'bg-[#D5A642] text-[#042821]' : 'text-[#FFF2D6]'
                      }`}
                    >
                      إدارة المتجر والمنتجات
                    </button>
                    <button
                      onClick={() => setAdminTab('erp')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap ${
                        adminTab === 'erp' ? 'bg-[#D5A642] text-[#042821]' : 'text-[#FFF2D6]'
                      }`}
                    >
                      مبيعات ERP
                    </button>
                    <button
                      onClick={() => setAdminTab('raw')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap ${
                        adminTab === 'raw' ? 'bg-[#D5A642] text-[#042821]' : 'text-[#FFF2D6]'
                      }`}
                    >
                      السمنة والخامات
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setAdminUser(null);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-red-400 shrink-0 mr-2"
                  >
                    <LogOut className="w-4 h-4" /> خروج
                  </button>
                </div>

                {/* تبويب إدارة المتجر والمنتجات */}
                {adminTab === 'store' && (
                  <div className="space-y-6">
                    {/* تعديل اللوجو */}
                    <div className="bg-[#042821] border border-[#D5A642]/40 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {logoPreview || logoUrl ? (
                            <img
                              src={logoPreview || logoUrl!}
                              alt="اللوجو"
                              className="w-12 h-12 rounded-full object-cover border-2 border-[#D5A642]"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[#D5A642] text-[#042821] flex items-center justify-center font-black text-lg">
                              ع
                            </div>
                          )}
                          <div>
                            <p className="font-black text-sm text-[#FFF2D6]">صورة اللوجو (الشريط العلوي)</p>
                            <p className="text-xs text-[#FFF2D6]/75">تظهر في أعلى الموقع بجانب الاسم</p>
                          </div>
                        </div>
                        <label className="cursor-pointer bg-[#021B17] border border-[#D5A642] text-[#D5A642] font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 hover:bg-[#042821]">
                          <Camera className="w-4 h-4" />
                          <span>{selectedLogoFile ? 'تم اختيار صورة' : 'اختر صورة'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSelectedLogoFile(file);
                                setLogoPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                      </div>
                      {selectedLogoFile && (
                        <button
                          onClick={handleSaveLogo}
                          disabled={uploadingId === 'logo'}
                          className="w-full bg-[#D5A642] text-[#042821] font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow"
                        >
                          {uploadingId === 'logo' && <Loader2 className="w-4 h-4 animate-spin" />}
                          حفظ وتحديث اللوجو
                        </button>
                      )}
                    </div>

                    {/* إدارة السلايدر */}
                    <div className="bg-[#042821] border border-[#D5A642]/40 p-4 rounded-2xl space-y-3">
                      <h4 className="font-black text-sm text-[#D5A642]">🖼️ إدارة البانرات المتحركة (السلايدر)</h4>
                      <form onSubmit={handleAddBanner} className="space-y-2 bg-[#021B17] p-3 rounded-xl border border-[#D5A642]/20">
                        <label className="flex items-center gap-2 cursor-pointer border border-dashed border-[#D5A642]/40 px-3 py-2 rounded-xl text-xs font-bold text-[#FFF2D6] hover:bg-[#042821]">
                          <ImageIcon className="w-4 h-4 text-[#D5A642]" />
                          <span>{newBannerFile ? newBannerFile.name : 'اختر صورة بانر جديدة'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setNewBannerFile(file);
                            }}
                          />
                        </label>
                        {newBannerFile && (
                          <button
                            type="submit"
                            disabled={uploadingId === 'banner-add'}
                            className="w-full bg-[#D5A642] text-[#042821] font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5"
                          >
                            رفع وإضافة للبانرات المتحركة
                          </button>
                        )}
                      </form>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {banners.map((b) => (
                          <div key={b.id} className="flex items-center justify-between bg-[#021B17] p-2 rounded-xl border border-[#D5A642]/20">
                            <img src={b.image_url} alt="بانر" className="w-16 h-10 object-cover rounded-lg" />
                            <button
                              onClick={() => handleDeleteBanner(b.id)}
                              className="bg-red-950 text-red-400 p-2 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* إضافة منتج */}
                    <form onSubmit={handleAddProduct} className="bg-[#042821] border border-[#D5A642]/30 p-4 rounded-2xl space-y-3">
                      <h4 className="font-black text-sm text-[#D5A642]">+ إضافة صنف جديد للقائمة</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          required
                          placeholder="اسم الصنف"
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          className="border border-[#D5A642]/30 rounded-xl px-3 py-2 text-sm bg-[#021B17] text-[#FFF2D6]"
                        />
                        <input
                          type="number"
                          required
                          placeholder="السعر بالجنيه"
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          className="border border-[#D5A642]/30 rounded-xl px-3 py-2 text-sm bg-[#021B17] text-[#FFF2D6]"
                        />
                        <select
                          value={newProductCat}
                          onChange={(e) => setNewProductCat(e.target.value)}
                          className="border border-[#D5A642]/30 rounded-xl px-3 py-2 text-sm bg-[#021B17] text-[#FFF2D6]"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name_ar}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="الوحدة (كيلو / علبة)"
                          value={newProductUnit}
                          onChange={(e) => setNewProductUnit(e.target.value)}
                          className="border border-[#D5A642]/30 rounded-xl px-3 py-2 text-sm bg-[#021B17] text-[#FFF2D6]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-[#D5A642] text-[#042821] font-bold text-xs py-2.5 rounded-xl"
                      >
                        حفظ وإضافة الصنف
                      </button>
                    </form>

                    {/* تعديل الأسعار */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      <h4 className="font-black text-sm text-[#D5A642]">تعديل أسعار وصور المنتجات:</h4>
                      {products.map((p) => (
                        <div key={p.id} className="flex items-center justify-between border border-[#D5A642]/20 p-2.5 rounded-xl bg-[#042821] text-sm">
                          <span className="font-bold">{p.name_ar}</span>
                          <div className="flex items-center gap-2">
                            {editingProductId === p.id ? (
                              <>
                                <input
                                  type="number"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-16 border rounded px-1 text-black"
                                />
                                <button onClick={() => handleSavePrice(p.id)} className="bg-green-600 px-2 py-1 rounded text-xs">حفظ</button>
                              </>
                            ) : (
                              <>
                                <span className="text-[#D5A642] font-bold">{p.price} ج.م</span>
                                <button onClick={() => { setEditingProductId(p.id); setEditPrice(String(p.price)); }} className="text-blue-400 p-1"><Edit3 className="w-4 h-4" /></button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* تبويب مبيعات ERP */}
                {adminTab === 'erp' && (
                  <div className="space-y-4">
                    <h4 className="font-black text-base text-[#D5A642]">سجل مبيعات نظام ERP</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {erpSales.map(s => (
                        <div key={s.id} className="bg-[#042821] p-3 rounded-xl border border-[#D5A642]/20 flex justify-between items-center text-sm">
                          <div>
                            <p className="font-bold">عملية بيع رقم #{s.invoice_number}</p>
                            <p className="text-xs text-[#FFF2D6]/70">{s.notes || 'مبيعات مباشرة'}</p>
                          </div>
                          <span className="text-[#D5A642] font-black">{s.total_amount} ج.م</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* تبويب السمنة والخامات */}
                {adminTab === 'raw' && (
                  <div className="space-y-4">
                    <h4 className="font-black text-base text-[#D5A642]">مخزن الخامات (سمنة بلدي، زيوت، دقيق)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {rawMaterials.map(r => (
                        <div key={r.id} className="bg-[#042821] p-3 rounded-xl border border-[#D5A642]/20">
                          <p className="font-bold">{r.name}</p>
                          <p className="text-xs text-[#D5A642]">الكمية الحالية: {r.quantity} {r.unit}</p>
                        </div>
                      ))}
                      {rawMaterials.length === 0 && (
                        <p className="text-sm text-[#FFF2D6]/70">لا توجد خامات مسجلة في جدول raw_materials حالياً.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* الفوتر */}
      <footer className="bg-[#021B17] text-[#FFF2D6] py-6 px-4 text-center border-t-2 border-[#D5A642] mt-10 space-y-2">
        <p className="font-black text-[#D5A642] text-base">حلواني العميد</p>
        <p className="text-xs text-[#FFF2D6]/80">
          الصبرية - شربين - طريق دمياط السريع | للطلبات والاستفسار: 01016552275
        </p>
        <div className="pt-2">
          <button
            onClick={() => setShowAdminModal(true)}
            className="inline-flex items-center gap-1.5 text-xs text-[#D5A642] hover:underline bg-[#042821] px-3 py-1.5 rounded-lg border border-[#D5A642]/30 transition"
          >
            <Lock className="w-3.5 h-3.5" /> إدارة الموقع ونظام ERP
          </button>
        </div>
      </footer>
    </div>
  );
}

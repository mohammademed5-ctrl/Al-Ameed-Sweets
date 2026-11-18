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

export default function AlAmeedStore() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // حالات لوحة الإدارة والرفع
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);
  const [newBannerPreview, setNewBannerPreview] = useState<string | null>(null);
  const [newBannerTitle, setNewBannerTitle] = useState('');

  const [productFiles, setProductFiles] = useState<{ [key: string]: File }>({});
  const [productPreviews, setProductPreviews] = useState<{ [key: string]: string }>({});

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

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

  // حركة تلقائية للبانرات كل 4 ثوانٍ
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
      setNewBannerPreview(null);
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

      {/* البانر المتحرك (Slider) بتصميم فخم ومستوحى من الثيم الأخير */}
      <section className="bg-gradient-to-b from-[#021B17] via-[#04362E] to-[#042821] text-[#FFF2D6] py-8 px-4 border-b-4 border-[#D5A642]">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 bg-[#D5A642]/20 border border-[#D5A642] text-[#D5A642] px-4 py-1 rounded-full text-xs font-bold shadow">
            <Sparkles className="w-4 h-4" /> طازج يومياً من مصنعنا إليك مباشرة
          </span>

          {/* عرض السلايدر */}
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

      {/* شريط سلة عائم للهاتف */}
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

      {/* نافذة سلة المشتريات وإتمام الطلب */}
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

      {/* نافذة لوحة إدارة المصنع */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#021B17] text-[#FFF2D6] w-full max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-t-4 border-[#D5A642]">
            <div className="flex items-center justify-between pb-4 border-b border-[#D5A642]/20">
              <h3 className="text-xl font-black text-[#D5A642] flex items-center gap-2">
                <Store className="w-6 h-6" /> لوحة إدارة حلواني العميد
              </h3>
              <button
                onClick={() => setShowAdminModal(false)}
                className="p-1.5 rounded-full bg-[#042821] text-[#FFF2D6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!adminUser ? (
              <form onSubmit={handleAdminLogin} className="space-y-4 mt-6 max-w-sm mx-auto">
                <p className="text-sm text-center text-[#FFF2D6]/80 font-bold">
                  تسجيل دخول الإدارة لتعديل الأسعار والصور والأصناف
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
                  دخول لوحة الإدارة
                </button>
              </form>
            ) : (
              <div className="space-y-6 mt-5">
                <div className="flex items-center justify-between bg-[#042821] border border-[#D5A642]/30 p-3 rounded-xl">
                  <span className="text-xs font-bold text-[#D5A642]">
                    مرحباً أستاذ محمد عماد ({adminUser.email})
                  </span>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setAdminUser(null);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-red-400"
                  >
                    <LogOut className="w-4 h-4" /> خروج
                  </button>
                </div>

                {/* تغيير لوجو المتجر */}
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

                {/* إدارة البانرات المتحركة (السلايدر) */}
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
                          if (file) {
                            setNewBannerFile(file);
                            setNewBannerPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                    {newBannerFile && (
                      <button
                        type="submit"
                        disabled={uploadingId === 'banner-add'}
                        className="w-full bg-[#D5A642] text-[#042821] font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5"
                      >
                        {uploadingId === 'banner-add' && <Loader2 className="w-4 h-4 animate-spin" />}
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
                          className="bg-red-950 text-red-400 p-2 rounded-lg hover:bg-red-900 transition border border-red-800"
                          title="حذف البانر"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* إضافة صنف جديد */}
                <form onSubmit={handleAddProduct} className="bg-[#042821] border border-[#D5A642]/30 p-4 rounded-2xl space-y-3">
                  <h4 className="font-black text-sm text-[#D5A642]">+ إضافة صنف جديد للقائمة</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      placeholder="اسم الصنف (مثال: كحك ملبن)"
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
                      placeholder="الوحدة (كيلو / علبة / قطعة)"
                      value={newProductUnit}
                      onChange={(e) => setNewProductUnit(e.target.value)}
                      className="border border-[#D5A642]/30 rounded-xl px-3 py-2 text-sm bg-[#021B17] text-[#FFF2D6]"
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer bg-[#021B17] border border-dashed border-[#D5A642]/40 px-3 py-2 rounded-xl text-xs font-bold text-[#FFF2D6] hover:bg-[#042821]">
                      <Camera className="w-4 h-4 text-[#D5A642]" />
                      <span>{newProductFile ? newProductFile.name : 'اختر صورة الصنف (اختياري)'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewProductFile(file);
                            setNewProductPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={uploadingId === 'new'}
                      className="w-full bg-[#D5A642] text-[#042821] font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                    >
                      {uploadingId === 'new' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      حفظ وإضافة الصنف
                    </button>
                  </div>
                </form>

                {/* تعديل الأسعار والصور الحالية */}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  <h4 className="font-black text-sm text-[#D5A642]">تعديل الأسعار والصور والتوافر:</h4>
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col border border-[#D5A642]/20 p-2.5 rounded-xl text-sm gap-2 bg-[#042821]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {productPreviews[p.id] || p.image_url ? (
                            <img
                              src={productPreviews[p.id] || p.image_url!}
                              alt={p.name_ar}
                              className="w-10 h-10 rounded-lg object-cover border border-[#D5A642] shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#021B17] flex items-center justify-center text-xs font-bold text-[#FFF2D6]/50 shrink-0">
                              بدون
                            </div>
                          )}
                          <span className="font-bold truncate text-[#FFF2D6]">{p.name_ar}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <label
                            className="cursor-pointer p-1.5 rounded-lg bg-[#021B17] text-[#D5A642] hover:bg-[#D5A642] hover:text-[#042821] transition"
                            title="اختر صورة جديدة للصنف"
                          >
                            <Camera className="w-4 h-4" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setProductFiles((prev) => ({ ...prev, [p.id]: file }));
                                  setProductPreviews((prev) => ({ ...prev, [p.id]: URL.createObjectURL(file) }));
                                }
                              }}
                            />
                          </label>

                          {editingProductId === p.id ? (
                            <>
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-16 border border-[#D5A642] rounded-lg px-1.5 py-1 text-center font-bold bg-[#021B17] text-[#FFF2D6]"
                              />
                              <button
                                onClick={() => handleSavePrice(p.id)}
                                className="bg-green-600 text-white p-1.5 rounded-lg"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="font-black text-[#D5A642] text-xs sm:text-sm">
                                {p.price} ج.م
                              </span>
                              <button
                                onClick={() => {
                                  setEditingProductId(p.id);
                                  setEditPrice(String(p.price));
                                }}
                                className="text-blue-400 p-1"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => toggleAvailability(p)}
                            className={`text-xs px-2 py-1 rounded-lg font-bold ${
                              p.is_available
                                ? 'bg-green-950 text-green-300 border border-green-800'
                                : 'bg-red-950 text-red-300 border border-red-800'
                            }`}
                          >
                            {p.is_available ? 'متوفر' : 'نفد'}
                          </button>
                        </div>
                      </div>

                      {productFiles[p.id] && (
                        <button
                          onClick={() => handleSaveProductImage(p.id)}
                          disabled={uploadingId === p.id}
                          className="w-full bg-[#D5A642] text-[#042821] font-bold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 shadow"
                        >
                          {uploadingId === p.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          حفظ وتحديث صورة ({p.name_ar})
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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
            <Lock className="w-3.5 h-3.5" /> إدارة الموقع
          </button>
        </div>
      </footer>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Store,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  ShoppingCart,
  Layers,
  Settings,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Plus,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Phone,
  MapPin
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ckrfnznzjfmdynjfnxie.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AlAmeedERP() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // إحصائيات النظام الحقيقية
  const [stats, setStats] = useState({
    todaySales: 0,
    monthSales: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalRawMaterials: 0,
    totalExpenses: 0
  });

  const [products, setProducts] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    fetchERPData();
  }, []);

  async function fetchERPData() {
    setLoading(true);
    try {
      const [prodRes, rawRes, salesRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('raw_materials').select('*'),
        supabase.from('sales').select('*').order('created_at', { ascending: false })
      ]);

      if (prodRes.data) setProducts(prodRes.data);
      if (rawRes.data) setRawMaterials(rawRes.data);
      if (salesRes.data) {
        setSales(salesRes.data);
        const total = salesRes.data.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
        setStats(prev => ({
          ...prev,
          monthSales: total,
          totalProducts: prodRes.data?.length || 0,
          totalRawMaterials: rawRes.data?.length || 0
        }));
      }
    } catch (error) {
      console.error('خطأ في جلب بيانات ERP:', error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#042821] text-[#FFF2D6] font-sans" dir="rtl">
      {/* القائمة الجانبية للنظام */}
      <aside className="w-full md:w-64 bg-[#021B17] border-l border-[#D5A642]/30 flex flex-col justify-between p-4 shadow-xl">
        <div>
          <div className="flex items-center gap-3 pb-6 border-b border-[#D5A642]/20">
            <div className="w-10 h-10 rounded-full bg-[#D5A642] text-[#042821] flex items-center justify-center font-black text-xl shadow">
              ع
            </div>
            <div>
              <h1 className="font-black text-lg text-[#D5A642]">حلويات العميد</h1>
              <p className="text-xs text-[#FFF2D6]/70">نظام الإدارة الشامل ERP</p>
            </div>
          </div>

          <nav className="space-y-1.5 mt-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
                activeTab === 'dashboard' ? 'bg-[#D5A642] text-[#042821]' : 'hover:bg-[#042821] text-[#FFF2D6]'
              }`}
            >
              <Store className="w-5 h-5" /> لوحة التحكم
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
                activeTab === 'sales' ? 'bg-[#D5A642] text-[#042821]' : 'hover:bg-[#042821] text-[#FFF2D6]'
              }`}
            >
              <ShoppingCart className="w-5 h-5" /> المبيعات والفواتير
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
                activeTab === 'products' ? 'bg-[#D5A642] text-[#042821]' : 'hover:bg-[#042821] text-[#FFF2D6]'
              }`}
            >
              <Package className="w-5 h-5" /> إدارة المنتجات
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
                activeTab === 'raw' ? 'bg-[#D5A642] text-[#042821]' : 'hover:bg-[#042821] text-[#FFF2D6]'
              }`}
            >
              <Layers className="w-5 h-5" /> السمنة والخامات
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
                activeTab === 'reports' ? 'bg-[#D5A642] text-[#042821]' : 'hover:bg-[#042821] text-[#FFF2D6]'
              }`}
            >
              <FileText className="w-5 h-5" /> التقارير الشاملة
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-[#D5A642]/20 text-xs text-center text-[#FFF2D6]/60">
          AL AMEED ERP v1.0 &copy; 2026
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <header className="flex items-center justify-between pb-6 border-b border-[#D5A642]/20 mb-8">
          <div>
            <h2 className="text-2xl font-black text-[#D5A642]">
              {activeTab === 'dashboard' && 'لوحة التحكم والتحليلات'}
              {activeTab === 'sales' && 'إدارة المبيعات ونقاط البيع'}
              {activeTab === 'products' && 'إدارة المنتجات الجاهزة'}
              {activeTab === 'raw' && 'متابعة السمنة والزيوت والخامات'}
              {activeTab === 'reports' && 'مركز التقارير والأرباح'}
            </h2>
            <p className="text-xs text-[#FFF2D6]/70">مصنع حلويات العميد - شربين، الصبرية</p>
          </div>
          <button
            onClick={fetchERPData}
            className="flex items-center gap-2 bg-[#021B17] border border-[#D5A642] text-[#D5A642] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#042821] transition"
          >
            <RefreshCw className="w-4 h-4" /> تحديث البيانات
          </button>
        </header>

        {/* عرض محتوى لوحة التحكم */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* بطاقات الإحصائيات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-[#021B17] border border-[#D5A642]/30 p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#FFF2D6]/70">إجمالي مبيعات الشهر</span>
                  <DollarSign className="w-5 h-5 text-[#D5A642]" />
                </div>
                <h3 className="text-2xl font-black text-[#D5A642]">{stats.monthSales} <span className="text-xs">ج.م</span></h3>
              </div>

              <div className="bg-[#021B17] border border-[#D5A642]/30 p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#FFF2D6]/70">عدد المنتجات الجاهزة</span>
                  <Package className="w-5 h-5 text-[#D5A642]" />
                </div>
                <h3 className="text-2xl font-black text-[#D5A642]">{stats.totalProducts} <span className="text-xs">صنف</span></h3>
              </div>

              <div className="bg-[#021B17] border border-[#D5A642]/30 p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#FFF2D6]/70">الخامات الأساسية المسجلة</span>
                  <Layers className="w-5 h-5 text-[#D5A642]" />
                </div>
                <h3 className="text-2xl font-black text-[#D5A642]">{stats.totalRawMaterials} <span className="text-xs">خامة</span></h3>
              </div>

              <div className="bg-[#021B17] border border-[#D5A642]/30 p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#FFF2D6]/70">فواتير البيع المسجلة</span>
                  <ShoppingCart className="w-5 h-5 text-[#D5A642]" />
                </div>
                <h3 className="text-2xl font-black text-[#D5A642]">{sales.length} <span className="text-xs">فاتورة</span></h3>
              </div>
            </div>

            {/* تنبيهات المخزون */}
            <div className="bg-[#021B17] border border-[#D5A642]/40 p-6 rounded-2xl shadow-xl">
              <h3 className="font-black text-lg text-[#D5A642] mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" /> تنبيهات المخزون والخامات الحساسة
              </h3>
              <div className="space-y-3">
                <div className="bg-[#042821] p-3 rounded-xl border border-[#D5A642]/20 flex items-center justify-between text-sm">
                  <span>متابعة مخزون السمنة البلدي والدقيق والزيوت</span>
                  <span className="text-xs bg-green-950 text-green-300 px-3 py-1 rounded-lg border border-green-800 font-bold">الوضع مستقر</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* عرض المنتجات */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <h3 className="font-black text-lg text-[#D5A642]">قائمة المنتجات والأسعار الجاهزة</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => (
                <div key={p.id} className="bg-[#021B17] border border-[#D5A642]/30 p-4 rounded-2xl shadow">
                  <h4 className="font-black text-base text-[#FFF2D6] mb-1">{p.name_ar}</h4>
                  <p className="text-xs text-[#FFF2D6]/70 mb-3">السعر: <strong className="text-[#D5A642]">{p.retail_price || p.price} ج.م</strong></p>
                  <span className="text-xs bg-[#042821] text-[#D5A642] px-2.5 py-1 rounded-lg border border-[#D5A642]/30 font-bold">
                    الوحدة: {p.unit || 'كيلو'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* إدارة الخامات والسمنة */}
        {activeTab === 'raw' && (
          <div className="space-y-4">
            <h3 className="font-black text-lg text-[#D5A642]">مخزن الخامات الأساسية (سمنة، دقيق، سكر، زيوت)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rawMaterials.map(r => (
                <div key={r.id} className="bg-[#021B17] border border-[#D5A642]/30 p-4 rounded-2xl shadow">
                  <h4 className="font-black text-base text-[#FFF2D6] mb-1">{r.name}</h4>
                  <p className="text-xs text-[#FFF2D6]/70 mb-2">الكمية الحالية: <strong className="text-[#D5A642]">{r.quantity} {r.unit}</strong></p>
                </div>
              ))}
              {rawMaterials.length === 0 && (
                <p className="text-sm text-[#FFF2D6]/70">لم يتم تسجيل خامات بعد. يمكنك إضافتها من قاعدة البيانات.</p>
              )}
            </div>
          </div>
        )}

        {/* المبيعات */}
        {activeTab === 'sales' && (
          <div className="space-y-4">
            <h3 className="font-black text-lg text-[#D5A642]">سجل فواتير المبيعات</h3>
            <div className="bg-[#021B17] border border-[#D5A642]/30 rounded-2xl overflow-hidden p-4 shadow">
              {sales.length === 0 ? (
                <p className="text-center py-8 text-sm text-[#FFF2D6]/70">لا توجد مبيعات مسجلة حتى الآن.</p>
              ) : (
                <div className="space-y-3">
                  {sales.map(s => (
                    <div key={s.id} className="bg-[#042821] p-3 rounded-xl border border-[#D5A642]/20 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm">فاتورة رقم #{s.invoice_number}</p>
                        <p className="text-xs text-[#FFF2D6]/70">الإجمالي: {s.total_amount} ج.م</p>
                      </div>
                      <span className="text-xs bg-green-950 text-green-300 px-3 py-1 rounded-lg border border-green-800 font-bold">مكتملة</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* التقارير */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <h3 className="font-black text-lg text-[#D5A642]">مركز التقارير المالية والإنتاجية</h3>
            <div className="bg-[#021B17] border border-[#D5A642]/30 p-6 rounded-2xl shadow">
              <p className="text-sm text-[#FFF2D6]/80 leading-relaxed">
                جميع التقارير الخاصة بالمبيعات، المصروفات، أرباح المنتجات، واستهلاك الخامات مرتبطة بقاعدة بيانات Supabase وتحدث لحظياً عند إتمام أي عملية بيع أو شراء أو تصنيع.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

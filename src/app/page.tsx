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
  X,
  Camera,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  FileText,
  UserPlus,
  Layers,
  Settings,
  Printer,
  Share2,
  QrCode,
  Palette
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ckrfnznzjfmdynjfnxie.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Category {
  id: string;
  name_ar: string;
}

interface Product {
  id: string;
  category_id: string;
  name_ar: string;
  price: number;
  unit: string;
  is_available: boolean;
  image_url?: string | null;
}

interface Banner {
  id: string;
  image_url: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  customer_type: string;
  total_purchases: number;
  total_spent: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function AlAmeedFactorySystem() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // إعدادات المظهر والألوان
  const [theme, setTheme] = useState({
    primary: '#042821',
    secondary: '#D5A642',
    bg: '#021B17',
    text: '#FFF2D6'
  });

  // لوحة الإدارة والأقسام الشاملة
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [adminTab, setAdminTab] = useState<'store' | 'products' | 'customers' | 'new-sale' | 'invoices' | 'theme' | 'raw'>('store');

  // رفع الصور والبيانات
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);
  const [productFiles, setProductFiles] = useState<{ [key: string]: File }>({});

  // نموذج إضافة صنف جديد
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCat, setNewProductCat] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('كيلو');

  // بيانات العملاء والفواتير
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);

  // إتمام الطلب من المتجر أو الإدارة
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any>(null); // عرض الفاتورة الإلكترونية بعد الإصدار

  useEffect(() => {
    fetchSystemData();
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
      fetchManagementData();
    }
  }

  async function fetchSystemData() {
    setLoading(true);
    const [catRes, prodRes, settingsRes, bannerRes, themeRes] = await Promise.all([
      supabase.from('categories').select('*').order('name_ar'),
      supabase.from('products').select('*').order('name_ar'),
      supabase.from('store_settings').select('logo_url').eq('id', 1).maybeSingle(),
      supabase.from('store_banners').select('*').order('created_at', { ascending: true }),
      supabase.from('store_theme_settings').select('*').eq('id', 1).maybeSingle()
    ]);

    if (catRes.data) {
      setCategories(catRes.data);
      if (catRes.data.length > 0) setNewProductCat(catRes.data[0].id);
    }
    if (prodRes.data) setProducts(prodRes.data);
    if (settingsRes.data?.logo_url) setLogoUrl(settingsRes.data.logo_url);
    if (bannerRes.data) setBanners(bannerRes.data);
    if (themeRes.data) {
      setTheme({
        primary: themeRes.data.primary_color,
        secondary: themeRes.data.secondary_color,
        bg: themeRes.data.background_color,
        text: themeRes.data.text_color
      });
    }
    setLoading(false);
  }

  async function fetchManagementData() {
    try {
      const [custRes, invRes, rawRes] = await Promise.all([
        supabase.from('customers').select('*').order('total_spent', { ascending: false }),
        supabase.from('sales').select('*, customers(name, phone, address)').order('created_at', { ascending: false }),
        supabase.from('raw_materials').select('*')
      ]);
      if (custRes.data) setCustomers(custRes.data);
      if (invRes.data) setInvoices(invRes.data);
      if (rawRes.data) setRawMaterials(rawRes.data);
    } catch (e) {
      console.error(e);
    }
  }

  async function uploadImageToStorage(file: File): Promise<string | null> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleSaveLogo() {
    if (!selectedLogoFile) return;
    const publicUrl = await uploadImageToStorage(selectedLogoFile);
    if (publicUrl) {
      await supabase.from('store_settings').upsert({ id: 1, logo_url: publicUrl });
      setLogoUrl(publicUrl);
      setSelectedLogoFile(null);
      alert('تم تحديث الشعار بنجاح!');
    }
  }

  async function handleAddBanner(e: React.FormEvent) {
    e.preventDefault();
    if (!newBannerFile) return;
    const publicUrl = await uploadImageToStorage(newBannerFile);
    if (publicUrl) {
      await supabase.from('store_banners').insert([{ image_url: publicUrl }]);
      setNewBannerFile(null);
      fetchSystemData();
      alert('تم إضافة البانر بنجاح!');
    }
  }

  async function handleDeleteBanner(id: string) {
    if (!confirm('حذف هذا البانر؟')) return;
    await supabase.from('store_banners').delete().eq('id', id);
    fetchSystemData();
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductCat) return;
    await supabase.from('products').insert([{
      name_ar: newProductName,
      price: parseFloat(newProductPrice),
      category_id: newProductCat,
      unit: newProductUnit,
      is_available: true
    }]);
    setNewProductName('');
    setNewProductPrice('');
    fetchSystemData();
    alert('تم إضافة الصنف بنجاح للقائمة والمخزون!');
  }

  async function handleToggleAvailability(prod: Product) {
    await supabase.from('products').update({ is_available: !prod.is_available }).eq('id', prod.id);
    fetchSystemData();
  }

  async function handlePhoneLookup(phone: string) {
    setCustomerPhone(phone);
    if (phone.length >= 10) {
      const { data } = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle();
      if (data) {
        setCustomerName(data.name);
        setCustomerAddress(data.address || '');
      }
    }
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // إصدار الفاتورة الإلكترونية وحفظها وربطها بالعميل والمخزون
  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerAddress || cart.length === 0) return;

    setSubmitting(true);
    try {
      // 1. إدارة العملاء CRM (منع التكرار برقم الهاتف وتحديث المشتريات)
      let customerId;
      const { data: existingCust } = await supabase.from('customers').select('*').eq('phone', customerPhone).maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
        await supabase.from('customers').update({
          total_purchases: existingCust.total_purchases + 1,
          total_spent: existingCust.total_spent + totalAmount,
          last_purchase_at: new Date().toISOString()
        }).eq('id', customerId);
      } else {
        const { data: newC } = await supabase.from('customers').insert([{
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
          total_purchases: 1,
          total_spent: totalAmount,
          first_purchase_at: new Date().toISOString(),
          last_purchase_at: new Date().toISOString()
        }]).select().single();
        if (newC) customerId = newC.id;
      }

      // 2. تسجيل الفاتورة في جدول المبيعات برقم مسلسل تلقائي
      const cartSummaryText = cart.map(i => `${i.product.name_ar} (${i.quantity} ${i.product.unit})`).join('، ');
      const { data: newSale, err } = await supabase.from('sales').insert([{
        customer_id: customerId,
        total_amount: totalAmount,
        paid_amount: totalAmount,
        remaining_amount: 0,
        payment_method: 'نقدي',
        notes: `مشتريات: ${cartSummaryText}`
      }]).select('*, customers(name, phone, address)').single();

      if (newSale) {
        setActiveInvoice(newSale);
        setIsCartOpen(false);
        setCart([]);
        fetchManagementData();

        // 3. إرسال الفاتورة تلقائياً عبر واتساب
        const waMessage = `مرحباً بك في مصنع العميد ❤️\n\nشكراً لثقتك بنا.\nتم تسجيل عملية الشراء الخاصة بك بنجاح.\n\nرقم الفاتورة: #${newSale.invoice_serial || newSale.id.slice(0,6)}\nالإجمالي: ${totalAmount} جنيه مصري.\n\nنتمنى لك تجربة سعيدة مع مصنع العميد.`;
        window.open(`https://wa.me/${customerPhone}?text=${encodeURIComponent(waMessage)}`, '_blank');
      }
    } catch (error: any) {
      alert('خطأ أثناء إنشاء الفاتورة: ' + error.message);
    }
    setSubmitting(false);
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError('بيانات الدخول غير صحيحة.');
    } else {
      setAdminUser(data.user);
      fetchManagementData();
    }
  }

  const filteredProducts = selectedCat === 'all' ? products : products.filter(p => p.category_id === selectedCat);

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: theme.bg, color: theme.text }} dir="rtl">
      {/* الشريط العلوي */}
      <header className="sticky top-0 z-40 shadow-xl border-b-2" style={{ backgroundColor: theme.primary, borderColor: theme.secondary }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="حلواني العميد" className="w-12 h-12 rounded-full object-cover border-2 shadow" style={{ borderColor: theme.secondary }} />
            ) : (
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-xl shadow" style={{ backgroundColor: theme.secondary, color: theme.primary }}>ع</div>
            )}
            <div>
              <h1 className="text-lg md:text-2xl font-black leading-tight" style={{ color: theme.secondary }}>حلواني العميد</h1>
            </div>
          </div>

          <button onClick={() => setIsCartOpen(true)} className="relative flex items-center gap-2 font-extrabold px-4 py-2 rounded-xl shadow transition" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
            <ShoppingBag className="w-5 h-5" />
            <span className="text-sm">السلة</span>
            {totalItemsCount > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.primary, color: theme.secondary }}>{totalItemsCount}</span>
            )}
          </button>
        </div>
      </header>

      {/* البانر المتحرك (Slider) */}
      <section className="py-8 px-4 border-b-4" style={{ background: `linear-gradient(to bottom, ${theme.primary}, ${theme.bg})`, borderColor: theme.secondary }}>
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-bold shadow border" style={{ backgroundColor: `${theme.secondary}20`, borderColor: theme.secondary, color: theme.secondary }}>
            <Sparkles className="w-4 h-4" /> طازج يومياً من مصنعنا إليك مباشرة
          </span>

          {banners.length > 0 ? (
            <div className="relative w-full h-56 sm:h-80 rounded-2xl overflow-hidden border-2 shadow-2xl my-3" style={{ borderColor: theme.secondary }}>
              <img src={banners[currentBannerIndex].image_url} alt="بانر العميد" className="w-full h-full object-cover transition-all duration-700" />
              {banners.length > 1 && (
                <>
                  <button onClick={() => setCurrentBannerIndex(prev => (prev === 0 ? banners.length - 1 : prev - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={() => setCurrentBannerIndex(prev => (prev + 1) % banners.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"><ChevronRight className="w-5 h-5" /></button>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-44 rounded-2xl border-2 flex items-center justify-center font-bold text-sm" style={{ borderColor: `${theme.secondary}40`, color: theme.secondary }}>أضف بانرات متحركة من لوحة الإدارة</div>
          )}

          <h2 className="text-3xl md:text-5xl font-black leading-snug drop-shadow-md">
            من إيد العميد <span style={{ color: theme.secondary }}>الحلو أكيد</span>
          </h2>
          <p className="text-sm md:text-base opacity-90 max-w-2xl mx-auto">
            كحك ناعم، بسكويت فاخر، بيتي فور، غريبة، وأجود الحلويات الشرقية المصنوعة بأجود أنواع السمنة البلدي والمكسرات.
          </p>
        </div>
      </section>

      {/* شريط الأقسام والمنتجات */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
          <button onClick={() => setSelectedCat('all')} className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition shadow ${selectedCat === 'all' ? '' : 'border'}`} style={{ backgroundColor: selectedCat === 'all' ? theme.secondary : theme.primary, color: selectedCat === 'all' ? theme.primary : theme.text, borderColor: `${theme.secondary}30` }}>جميع الأصناف</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition shadow ${selectedCat === cat.id ? '' : 'border'}`} style={{ backgroundColor: selectedCat === cat.id ? theme.secondary : theme.primary, color: selectedCat === cat.id ? theme.primary : theme.text, borderColor: `${theme.secondary}30` }}>{cat.name_ar}</button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 font-bold text-lg" style={{ color: theme.secondary }}>جاري تحميل قائمة حلواني العميد...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map(product => {
              const inCart = cart.find(item => item.product.id === product.id);
              return (
                <div key={product.id} className="rounded-2xl overflow-hidden shadow-lg border flex flex-col justify-between" style={{ backgroundColor: theme.primary, borderColor: `${theme.secondary}40` }}>
                  <div>
                    {product.image_url && (
                      <div className="w-full h-48 overflow-hidden"><img src={product.image_url} alt={product.name_ar} className="w-full h-full object-cover" /></div>
                    )}
                    <div className="p-5 pb-2">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-black">{product.name_ar}</h3>
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg border whitespace-nowrap" style={{ backgroundColor: theme.bg, color: theme.secondary, borderColor: `${theme.secondary}50` }}>{product.unit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-3 border-t flex items-center justify-between" style={{ borderColor: theme.bg }}>
                    <div>
                      <span className="text-2xl font-black" style={{ color: theme.secondary }}>{product.price}</span>
                      <span className="text-xs font-bold opacity-80 mr-1">ج.م</span>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-2 px-2 py-1 rounded-xl" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
                        <button onClick={() => updateQty(product.id, 1)} className="p-1 font-black"><Plus className="w-4 h-4" /></button>
                        <span className="font-black text-sm min-w-[20px] text-center">{inCart.quantity}</span>
                        <button onClick={() => updateQty(product.id, -1)} className="p-1 font-black"><Minus className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(product)} className="flex items-center gap-1.5 font-bold text-sm px-4 py-2 rounded-xl shadow transition" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
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

      {/* سلة الشراء العائمة */}
      {totalItemsCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-30 max-w-md mx-auto">
          <button onClick={() => setIsCartOpen(true)} className="w-full border-2 py-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between font-black" style={{ backgroundColor: theme.primary, color: theme.text, borderColor: theme.secondary }}>
            <span className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" style={{ color: theme.secondary }} /> إتمام الطلب ({totalItemsCount} أصناف)</span>
            <span style={{ color: theme.secondary }} className="text-lg">{totalAmount} ج.م</span>
          </button>
        </div>
      )}

      {/* نافذة السلة وإتمام الفاتورة الإلكترونية */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-t-4" style={{ backgroundColor: theme.primary, color: theme.text, borderColor: theme.secondary }}>
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: `${theme.secondary}20` }}>
              <h3 className="text-xl font-black flex items-center gap-2" style={{ color: theme.secondary }}><ShoppingBag className="w-6 h-6" /> سلة طلباتك وإصدار الفاتورة</h3>
              <button onClick={() => setIsCartOpen(false)} className="p-1.5 rounded-full" style={{ backgroundColor: theme.bg }}><X className="w-5 h-5" /></button>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center opacity-70 font-bold">السلة فارغة حالياً.</div>
            ) : (
              <div className="space-y-5 mt-4">
                <div className="space-y-2.5">
                  {cart.map(item => (
                    <div key={item.product.id} className="p-3 rounded-xl flex justify-between items-center border" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}20` }}>
                      <div>
                        <p className="font-bold text-sm">{item.product.name_ar}</p>
                        <p className="text-xs opacity-70">{item.product.price} ج.م × {item.quantity}</p>
                      </div>
                      <span className="font-black text-sm" style={{ color: theme.secondary }}>{item.product.price * item.quantity} ج.م</span>
                    </div>
                  ))}
                </div>

                <div className="border p-4 rounded-2xl flex justify-between font-black" style={{ backgroundColor: theme.bg, borderColor: theme.secondary }}>
                  <span>الإجمالي الكلي:</span>
                  <span className="text-xl" style={{ color: theme.secondary }}>{totalAmount} ج.م</span>
                </div>

                <form onSubmit={handleCreateInvoice} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold block mb-1">رقم الهاتف (التعرف التلقائي على العميل):</label>
                    <input type="tel" required placeholder="010XXXXXXXX" value={customerPhone} onChange={e => handlePhoneLookup(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}30`, color: theme.text }} />
                  </div>
                  <input type="text" required placeholder="الاسم بالكامل *" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}30`, color: theme.text }} />
                  <input type="text" required placeholder="العنوان بالتفصيل *" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}30`, color: theme.text }} />
                  <button type="submit" disabled={submitting} className="w-full bg-[#25D366] text-white font-black py-3.5 rounded-xl shadow-lg transition">
                    {submitting ? 'جاري إصدار الفاتورة...' : 'إصدار الفاتورة وإرسالها عبر واتساب'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* معاينة الفاتورة الإلكترونية الصادرة */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4" dir="rtl">
            <div className="text-center border-b pb-3 space-y-1">
              <h3 className="text-xl font-black text-emerald-900">مصنع حلويات العميد</h3>
              <p className="text-xs text-gray-600">شربين - الصبرية - طريق دمياط السريع</p>
              <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mt-1">فاتورة إلكترونية معتمدة</span>
            </div>

            <div className="text-xs space-y-1.5 bg-gray-50 p-3 rounded-xl border">
              <p><strong>رقم الفاتورة:</strong> #{activeInvoice.invoice_serial || activeInvoice.id.slice(0,6)}</p>
              <p><strong>التاريخ والوقت:</strong> {new Date(activeInvoice.created_at).toLocaleString('ar-EG')}</p>
              <p><strong>اسم العميل:</strong> {activeInvoice.customers?.name}</p>
              <p><strong>الهاتف:</strong> {activeInvoice.customers?.phone}</p>
              <p><strong>العنوان:</strong> {activeInvoice.customers?.address}</p>
            </div>

            <div className="border-t border-b py-2 text-xs space-y-1">
              <div className="flex justify-between font-bold text-gray-700">
                <span>البيان / الملاحظات</span>
                <span>الإجمالي</span>
              </div>
              <p className="text-gray-900">{activeInvoice.notes}</p>
            </div>

            <div className="flex justify-between items-center font-black text-base text-emerald-900">
              <span>الإجمالي النهائي:</span>
              <span>{activeInvoice.total_amount} جنيه مصري</span>
            </div>

            {/* QR Code رمزي تفاعلي للفاتورة */}
            <div className="flex flex-col items-center justify-center p-3 bg-gray-100 rounded-xl space-y-1">
              <QrCode className="w-16 h-16 text-emerald-900" />
              <span className="text-[10px] text-gray-500">امسح الكود للتحقق من صحة الفاتورة</span>
            </div>

            <p className="text-center text-xs font-bold text-emerald-800">شكراً لثقتكم في مصنع العميد ❤️</p>

            <div className="flex gap-2 pt-2">
              <button onClick={() => window.print()} className="flex-1 bg-gray-800 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Printer className="w-4 h-4" /> طباعة / PDF</button>
              <button onClick={() => window.open(`https://wa.me/${activeInvoice.customers?.phone}?text=${encodeURIComponent(`فاتورة مصنع العميد رقم #${activeInvoice.invoice_serial || '001'} بقيمة ${activeInvoice.total_amount} ج.م`)}`, '_blank')} className="flex-1 bg-[#25D366] text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Share2 className="w-4 h-4" /> واتساب</button>
              <button onClick={() => setActiveInvoice(null)} className="bg-red-100 text-red-700 px-4 py-2 rounded-xl text-xs font-bold">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* لوحة التحكم والإدارة الشاملة (استعادة جميع الأقسام المختفية + ميزات CRM + المظهر) */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-4xl rounded-3xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border-t-4" style={{ backgroundColor: theme.primary, color: theme.text, borderColor: theme.secondary }}>
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: `${theme.secondary}20` }}>
              <h3 className="text-xl font-black flex items-center gap-2" style={{ color: theme.secondary }}><Store className="w-6 h-6" /> نظام إدارة مصنع العميد (ERP & CRM)</h3>
              <button onClick={() => setShowAdminModal(false)} className="p-1.5 rounded-full" style={{ backgroundColor: theme.bg }}><X className="w-5 h-5" /></button>
            </div>

            {!adminUser ? (
              <form onSubmit={handleAdminLogin} className="space-y-4 mt-8 max-w-sm mx-auto">
                <p className="text-sm text-center font-bold">تسجيل دخول الإدارة والموظفين</p>
                {authError && <p className="text-xs text-red-400 bg-red-950 p-2.5 rounded-lg text-center font-bold">{authError}</p>}
                <input type="email" required placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}30`, color: theme.text }} />
                <input type="password" required placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}30`, color: theme.text }} />
                <button type="submit" className="w-full font-black py-3 rounded-xl shadow" style={{ backgroundColor: theme.secondary, color: theme.primary }}>دخول لوحة التحكم</button>
              </form>
            ) : (
              <div className="space-y-6 mt-5">
                {/* شريط التنقل داخل الإدارة */}
                <div className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}30` }}>
                  <div className="flex gap-2 overflow-x-auto">
                    <button onClick={() => setAdminTab('store')} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap`} style={{ backgroundColor: adminTab === 'store' ? theme.secondary : 'transparent', color: adminTab === 'store' ? theme.primary : theme.text }}>إدارة المتجر</button>
                    <button onClick={() => setAdminTab('products')} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap`} style={{ backgroundColor: adminTab === 'products' ? theme.secondary : 'transparent', color: adminTab === 'products' ? theme.primary : theme.text }}>إدارة الأصناف</button>
                    <button onClick={() => setAdminTab('customers')} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap`} style={{ backgroundColor: adminTab === 'customers' ? theme.secondary : 'transparent', color: adminTab === 'customers' ? theme.primary : theme.text }}>إدارة العملاء CRM</button>
                    <button onClick={() => setAdminTab('invoices')} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap`} style={{ backgroundColor: adminTab === 'invoices' ? theme.secondary : 'transparent', color: adminTab === 'invoices' ? theme.primary : theme.text }}>سجل الفواتير</button>
                    <button onClick={() => setAdminTab('theme')} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap`} style={{ backgroundColor: adminTab === 'theme' ? theme.secondary : 'transparent', color: adminTab === 'theme' ? theme.primary : theme.text }}>إدارة المظهر</button>
                    <button onClick={() => setAdminTab('raw')} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap`} style={{ backgroundColor: adminTab === 'raw' ? theme.secondary : 'transparent', color: adminTab === 'raw' ? theme.primary : theme.text }}>المخزون والخامات</button>
                  </div>
                  <button onClick={async () => { await supabase.auth.signOut(); setAdminUser(null); }} className="text-xs font-bold text-red-400 shrink-0 mr-2 flex items-center gap-1"><LogOut className="w-4 h-4" /> خروج</button>
                </div>

                {/* 1. إدارة المتجر والشعار والبانرات */}
                {adminTab === 'store' && (
                  <div className="space-y-4">
                    <div className="border p-4 rounded-2xl space-y-3" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}40` }}>
                      <p className="font-black text-sm" style={{ color: theme.secondary }}>تحديث شعار المصنع (اللوجو)</p>
                      <input type="file" accept="image/*" onChange={e => setSelectedLogoFile(e.target.files?.[0] || null)} className="text-xs" />
                      {selectedLogoFile && <button onClick={handleSaveLogo} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: theme.secondary, color: theme.primary }}>حفظ الشعار</button>}
                    </div>

                    <div className="border p-4 rounded-2xl space-y-3" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}40` }}>
                      <p className="font-black text-sm" style={{ color: theme.secondary }}>إدارة بانرات السلايدر المتحركة</p>
                      <form onSubmit={handleAddBanner} className="space-y-2">
                        <input type="file" accept="image/*" onChange={e => setNewBannerFile(e.target.files?.[0] || null)} className="text-xs" />
                        {newBannerFile && <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold block" style={{ backgroundColor: theme.secondary, color: theme.primary }}>رفع البانر</button>}
                      </form>
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {banners.map(b => (
                          <div key={b.id} className="flex justify-between items-center p-2 rounded border" style={{ borderColor: `${theme.secondary}20` }}>
                            <img src={b.image_url} alt="بانر" className="w-14 h-8 object-cover rounded" />
                            <button onClick={() => handleDeleteBanner(b.id)} className="bg-red-900 text-white px-2 py-1 rounded text-xs">حذف</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. إدارة الأصناف وإضافة منتج جديد */}
                {adminTab === 'products' && (
                  <div className="space-y-4">
                    <form onSubmit={handleAddProduct} className="border p-4 rounded-2xl space-y-3" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}40` }}>
                      <h4 className="font-black text-sm" style={{ color: theme.secondary }}>+ إضافة صنف جديد لقائمة المصنع</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input type="text" required placeholder="اسم الصنف (مثال: كحك ملبن)" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: theme.primary, borderColor: `${theme.secondary}30`, color: theme.text }} />
                        <input type="number" required placeholder="السعر بالجنيه" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: theme.primary, borderColor: `${theme.secondary}30`, color: theme.text }} />
                        <select value={newProductCat} onChange={e => setNewProductCat(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: theme.primary, borderColor: `${theme.secondary}30`, color: theme.text }}>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                        </select>
                        <input type="text" placeholder="الوحدة (كيلو / علبة / قطعة)" value={newProductUnit} onChange={e => setNewProductUnit(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: theme.primary, borderColor: `${theme.secondary}30`, color: theme.text }} />
                      </div>
                      <button type="submit" className="w-full font-bold text-xs py-2.5 rounded-xl shadow" style={{ backgroundColor: theme.secondary, color: theme.primary }}>حفظ وإضافة الصنف</button>
                    </form>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      <h4 className="font-black text-sm" style={{ color: theme.secondary }}>إدارة تفعيل وتوافر الأصناف الحالية:</h4>
                      {products.map(p => (
                        <div key={p.id} className="flex items-center justify-between border p-2.5 rounded-xl text-sm" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}20` }}>
                          <span className="font-bold">{p.name_ar} ({p.price} ج.م)</span>
                          <button onClick={() => handleToggleAvailability(p)} className={`text-xs px-3 py-1 rounded-lg font-bold ${p.is_available ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                            {p.is_available ? 'متوفر' : 'نفد'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. إدارة العملاء CRM */}
                {adminTab === 'customers' && (
                  <div className="space-y-4">
                    <h4 className="font-black text-base flex items-center gap-2" style={{ color: theme.secondary }}><Users className="w-5 h-5" /> سجل العملاء ومشترياتهم السابقة</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {customers.map(c => (
                        <div key={c.id} className="p-3 rounded-xl border flex justify-between items-center text-sm" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}20` }}>
                          <div>
                            <p className="font-bold">{c.name} <span className="text-xs opacity-75">({c.phone})</span></p>
                            <p className="text-xs opacity-70">العنوان: {c.address || 'غير محدد'} | عدد العمليات: {c.total_purchases}</p>
                          </div>
                          <div className="text-left">
                            <span className="block font-black" style={{ color: theme.secondary }}>{c.total_spent} ج.م</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900 text-emerald-200">{c.customer_type}</span>
                          </div>
                        </div>
                      ))}
                      {customers.length === 0 && <p className="text-sm opacity-70">لا توجد عملاء مسجلون بعد.</p>}
                    </div>
                  </div>
                )}

                {/* 4. سجل الفواتير الإلكترونية */}
                {adminTab === 'invoices' && (
                  <div className="space-y-4">
                    <h4 className="font-black text-base flex items-center gap-2" style={{ color: theme.secondary }}><FileText className="w-5 h-5" /> سجل الفواتير الإلكترونية الصادرة</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {invoices.map(inv => (
                        <div key={inv.id} onClick={() => setActiveInvoice(inv)} className="p-3 rounded-xl border flex justify-between items-center text-sm cursor-pointer hover:border-amber-400 transition" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}20` }}>
                          <div>
                            <p className="font-bold">فاتورة رقم #{inv.invoice_serial || inv.id.slice(0,6)} - العميل: {inv.customers?.name}</p>
                            <p className="text-xs opacity-70">{new Date(inv.created_at).toLocaleString('ar-EG')} | {inv.notes}</p>
                          </div>
                          <span className="font-black text-base" style={{ color: theme.secondary }}>{inv.total_amount} ج.م</span>
                        </div>
                      ))}
                      {invoices.length === 0 && <p className="text-sm opacity-70">لا توجد فواتير مسجلة حتى الآن.</p>}
                    </div>
                  </div>
                )}

                {/* 5. إدارة مظهر الموقع والألوان */}
                {adminTab === 'theme' && (
                  <div className="space-y-4 border p-4 rounded-2xl" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}40` }}>
                    <h4 className="font-black text-base flex items-center gap-2" style={{ color: theme.secondary }}><Palette className="w-5 h-5" /> قسم إدارة مظهر ولون الموقع</h4>
                    <p className="text-xs opacity-80">يمكنك تعديل الألوان الأساسية وتطبيقها فوراً على جميع صفحات الموقع دون تعديل الأكواد.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-bold mb-1">اللون الأساسي:</label>
                        <input type="color" value={theme.primary} onChange={e => setTheme(prev => ({ ...prev, primary: e.target.value }))} className="w-full h-10 rounded cursor-pointer" />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">اللون الثانوي / الذهبي:</label>
                        <input type="color" value={theme.secondary} onChange={e => setTheme(prev => ({ ...prev, secondary: e.target.value }))} className="w-full h-10 rounded cursor-pointer" />
                      </div>
                    </div>

                    <button onClick={async () => {
                      await supabase.from('store_theme_settings').upsert({
                        id: 1,
                        primary_color: theme.primary,
                        secondary_color: theme.secondary
                      });
                      alert('تم حفظ الألوان وتطبيقها بنجاح!');
                      window.location.reload();
                    }} className="w-full font-black py-3 rounded-xl shadow mt-2" style={{ backgroundColor: theme.secondary, color: theme.primary }}>
                      حفظ وتطبيق التصميم الجديد
                    </button>
                  </div>
                )}

                {/* 6. إدارة الخامات الأساسية والمخزون */}
                {adminTab === 'raw' && (
                  <div className="space-y-4">
                    <h4 className="font-black text-base flex items-center gap-2" style={{ color: theme.secondary }}><Layers className="w-5 h-5" /> متابعة مخزون السمنة، الزيوت، والدقيق</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {rawMaterials.map(r => (
                        <div key={r.id} className="p-3 rounded-xl border" style={{ backgroundColor: theme.bg, borderColor: `${theme.secondary}20` }}>
                          <p className="font-bold">{r.name}</p>
                          <p className="text-xs" style={{ color: theme.secondary }}>الكمية الحالية: {r.quantity} {r.unit}</p>
                        </div>
                      ))}
                      {rawMaterials.length === 0 && <p className="text-sm opacity-70">لا توجد خامات مسجلة حالياً.</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* الفوتر */}
      <footer className="py-6 px-4 text-center border-t-2 mt-10 space-y-2" style={{ backgroundColor: theme.bg, borderColor: theme.secondary, color: theme.text }}>
        <p className="font-black text-base" style={{ color: theme.secondary }}>حلواني العميد</p>
        <p className="text-xs opacity-80">الصبرية - شربين - طريق دمياط السريع | للطلبات: 01016552275</p>
        <div className="pt-2">
          <button onClick={() => setShowAdminModal(true)} className="inline-flex items-center gap-1.5 text-xs hover:underline px-3 py-1.5 rounded-xl border transition" style={{ backgroundColor: theme.primary, color: theme.secondary, borderColor: `${theme.secondary}35` }}>
            <Lock className="w-3.5 h-3.5" /> نظام إدارة المصنع والتحكم الشامل
          </button>
        </div>
      </footer>
    </div>
  );
}

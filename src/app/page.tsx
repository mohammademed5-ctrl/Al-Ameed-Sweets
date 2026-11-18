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
  Send,
  Award
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

export default function AlAmeedStoreCRM() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // حالات لوحة الإدارة و CRM
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [adminTab, setAdminTab] = useState<'store' | 'crm' | 'new-sale' | 'customers' | 'erp'>('store');

  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // بيانات CRM والعملاء
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [erpSales, setErpSales] = useState<any[]>([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);

  // نموذج بيع يدوي عبر CRM
  const [crmCustName, setCrmCustName] = useState('');
  const [crmCustPhone, setCrmCustPhone] = useState('');
  const [crmCustAddress, setCrmCustAddress] = useState('');
  const [crmProdId, setCrmProdId] = useState('');
  const [crmQty, setCrmQty] = useState('1');
  const [crmDiscount, setCrmDiscount] = useState('0');

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
      fetchCRMData();
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
      if (catRes.data.length > 0 && prodRes.data && prodRes.data.length > 0 && !crmProdId) {
        setCrmProdId(prodRes.data[0].id);
      }
    }
    if (prodRes.data) setProducts(prodRes.data);
    if (settingsRes.data && settingsRes.data.logo_url) setLogoUrl(settingsRes.data.logo_url);
    if (bannerRes.data) setBanners(bannerRes.data);
    setLoading(false);
  }

  async function fetchCRMData() {
    try {
      const [custRes, salesRes] = await Promise.all([
        supabase.from('customers').select('*').order('total_spent', { ascending: false }),
        supabase.from('sales').select('*').order('created_at', { ascending: false })
      ]);
      if (custRes.data) setCustomers(custRes.data);
      if (salesRes.data) setErpSales(salesRes.data);
    } catch (e) {
      console.error(e);
    }
  }

  // البحث عن العميل برقم الهاتف تلقائياً
  async function handlePhoneLookup(phoneInput: string) {
    setCustomerPhone(phoneInput);
    if (phoneInput.length >= 10) {
      const { data } = await supabase.from('customers').select('*').eq('phone', phoneInput).maybeSingle();
      if (data) {
        setCustomerName(data.name);
        setCustomerAddress(data.address || '');
      }
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
      alert('تم تحديث اللوجو بنجاح!');
    }
  }

  async function handleAddBanner(e: React.FormEvent) {
    e.preventDefault();
    if (!newBannerFile) return;
    const publicUrl = await uploadImageToStorage(newBannerFile);
    if (publicUrl) {
      await supabase.from('store_banners').insert([{ image_url: publicUrl }]);
      setNewBannerFile(null);
      fetchStoreData();
      alert('تم إضافة البانر بنجاح!');
    }
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) => prev.map((item) => item.product.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter((item) => item.quantity > 0));
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // إتمام الطلب من المتجر والربط مع جدول العملاء والفواتير
  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerAddress || cart.length === 0) return;

    setSubmitting(true);
    try {
      // 1. التحقق من وجود العميل أو إنشائه تلقائياً (منع التكرار برقم الهاتف)
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
        const { data: newCust } = await supabase.from('customers').insert([{
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
          total_purchases: 1,
          total_spent: totalAmount,
          first_purchase_at: new Date().toISOString(),
          last_purchase_at: new Date().toISOString()
        }]).select().single();
        if (newCust) customerId = newCust.id;
      }

      // 2. تسجيل الفاتورة في جدول المبيعات
      await supabase.from('sales').insert([{
        customer_id: customerId,
        total_amount: totalAmount,
        paid_amount: totalAmount,
        remaining_amount: 0,
        payment_method: 'نقدي',
        notes: `طلب متجر: ${customerName} (${customerPhone})`
      }]);
    } catch (err) {
      console.error(err);
    }

    const itemsLines = cart.map((item, idx) => `${idx + 1}. ${item.product.name_ar} (${item.quantity} ${item.product.unit}) = ${item.product.price * item.quantity} ج.م`).join('\n');
    const message = `أهلاً وسهلاً بحضرتك ❤️\n\nشكراً لثقتك في حلواني العميد.\n\nتم تسجيل عملية الشراء الخاصة بك:\n\n*العميل:* ${customerName}\n*التفاصيل:*\n${itemsLines}\n\n*الإجمالي المطلوب:* ${totalAmount} جنيه مصري.\n\nحلواني العميد.. من إيد العميد الحلو أكيد ❤️`;

    const whatsappUrl = `https://wa.me/201016552275?text=${encodeURIComponent(message)}`;
    setSubmitting(false);
    setOrderSuccess(true);
    setCart([]);
    window.open(whatsappUrl, '_blank');
  }

  // تسجيل فاتورة بيع يدوية عبر لوحة إدارة CRM
  async function handleCrmManualSale(e: React.FormEvent) {
    e.preventDefault();
    if (!crmCustName || !crmCustPhone || !crmProdId) return;

    const selectedProd = products.find(p => p.id === crmProdId);
    const unitPrice = selectedProd ? selectedProd.price : 0;
    const qty = parseFloat(crmQty) || 1;
    const discountVal = parseFloat(crmDiscount) || 0;
    const total = (unitPrice * qty) - discountVal;

    try {
      let customerId;
      const { data: existing } = await supabase.from('customers').select('*').eq('phone', crmCustPhone).maybeSingle();
      if (existing) {
        customerId = existing.id;
        await supabase.from('customers').update({
          total_purchases: existing.total_purchases + 1,
          total_spent: existing.total_spent + total,
          last_purchase_at: new Date().toISOString()
        }).eq('id', customerId);
      } else {
        const { data: newC } = await supabase.from('customers').insert([{
          name: crmCustName,
          phone: crmCustPhone,
          address: crmCustAddress,
          total_purchases: 1,
          total_spent: total,
          first_purchase_at: new Date().toISOString(),
          last_purchase_at: new Date().toISOString()
        }]).select().single();
        if (newC) customerId = newC.id;
      }

      await supabase.from('sales').insert([{
        customer_id: customerId,
        total_amount: total,
        discount: discountVal,
        paid_amount: total,
        remaining_amount: 0,
        payment_method: 'نقدي',
        notes: `CRM يدوي: ${crmCustName} - الصنف: ${selectedProd?.name_ar} × ${qty}`
      }]);

      alert('تم تسجيل الفاتورة وتحديث بيانات العميل والمخزون بنجاح!');
      setCrmCustName('');
      setCrmCustPhone('');
      setCrmCustAddress('');
      setCrmQty('1');
      setCrmDiscount('0');
      fetchCRMData();
      setAdminTab('crm');
    } catch (err: any) {
      alert('خطأ أثناء الحفظ: ' + err.message);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError('بيانات الدخول غير صحيحة.');
    } else {
      setAdminUser(data.user);
      fetchCRMData();
    }
  }

  const filteredProducts = selectedCat === 'all' ? products : products.filter((p) => p.category_id === selectedCat);

  return (
    <div className="min-h-screen flex flex-col bg-[#042821] text-[#FFF2D6]">
      {/* الشريط العلوي */}
      <header className="sticky top-0 z-40 bg-[#021B17] text-[#FFF2D6] shadow-xl border-b-2 border-[#D5A642]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="حلواني العميد" className="w-12 h-12 rounded-full object-cover border-2 border-[#D5A642] shadow" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#D5A642] text-[#042821] flex items-center justify-center font-black text-xl shadow">ع</div>
            )}
            <div>
              <h1 className="text-lg md:text-2xl font-black text-[#D5A642] leading-tight">حلواني العميد</h1>
            </div>
          </div>

          <button onClick={() => { setOrderSuccess(false); setIsCartOpen(true); }} className="relative flex items-center gap-2 bg-[#D5A642] text-[#042821] font-extrabold px-4 py-2 rounded-xl shadow hover:brightness-105 transition">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-sm">السلة</span>
            {totalItemsCount > 0 && (
              <span className="bg-[#042821] text-[#D5A642] text-xs font-black px-2 py-0.5 rounded-full">{totalItemsCount}</span>
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
              <img src={banners[currentBannerIndex].image_url} alt="بانر حلواني العميد" className="w-full h-full object-cover transition-all duration-700" />
              {banners.length > 1 && (
                <>
                  <button onClick={() => setCurrentBannerIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % banners.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"><ChevronRight className="w-5 h-5" /></button>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-44 rounded-2xl bg-[#021B17] border-2 border-[#D5A642]/40 flex items-center justify-center text-[#D5A642] font-bold text-sm">أضف بانرات متحركة من لوحة الإدارة</div>
          )}

          <h2 className="text-3xl md:text-5xl font-black text-[#FFF2D6] leading-snug drop-shadow-md">
            من إيد العميد <span className="text-[#D5A642]">الحلو أكيد</span>
          </h2>
          <p className="text-sm md:text-base text-[#FFF2D6]/90 max-w-2xl mx-auto">
            كحك ناعم، بسكويت فاخر، بيتي فور، غريبة، وأجود الحلويات الشرقية المصنوعة بأجود أنواع السمنة البلدي والمكسرات.
          </p>
        </div>
      </section>

      {/* شريط الأقسام */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
          <button onClick={() => setSelectedCat('all')} className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition shadow ${selectedCat === 'all' ? 'bg-[#D5A642] text-[#042821]' : 'bg-[#021B17] text-[#FFF2D6] border border-[#D5A642]/30'}`}>جميع الأصناف</button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition shadow ${selectedCat === cat.id ? 'bg-[#D5A642] text-[#042821]' : 'bg-[#021B17] text-[#FFF2D6] border border-[#D5A642]/30'}`}>{cat.name_ar}</button>
          ))}
        </div>

        {/* قائمة المنتجات */}
        {loading ? (
          <div className="text-center py-16 font-bold text-lg text-[#D5A642]">جاري تحميل قائمة حلواني العميد...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id);
              return (
                <div key={product.id} className="bg-[#021B17] rounded-2xl overflow-hidden shadow-lg border border-[#D5A642]/40 flex flex-col justify-between">
                  <div>
                    {product.image_url && (
                      <div className="w-full h-48 bg-[#042821] overflow-hidden"><img src={product.image_url} alt={product.name_ar} className="w-full h-full object-cover" /></div>
                    )}
                    <div className="p-5 pb-2">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-black text-[#FFF2D6]">{product.name_ar}</h3>
                        <span className="bg-[#042821] text-[#D5A642] border border-[#D5A642]/50 text-xs font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap">{product.unit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-3 border-t border-[#042821] flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black text-[#D5A642]">{product.price}</span>
                      <span className="text-xs font-bold text-[#FFF2D6]/80 mr-1">ج.م</span>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-2 bg-[#D5A642] text-[#042821] px-2 py-1 rounded-xl">
                        <button onClick={() => updateQty(product.id, 1)} className="p-1 font-black"><Plus className="w-4 h-4" /></button>
                        <span className="font-black text-sm min-w-[20px] text-center">{inCart.quantity}</span>
                        <button onClick={() => updateQty(product.id, -1)} className="p-1 font-black"><Minus className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(product)} className="flex items-center gap-1.5 bg-[#D5A642] text-[#042821] font-bold text-sm px-4 py-2 rounded-xl shadow">
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
          <button onClick={() => { setOrderSuccess(false); setIsCartOpen(true); }} className="w-full bg-[#021B17] text-[#FFF2D6] border-2 border-[#D5A642] py-3.5 px-5 rounded-2xl shadow-2xl flex items-center justify-between font-black">
            <span className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-[#D5A642]" /> إتمام الطلب ({totalItemsCount} أصناف)</span>
            <span className="text-[#D5A642] text-lg">{totalAmount} ج.م</span>
          </button>
        </div>
      )}

      {/* نافذة السلة مع التعرف التلقائي على العميل برقم الهاتف */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#021B17] text-[#FFF2D6] w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-t-4 border-[#D5A642]">
            <div className="flex items-center justify-between pb-4 border-b border-[#D5A642]/20">
              <h3 className="text-xl font-black text-[#D5A642] flex items-center gap-2"><ShoppingBag className="w-6 h-6" /> سلة طلباتك وإتمام الفاتورة</h3>
              <button onClick={() => setIsCartOpen(false)} className="p-1.5 rounded-full bg-[#042821]"><X className="w-5 h-5" /></button>
            </div>

            {orderSuccess ? (
              <div className="py-10 text-center space-y-4">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <h4 className="text-2xl font-black text-[#FFF2D6]">تم تسجيل الطلب وإرسال الفاتورة!</h4>
                <button onClick={() => setIsCartOpen(false)} className="bg-[#D5A642] text-[#042821] font-bold px-6 py-2.5 rounded-xl">العودة للمتجر</button>
              </div>
            ) : cart.length === 0 ? (
              <div className="py-12 text-center text-[#FFF2D6]/70 font-bold">السلة فارغة حالياً.</div>
            ) : (
              <div className="space-y-5 mt-4">
                <div className="space-y-2.5">
                  {cart.map((item) => (
                    <div key={item.product.id} className="bg-[#042821] p-3 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm">{item.product.name_ar}</p>
                        <p className="text-xs opacity-70">{item.product.price} ج.م × {item.quantity}</p>
                      </div>
                      <span className="font-black text-sm text-[#D5A642]">{item.product.price * item.quantity} ج.م</span>
                    </div>
                  ))}
                </div>

                <div className="bg-[#042821] border border-[#D5A642] p-4 rounded-2xl flex justify-between font-black">
                  <span>الإجمالي الكلي:</span>
                  <span className="text-xl text-[#D5A642]">{totalAmount} ج.م</span>
                </div>

                <form onSubmit={handleCheckout} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold block mb-1">رقم الهاتف (التعرف التلقائي على العميل):</label>
                    <input type="tel" required placeholder="010XXXXXXXX" value={customerPhone} onChange={(e) => handlePhoneLookup(e.target.value)} className="w-full bg-[#042821] border border-[#D5A642]/30 rounded-xl px-4 py-3 text-sm" />
                  </div>
                  <input type="text" required placeholder="الاسم بالكامل *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-[#042821] border border-[#D5A642]/30 rounded-xl px-4 py-3 text-sm" />
                  <input type="text" required placeholder="العنوان بالتفصيل *" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full bg-[#042821] border border-[#D5A642]/30 rounded-xl px-4 py-3 text-sm" />
                  <button type="submit" disabled={submitting} className="w-full bg-[#25D366] text-white font-black py-3.5 rounded-xl shadow-lg">
                    {submitting ? 'جاري الإصدار...' : 'إصدار الفاتورة وإرسالها عبر واتساب'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* لوحة إدارة المصنع ونظام العملاء والفواتير (CRM) */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-[#021B17] text-[#FFF2D6] w-full max-w-4xl rounded-3xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border-t-4 border-[#D5A642]">
            <div className="flex items-center justify-between pb-4 border-b border-[#D5A642]/20">
              <h3 className="text-xl font-black text-[#D5A642] flex items-center gap-2"><Store className="w-6 h-6" /> العملاء والفواتير ونظام الولاء (CRM & ERP)</h3>
              <button onClick={() => setShowAdminModal(false)} className="p-1.5 rounded-full bg-[#042821]"><X className="w-5 h-5" /></button>
            </div>

            {!adminUser ? (
              <form onSubmit={handleAdminLogin} className="space-y-4 mt-8 max-w-sm mx-auto">
                <p className="text-sm text-center font-bold">تسجيل دخول الإدارة</p>
                {authError && <p className="text-xs text-red-400 bg-red-950 p-2.5 rounded-lg text-center font-bold">{authError}</p>}
                <input type="email" required placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#042821] border border-[#D5A642]/30 rounded-xl px-4 py-3 text-sm" />
                <input type="password" required placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#042821] border border-[#D5A642]/30 rounded-xl px-4 py-3 text-sm" />
                <button type="submit" className="w-full bg-[#D5A642] text-[#042821] font-black py-3 rounded-xl shadow">دخول لوحة التحكم</button>
              </form>
            ) : (
              <div className="space-y-6 mt-5">
                {/* شريط التبويبات المحدث */}
                <div className="flex items-center justify-between bg-[#042821] p-3 rounded-xl border border-[#D5A642]/30">
                  <div className="flex gap-2 overflow-x-auto">
                    <button onClick={() => setAdminTab('store')} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap ${adminTab === 'store' ? 'bg-[#D5A642] text-[#042821]' : ''}`}>الإعدادات والمتجر</button>
                    <button onClick={() => setAdminTab('customers')} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap ${adminTab === 'customers' ? 'bg-[#D5A642] text-[#042821]' : ''}`}>إدارة العملاء (CRM)</button>
                    <button onClick={() => setAdminTab('new-sale')} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap ${adminTab === 'new-sale' ? 'bg-[#D5A642] text-[#042821]' : ''}`}>+ تسجيل بيع وفاتورة</button>
                    <button onClick={() => setAdminTab('crm')} className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap ${adminTab === 'crm' ? 'bg-[#D5A642] text-[#042821]' : ''}`}>سجل الفواتير</button>
                  </div>
                  <button onClick={async () => { await supabase.auth.signOut(); setAdminUser(null); }} className="text-xs font-bold text-red-400 shrink-0 mr-2 flex items-center gap-1"><LogOut className="w-4 h-4" /> خروج</button>
                </div>

                {/* تبويب إعدادات المتجر */}
                {adminTab === 'store' && (
                  <div className="space-y-4">
                    <div className="bg-[#042821] border border-[#D5A642]/40 p-4 rounded-2xl space-y-3">
                      <p className="font-black text-sm text-[#D5A642]">إدارة شعار المصنع (اللوجو)</p>
                      <input type="file" accept="image/*" onChange={(e) => setSelectedLogoFile(e.target.files?.[0] || null)} className="text-xs" />
                      {selectedLogoFile && <button onClick={handleSaveLogo} className="bg-[#D5A642] text-[#042821] px-4 py-2 rounded-xl text-xs font-bold">حفظ اللوجو</button>}
                    </div>
                    <div className="bg-[#042821] border border-[#D5A642]/40 p-4 rounded-2xl space-y-3">
                      <p className="font-black text-sm text-[#D5A642]">إدارة بانرات السلايدر</p>
                      <input type="file" accept="image/*" onChange={(e) => setNewBannerFile(e.target.files?.[0] || null)} className="text-xs" />
                      {newBannerFile && <button onClick={handleAddBanner} className="bg-[#D5A642] text-[#042821] px-4 py-2 rounded-xl text-xs font-bold">رفع البانر</button>}
                    </div>
                  </div>
                )}

                {/* تبويب إدارة العملاء (CRM) */}
                {adminTab === 'customers' && (
                  <div className="space-y-4">
                    <h4 className="font-black text-base text-[#D5A642] flex items-center gap-2"><Users className="w-5 h-5" /> قاعدة بيانات العملاء (سجل الشراء والولاء)</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {customers.map(c => (
                        <div key={c.id} className="bg-[#042821] p-3 rounded-xl border border-[#D5A642]/20 flex justify-between items-center text-sm">
                          <div>
                            <p className="font-bold text-[#FFF2D6]">{c.name} <span className="text-xs text-[#D5A642]">({c.phone})</span></p>
                            <p className="text-xs opacity-75">عدد المرات: {c.total_purchases} | إجمالي المشتريات: {c.total_spent} ج.م</p>
                          </div>
                          <span className="bg-[#D5A642] text-[#042821] px-2.5 py-1 rounded-lg text-xs font-black">{c.customer_type || 'عادي'}</span>
                        </div>
                      ))}
                      {customers.length === 0 && <p className="text-sm opacity-70">لا توجد عملاء مسجلون حالياً.</p>}
                    </div>
                  </div>
                )}

                {/* تبويب تسجيل عملية بيع وإصدار فاتورة إلكترونية */}
                {adminTab === 'new-sale' && (
                  <form onSubmit={handleCrmManualSale} className="bg-[#042821] border border-[#D5A642]/40 p-5 rounded-2xl space-y-4">
                    <h4 className="font-black text-base text-[#D5A642] flex items-center gap-2"><UserPlus className="w-5 h-5" /> تسجيل عملية بيع جديدة وإصدار فاتورة</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold block mb-1">رقم الهاتف (التعرف التلقائي):</label>
                        <input type="tel" required placeholder="010XXXXXXXX" value={crmCustPhone} onChange={(e) => { setCrmCustPhone(e.target.value); }} className="w-full bg-[#021B17] border border-[#D5A642]/30 rounded-xl px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">اسم العميل:</label>
                        <input type="text" required placeholder="اسم العميل" value={crmCustName} onChange={(e) => setCrmCustName(e.target.value)} className="w-full bg-[#021B17] border border-[#D5A642]/30 rounded-xl px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">العنوان:</label>
                        <input type="text" placeholder="عنوان العميل" value={crmCustAddress} onChange={(e) => setCrmCustAddress(e.target.value)} className="w-full bg-[#021B17] border border-[#D5A642]/30 rounded-xl px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">اختر المنتج:</label>
                        <select value={crmProdId} onChange={(e) => setCrmProdId(e.target.value)} className="w-full bg-[#021B17] border border-[#D5A642]/30 rounded-xl px-3 py-2 text-sm">
                          {products.map(p => (<option key={p.id} value={p.id}>{p.name_ar} ({p.price} ج.م)</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">الكمية:</label>
                        <input type="number" min="1" required value={crmQty} onChange={(e) => setCrmQty(e.target.value)} className="w-full bg-[#021B17] border border-[#D5A642]/30 rounded-xl px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">خصم (إن وجد):</label>
                        <input type="number" min="0" value={crmDiscount} onChange={(e) => setCrmDiscount(e.target.value)} className="w-full bg-[#021B17] border border-[#D5A642]/30 rounded-xl px-3 py-2 text-sm" />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-[#D5A642] text-[#042821] font-black py-3 rounded-xl shadow">حفظ الفاتورة وتحديث المخزون والعميل</button>
                  </form>
                )}

                {/* تبويب سجل الفواتير والمبيعات */}
                {adminTab === 'crm' && (
                  <div className="space-y-4">
                    <h4 className="font-black text-base text-[#D5A642] flex items-center gap-2"><FileText className="w-5 h-5" /> سجل الفواتير الإلكترونية ومبيعات المصنع</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {erpSales.map(s => (
                        <div key={s.id} className="bg-[#042821] p-3 rounded-xl border border-[#D5A642]/20 flex justify-between items-center text-sm">
                          <div>
                            <p className="font-bold">فاتورة إلكترونية رقم #{s.invoice_number}</p>
                            <p className="text-xs text-[#FFF2D6]/70">{s.notes || 'عملية بيع'}</p>
                          </div>
                          <span className="text-[#D5A642] font-black">{s.total_amount} ج.م</span>
                        </div>
                      ))}
                      {erpSales.length === 0 && <p className="text-sm opacity-70">لا توجد فواتير مسجلة بعد.</p>}
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
        <p className="text-xs text-[#FFF2D6]/80">الصبرية - شربين - طريق دمياط السريع | للطلبات: 01016552275</p>
        <div className="pt-2">
          <button onClick={() => setShowAdminModal(true)} className="inline-flex items-center gap-1.5 text-xs text-[#D5A642] hover:underline bg-[#042821] px-3 py-1.5 rounded-lg border border-[#D5A642]/30 transition">
            <Lock className="w-3.5 h-3.5" /> نظام العملاء والفواتير (CRM)
          </button>
        </div>
      </footer>
    </div>
  );
}

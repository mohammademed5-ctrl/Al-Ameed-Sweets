حلواني العميد use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js'
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
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function AlAmeedStore() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').order('name_ar'),
      supabase.from('products').select('*').order('name_ar'),
    ]);
    if (catRes.data) {
      setCategories(catRes.data);
      if (catRes.data.length > 0 && !newProductCat) {
        setNewProductCat(catRes.data[0].id);
      }
    }
    if (prodRes.data) setProducts(prodRes.data);
    setLoading(false);
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

    const message = `السلام عليكم، طلب جديد من موقع *مصنع حلويات العميد* 👑\n\n*الاسم:* ${customerName}\n*الموبايل:* ${customerPhone}\n*العنوان:* ${customerAddress}\n${
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
    await supabase.from('products').insert([
      {
        name_ar: newProductName,
        price: parseFloat(newProductPrice),
        category_id: newProductCat,
        unit: newProductUnit,
        is_available: true,
      },
    ]);
    setNewProductName('');
    setNewProductPrice('');
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
            <div className="w-11 h-11 rounded-full bg-[#D5A642] text-[#064B40] flex items-center justify-center font-black text-xl shadow">
              ع
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-black text-[#D5A642] leading-tight">
                مصنع حلويات العميد
              </h1>
              <p className="text-xs text-[#FFF2D6]/85">ي</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdminModal(true)}
              className="p-2 rounded-xl bg-[#04362E] text-[#D5A642] hover:bg-[#D5A642] hover:text-[#064B40] transition"
              title="لوحة إدارة المصنع"
            >
              <Lock className="w-5 h-5" />
            </button>

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
        </div>
      </header>

      {/* البانر الرئيسي */}
      <section className="bg-gradient-to-b from-[#064B40] to-[#085E50] text-[#FFF2D6] py-10 px-4 border-b-4 border-[#D5A642]">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 bg-[#D5A642]/20 border border-[#D5A642] text-[#D5A642] px-4 py-1 rounded-full text-xs font-bold">
            <Sparkles className="w-4 h-4" /> طازج يومياً من مصنعنا إليك مباشرة
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-[#FFF2D6] leading-snug">
            طعم الأصالة في كل قطعة من <span className="text-[#D5A642]">حلويات العميد</span>
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
            جاري تحميل قائمة حلويات العميد...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id);
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-[#D5A642]/40 flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-black text-[#064B40]">{product.name_ar}</h3>
                      <span className="bg-[#FFF2D6] text-[#064B40] border border-[#D5A642] text-xs font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap">
                        {product.unit}
                      </span>
                    </div>
                    {product.description_ar && (
                      <p className="text-xs text-[#064B40]/75 mb-4">{product.description_ar}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#FFF2D6] flex items-center justify-between">
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
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderSuccess ? (
              <div className="py-10 text-center space-y-4">
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
                <h4 className="text-2xl font-black text-[#064B40]">تم تجهيز طلبك بنجاح!</h4>
                <p className="text-sm text-[#064B40]/80">
                  تم تحويلك إلى واتساب مصنع حلويات العميد لتأكيد الطلب وموعد التوصيل.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-[#064B40] text-[#D5A642] font-bold px-6 py-2.5 rounded-xl"
                >
                  العودة للمتجر
                </button>
              </div>
            ) : cart.length === 0 ? (
              <div className="py-12 text-center text-[#064B40]/70 font-bold">
                السلة فارغة حالياً، اختر حلوياتك المفضلة من القائمة.
              </div>
            ) : (
              <div className="space-y-5 mt-4">
                <div className="space-y-2.5">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-white p-3 rounded-xl flex items-center justify-between shadow-sm"
                    >
                      <div>
                        <p className="font-bold text-sm text-[#064B40]">{item.product.name_ar}</p>
                        <p className="text-xs text-[#064B40]/70">
                          {item.product.price} ج.م × {item.quantity} {item.product.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[#064B40]">
                          {item.product.price * item.quantity} ج.م
                        </span>
                        <button
                          onClick={() => updateQty(item.product.id, -item.quantity)}
                          className="text-red-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#064B40] text-[#FFF2D6] p-4 rounded-2xl flex items-center justify-between font-black">
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
                    className="w-full bg-white border border-[#064B40]/20 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-[#064B40]"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="رقم الموبايل / واتساب *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-white border border-[#064B40]/20 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-[#064B40]"
                  />
                  <input
                    type="text"
                    required
                    placeholder="العنوان بالتفصيل للتوصيل *"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full bg-white border border-[#064B40]/20 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-[#064B40]"
                  />
                  <input
                    type="text"
                    placeholder="ملاحظات إضافية (اختياري)"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full bg-white border border-[#064B40]/20 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-[#064B40]"
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
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-t-4 border-[#064B40]">
            <div className="flex items-center justify-between pb-4 border-b">
              <h3 className="text-xl font-black text-[#064B40] flex items-center gap-2">
                <Store className="w-6 h-6 text-[#D5A642]" /> لوحة إدارة مصنع حلويات العميد
              </h3>
              <button
                onClick={() => setShowAdminModal(false)}
                className="p-1.5 rounded-full bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!adminUser ? (
              <form onSubmit={handleAdminLogin} className="space-y-4 mt-6 max-w-sm mx-auto">
                <p className="text-sm text-center text-gray-600 font-bold">
                  تسجيل دخول الإدارة لتعديل الأسعار والأصناف
                </p>
                {authError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg text-center font-bold">
                    {authError}
                  </p>
                )}
                <input
                  type="email"
                  required
                  placeholder="البريد الإلكتروني للإدارة"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-sm"
                />
                <input
                  type="password"
                  required
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-sm"
                />
                <button
                  type="submit"
                  className="w-full bg-[#064B40] text-[#D5A642] font-black py-3 rounded-xl"
                >
                  دخول لوحة الإدارة
                </button>
              </form>
            ) : (
              <div className="space-y-6 mt-5">
                <div className="flex items-center justify-between bg-[#FFF2D6] p-3 rounded-xl">
                  <span className="text-xs font-bold text-[#064B40]">
                    مرحباً أستاذ محمد عماد ({adminUser.email})
                  </span>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setAdminUser(null);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-red-600"
                  >
                    <LogOut className="w-4 h-4" /> خروج
                  </button>
                </div>

                {/* إضافة صنف جديد */}
                <form onSubmit={handleAddProduct} className="bg-gray-50 p-4 rounded-2xl space-y-3">
                  <h4 className="font-black text-sm text-[#064B40]">+ إضافة صنف جديد للقائمة</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      placeholder="اسم الصنف (مثال: كحك ملبن)"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="border rounded-xl px-3 py-2 text-sm bg-white"
                    />
                    <input
                      type="number"
                      required
                      placeholder="السعر بالجنيه"
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                      className="border rounded-xl px-3 py-2 text-sm bg-white"
                    />
                    <select
                      value={newProductCat}
                      onChange={(e) => setNewProductCat(e.target.value)}
                      className="border rounded-xl px-3 py-2 text-sm bg-white"
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
                      className="border rounded-xl px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#064B40] text-[#D5A642] font-bold text-xs px-5 py-2.5 rounded-xl"
                  >
                    حفظ وإضافة الصنف
                  </button>
                </form>

                {/* تعديل الأسعار الحالية */}
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  <h4 className="font-black text-sm text-[#064B40]">تعديل الأسعار والتوافر:</h4>
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border p-2.5 rounded-xl text-sm"
                    >
                      <span className="font-bold">{p.name_ar}</span>
                      <div className="flex items-center gap-2">
                        {editingProductId === p.id ? (
                          <>
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-20 border rounded-lg px-2 py-1 text-center font-bold"
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
                            <span className="font-black text-[#064B40]">{p.price} ج.م</span>
                            <button
                              onClick={() => {
                                setEditingProductId(p.id);
                                setEditPrice(String(p.price));
                              }}
                              className="text-blue-600 p-1"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => toggleAvailability(p)}
                          className={`text-xs px-2 py-1 rounded-lg font-bold ${
                            p.is_available
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {p.is_available ? 'متوفر' : 'نفد'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* الفوتر */}
      <footer className="bg-[#064B40] text-[#FFF2D6] py-6 px-4 text-center border-t-2 border-[#D5A642] mt-10">
        <p className="font-black text-[#D5A642] text-base">مصنع حلويات العميد</p>
        <p className="text-xs text-[#FFF2D6]/80 mt-1">
          الصبرية - شربين - طريق دمياط السريع | للطلبات والاستفسار: 01016552275
        </p>
      </footer>
    </div>
  );
}

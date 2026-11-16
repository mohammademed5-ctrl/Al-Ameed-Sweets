import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'حلواني العميد | من إيد العميد الحلو أكيد',
  description: 'كحك ناعم، بسكويت فاخر، بيتي فور، غريبة، وأجود الحلويات الشرقية.',
  openGraph: {
    title: 'حلواني العميد | من إيد العميد الحلو أكيد',
    description: 'كحك ناعم، بسكويت فاخر، وأجود الحلويات الشرقية المصنوعة بأجود أنواع السمنة البلدي.',
    url: 'https://al-ameed-sweets.vercel.app',
    siteName: 'حلواني العميد',
    images: [
      {
        url: 'رابط_صورة_اللوجو_أو_البانر_هنا', // استبدل دي برابط الصورة المباشر من سوبابيس
        width: 1200,
        height: 630,
        alt: 'حلواني العميد',
      },
    ],
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'حلواني العميد',
    description: 'من إيد العميد الحلو أكيد',
    images: ['رابط_صورة_اللوجو_أو_البانر_هنا'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

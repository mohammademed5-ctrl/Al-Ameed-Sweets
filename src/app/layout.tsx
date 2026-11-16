import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'مصنع حلويات العميد | أصل الحلويات الشرقية والنواعم',
  description: 'مصنع حلويات العميد - شربين، طريق دمياط السريع. كحك، بسكويت، بيتي فور، غريبة، وحلويات شرقية بالسمنة البلدي.',
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

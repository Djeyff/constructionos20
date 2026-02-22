import './globals.css';

export const metadata = {
  title: 'Construction OS 2.0',
  description: 'Construction company management dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

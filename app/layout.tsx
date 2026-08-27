import type { Metadata } from 'next';
import './globals.css';
import './ux.css';
import './theme.css';

export const metadata: Metadata = {
  title: 'Leon OS',
  description: 'Personal OS for school, planning, fitness and goals',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

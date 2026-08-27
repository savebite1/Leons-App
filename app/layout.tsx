import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Leon OS',
  description: 'Personal OS for school, planning, fitness and goals',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        {children}
        <a href="/google-calendar" aria-label="Google Kalender" style={{position:'fixed',right:18,bottom:82,zIndex:35,textDecoration:'none',background:'#fff',color:'#202327',border:'1px solid #d7dbe0',borderRadius:12,padding:'9px 12px',fontSize:12,fontWeight:650,boxShadow:'0 8px 24px rgba(20,25,35,.08)'}}>Kalender</a>
      </body>
    </html>
  );
}

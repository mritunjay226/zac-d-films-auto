import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'IIZackStudio — 3D Cutaway AI Studio',
  description:
    'Generate Zack D. Films-style 9:16 3D anatomical cutaway explainer shorts with deterministic @remotion/three primitives, Z-Anatomy sub-meshes, and Web Audio SFX.',
  openGraph: {
    title: 'IIZackStudio — 3D Cutaway AI Studio',
    description:
      'Generate Zack D. Films-style 9:16 3D anatomical cutaway explainer shorts with deterministic @remotion/three primitives, Z-Anatomy sub-meshes, and Web Audio SFX.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IIZackStudio — 3D Cutaway AI Studio',
    description:
      'Generate Zack D. Films-style 9:16 3D anatomical cutaway explainer shorts with deterministic @remotion/three primitives, Z-Anatomy sub-meshes, and Web Audio SFX.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sansFont.variable} ${monoFont.variable}`}>
      <body
        suppressHydrationWarning
        className="bg-white text-zinc-950 font-sans antialiased selection:bg-zinc-950 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}

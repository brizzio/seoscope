import "./globals.css";

export const metadata = {
  title: "Seoscope • Auditoria de Sites",
  description: "Analise performance, SEO, acessibilidade e UX em uma p\u00e1gina s\u00f3.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

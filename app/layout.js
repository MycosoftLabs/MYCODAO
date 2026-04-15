import "./globals.css";
import PulseProviderWrapper from "@/components/PulseProviderWrapper";

export const metadata = {
  title: "MycoDAO",
  description: "MyCoDAO — Community-driven platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-dvh min-h-screen bg-stone-50 text-stone-800">
        <PulseProviderWrapper>
          <main className="relative w-full min-h-dvh min-h-screen min-h-0">{children}</main>
        </PulseProviderWrapper>
      </body>
    </html>
  );
}

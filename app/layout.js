import "./globals.css";
import PulseProviderWrapper from "@/components/PulseProviderWrapper";

export const metadata = {
  title: "MycoDAO",
  description: "MyCoDAO — Community-driven platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-800">
        <PulseProviderWrapper>
          <main className="w-full min-h-screen">{children}</main>
        </PulseProviderWrapper>
      </body>
    </html>
  );
}

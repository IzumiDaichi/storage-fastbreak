import Sidebar from "@/components/Sidebar";
import ToastContainer from "@/components/ToastContainer";
import { AppProvider } from "@/context/AppProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-screen overflow-hidden">
      <body className="light h-screen overflow-hidden antialiased">
        <ThemeProvider>
        <AppProvider>
          <div className="flex h-screen w-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 h-full overflow-y-auto content-area">
              {children}
            </main>
          </div>
          <ToastContainer />
        </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

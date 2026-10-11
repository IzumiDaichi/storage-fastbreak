import Sidebar from "@/components/layout/Sidebar";
import ToastContainer from "@/components/layout/ToastContainer";
import { AppProvider } from "@/context/AppProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light h-screen overflow-hidden" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              const saved = localStorage.getItem("fastbreak-theme-preference");
              const isDark = saved === "dark" || (saved !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
              document.documentElement.classList.toggle("dark", isDark);
              document.documentElement.classList.toggle("light", !isDark);
            })();`,
          }}
        />
      </head>
      <body className="h-screen overflow-hidden antialiased">
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

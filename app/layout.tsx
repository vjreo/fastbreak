import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Fastbreak AI - Sports Event Management",
  description: "Accelerate your game. Manage sports events, leagues, and venues with Fastbreak AI.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <a
            href="#main-content"
            className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:block focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:m-0 focus:p-4 focus:min-h-auto focus:w-auto focus:overflow-visible focus:clip-auto"
          >
            Skip to main content
          </a>
          {children}
          <Toaster
            richColors
            position="top-center"
            theme="dark"
            toastOptions={{
              classNames: {
                success: "border-primary/30",
                error: "border-destructive/30",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

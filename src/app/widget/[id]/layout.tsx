import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Chat Widget",
    description: "Embeddable Chat Widget",
};

export default function WidgetLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // Note: We use a transparent background so the iframe can let the 
        // host site's background show through around the floating widget.
        <html lang="en" suppressHydrationWarning className="bg-transparent">
            <body className="bg-transparent antialiased m-0 p-0 overflow-hidden">
                {children}
            </body>
        </html>
    );
}

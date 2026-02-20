/**
 * ClientExpress Embed Widget Loader
 * Add this script to the body of your HTML page.
 * 
 * Usage:
 * <script>
 *   window.chatbotConfig = {
 *     chatbotId: "your-project-id",
 *     baseUrl: "https://yourdomain.com" // default is current origin
 *   };
 * </script>
 * <script src="https://yourdomain.com/widget.js" defer></script>
 */

(function () {
    if (document.getElementById("clientexpress-widget-iframe")) {
        return; // Already loaded
    }

    const config = window.chatbotConfig || {};
    if (!config.chatbotId) {
        console.error("ClientExpress Widget: Missing window.chatbotConfig.chatbotId");
        return;
    }

    const baseUrl = config.baseUrl || window.location.origin;

    // Create IFrame
    const iframe = document.createElement("iframe");
    iframe.id = "clientexpress-widget-iframe";
    iframe.src = `${baseUrl}/widget/${config.chatbotId}`;

    // Default closed styles
    iframe.style.position = "fixed";
    iframe.style.bottom = "20px";
    iframe.style.right = "20px";
    iframe.style.width = "80px";
    iframe.style.height = "80px";
    iframe.style.border = "none";
    iframe.style.zIndex = "999999";
    iframe.style.transition = "width 0.3s ease, height 0.3s ease";
    // The iframe background is transparent so it doesn't block the host page
    iframe.style.backgroundColor = "transparent";
    iframe.style.colorScheme = "light dark";
    iframe.allow = "clipboard-write";

    document.body.appendChild(iframe);

    // Handle messages from the iframe (e.g. to resize)
    window.addEventListener("message", (event) => {
        // Basic security check - ensure message comes from our iframe origin
        if (event.origin !== baseUrl && event.origin !== window.location.origin) {
            if (!baseUrl.startsWith("http://localhost")) {
                return;
            }
        }

        if (event.data && typeof event.data === "object") {
            if (event.data.type === "widget-open") {
                // Expand iframe to show full chat window
                // Add extra padding to accommodate the shadow and bouncy animations
                iframe.style.width = "400px";
                iframe.style.height = "600px";

                // On mobile, take up most of the screen
                if (window.innerWidth <= 480) {
                    iframe.style.width = "100%";
                    iframe.style.height = "100%";
                    iframe.style.bottom = "0";
                    iframe.style.right = "0";
                }
            } else if (event.data.type === "widget-close") {
                // Shrink iframe back to button size
                iframe.style.width = "80px";
                iframe.style.height = "80px";

                // Reset mobile positioning if changed
                if (window.innerWidth <= 480) {
                    iframe.style.bottom = "20px";
                    iframe.style.right = "20px";
                }
            }
        }
    });

    // Handle resize events to adapt mobile view
    window.addEventListener("resize", () => {
        if (iframe.style.width !== "80px") { // Only if open
            if (window.innerWidth <= 480) {
                iframe.style.width = "100%";
                iframe.style.height = "100%";
                iframe.style.bottom = "0";
                iframe.style.right = "0";
            } else {
                iframe.style.width = "400px";
                iframe.style.height = "600px";
                iframe.style.bottom = "20px";
                iframe.style.right = "20px";
            }
        }
    });

})();

/**
 * Converts a remote image URL to a base64 Data URL.
 * This is useful for capturing elements with images using html-to-image on mobile/Safari,
 * as it bypasses CORS and loading issues during the capture phase.
 */
export async function imageUrlToDataUrl(url: string): Promise<string> {
    if (!url) return "";
    if (url.startsWith("data:")) return url;

    try {
        // Add cache-busting to bypass aggressive Safari caching that can mess with CORS headers
        const cacheBustedUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;

        const response = await fetch(cacheBustedUrl, {
            mode: 'cors',
            credentials: 'omit' // Ensure no cookies are sent, which helps with CORS on some CDNs
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("FileReader failed"));
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error converting image to data URL:", error, url);
        return url; // Fallback to original URL
    }
}

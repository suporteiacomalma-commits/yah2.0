/**
 * Converts a remote image URL to a base64 Data URL.
 * This is useful for capturing elements with images using html-to-image on mobile/Safari,
 * as it bypasses CORS and loading issues during the capture phase.
 */
export async function imageUrlToDataUrl(url: string): Promise<string> {
    if (!url) return "";
    if (url.startsWith("data:")) return url;

    try {
        const response = await fetch(url, { mode: 'cors' });
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error converting image to data URL:", error);
        return url; // Fallback to original URL
    }
}

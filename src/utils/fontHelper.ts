
/**
 * Fetches the Google Fonts CSS and converts all font usage to Base64 embedded CSS.
 * This ensures that html-to-image has access to the raw font data without depending on external requests during capture.
 */
export async function getFontEmbedCSS(fontUrl: string): Promise<string> {
    try {
        // 1. Fetch the CSS stylesheet
        const cssRes = await fetch(fontUrl);
        const cssText = await cssRes.text();

        // 2. Parse all url(...) occurrences
        // Regex to find: url(http...)
        const fontUrlRegex = /url\((https?:\/\/[^)]+)\)/g;
        let newCssText = cssText;
        const matches = [...cssText.matchAll(fontUrlRegex)];

        // 3. For each font URL, fetch the blob, convert to base64, and replace in CSS
        const replacements = await Promise.all(
            matches.map(async (match) => {
                const originalUrl = match[1];
                try {
                    const fontRes = await fetch(originalUrl);
                    const fontBlob = await fontRes.blob();

                    return new Promise<{ original: string, deferred: string }>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64 = reader.result as string;
                            resolve({
                                original: match[0], // url(...)
                                deferred: `url(${base64})`
                            });
                        };
                        reader.readAsDataURL(fontBlob);
                    });
                } catch (e) {
                    console.warn(`Failed to embed font: ${originalUrl}`, e);
                    return null;
                }
            })
        );

        // 4. Apply replacements
        replacements.forEach(rep => {
            if (rep) {
                newCssText = newCssText.replace(rep.original, rep.deferred);
            }
        });

        return newCssText;

    } catch (error) {
        console.error("Error generating font embed CSS:", error);
        return "";
    }
}

export async function preloadFonts(fonts: string[]) {
    await document.fonts.ready;
    const loads = fonts.map(font => document.fonts.load(`1em ${font}`));
    await Promise.all(loads);
}

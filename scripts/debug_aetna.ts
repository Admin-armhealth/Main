
const url = "https://www.aetna.com/health-care-professionals/clinical-policy-bulletins/medical-clinical-policy-bulletins-0200-0299.html";
console.log("Fetching: " + url);

async function debug() {
    try {
        const res = await fetch(url);
        const html = await res.text();
        console.log("--- HTML SNIPPET START ---");
        // Print a chunk that should contain links
        console.log(html.substring(10000, 15000));
        console.log("--- HTML SNIPPET END ---");

        // Test Regex
        const linkRegex = /<a href="([^"]+\/(\d{4})\.html)">(\d{4}):?\s*([^<]+)<\/a>/g;
        const match = linkRegex.exec(html);
        console.log("\nRegex Test match:", match);
    } catch (e) {
        console.error(e);
    }
}
(global as any).fetch = fetch;
debug();

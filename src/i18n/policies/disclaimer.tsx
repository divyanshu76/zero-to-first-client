import { product } from "@/data/product";
import type { PolicyContent } from "./types";

export const disclaimer: PolicyContent = {
  en: {
    title: "Disclaimer",
    description: "ZERO TO FIRST CLIENT is an educational toolkit: no guaranteed income or clients, not legal or tax advice, and AI output must be verified.",
    summary: () => <>{product.name} is an educational and informational product. It teaches a process for starting an AI-assisted service business; it doesn&apos;t promise any particular outcome.</>,
    body: () => (
      <>
        <h2>No guarantee of income, clients or employment</h2>
        <p>The book doesn&apos;t promise clients, income, profit, employment or any timeline. Results depend on your skills, the effort you put in, your market, timing and many factors outside anyone&apos;s control. The people, businesses and numbers in the book&apos;s examples are hypothetical unless a source is given; they illustrate a method and are not benchmarks.</p>
        <h2>Not legal, tax or financial advice</h2>
        <p>Information about GST, income tax, FEMA, business registration, data protection and contracts is general education. Rules change and apply differently to different situations. Before a significant decision, consult a qualified Chartered Accountant, GST practitioner or advocate, and check the official source. Nothing in the book is investment advice: time and money put into a business are at risk.</p>
        <h2>AI output must be verified</h2>
        <p>The prompts are starting points. AI tools can produce incorrect facts, numbers, links or legal statements, sometimes confidently. Verify anything AI produces before relying on it or sending it to a client; you are responsible for what reaches your clients.</p>
        <h2>Third-party tools and platforms change</h2>
        <p>The book mentions third-party tools, platforms and services. Their features, prices, free plans and terms can change without notice, and the prices in the book are a snapshot as of {product.researchCutoff}. Mentions are for identification and education only; they don&apos;t imply partnership, sponsorship or endorsement. Follow each platform&apos;s rules: the book doesn&apos;t recommend scraping, bulk messaging or fake engagement.</p>
        <h2>Trademarks</h2>
        <p>Product names mentioned, such as ChatGPT, Claude, Gemini, Canva, Notion, Google, LinkedIn, Instagram, WhatsApp, Upwork and Fiverr, are trademarks of their respective owners.</p>
      </>
    ),
  },
  hi: {
    title: "अस्वीकरण (Disclaimer)",
    description: "ZERO TO FIRST CLIENT एक educational toolkit है: income या clients की कोई guarantee नहीं, legal या tax सलाह नहीं, और AI output को verify करना ज़रूरी है।",
    summary: () => <>{product.name} एक शैक्षणिक और जानकारी देने वाला product है। यह AI की मदद वाला service business शुरू करने का process सिखाता है; यह किसी ख़ास नतीजे का वादा नहीं करता।</>,
    body: () => (
      <>
        <h2>Income, clients या रोज़गार की कोई guarantee नहीं</h2>
        <p>किताब clients, income, profit, रोज़गार या किसी समय-सीमा का वादा नहीं करती। नतीजे आपकी skills, आपकी मेहनत, आपके market, समय और कई ऐसी बातों पर निर्भर करते हैं जो किसी के control में नहीं हैं। किताब के उदाहरणों के लोग, businesses और numbers काल्पनिक हैं, जब तक कोई source न दिया हो; वे एक तरीका समझाते हैं, benchmarks नहीं हैं।</p>
        <h2>Legal, tax या financial सलाह नहीं</h2>
        <p>GST, income tax, FEMA, business registration, data protection और contracts से जुड़ी जानकारी general education है। नियम बदलते हैं और अलग-अलग स्थितियों पर अलग तरह से लागू होते हैं। कोई बड़ा फ़ैसला लेने से पहले किसी योग्य Chartered Accountant, GST practitioner या advocate से सलाह लें, और official source देखें। किताब में कुछ भी investment सलाह नहीं है: business में लगाया गया समय और पैसा जोखिम में होता है।</p>
        <h2>AI output को verify करना ज़रूरी है</h2>
        <p>Prompts सिर्फ़ शुरुआत हैं। AI tools गलत तथ्य, numbers, links या कानूनी बातें बता सकते हैं, कभी-कभी पूरे भरोसे के साथ। AI जो भी दे, उस पर भरोसा करने या client को भेजने से पहले उसे verify करें; आपके clients तक जो पहुँचता है उसकी ज़िम्मेदारी आपकी है।</p>
        <h2>Third-party tools और platforms बदलते रहते हैं</h2>
        <p>किताब में third-party tools, platforms और services का ज़िक्र है। उनकी features, prices, free plans और शर्तें बिना सूचना के बदल सकती हैं, और किताब में दी गई prices 5 नवंबर 2026 तक की स्थिति हैं। इनका ज़िक्र सिर्फ़ पहचान और शिक्षा के लिए है; इसका मतलब कोई partnership, sponsorship या endorsement नहीं है। हर platform के नियम मानें: किताब scraping, bulk messaging या fake engagement की सलाह नहीं देती।</p>
        <h2>Trademarks</h2>
        <p>ज़िक्र किए गए product names, जैसे ChatGPT, Claude, Gemini, Canva, Notion, Google, LinkedIn, Instagram, WhatsApp, Upwork और Fiverr, अपने-अपने मालिकों के trademarks हैं।</p>
      </>
    ),
  },
};

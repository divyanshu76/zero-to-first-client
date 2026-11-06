import { deliveryLive, product } from "@/data/product";
import type { PolicyContent } from "./types";

export const delivery: PolicyContent = {
  en: {
    title: "Digital Delivery Policy",
    description: "How the ZERO TO FIRST CLIENT ebook and its files are delivered after a verified payment, and what to do if a link doesn't arrive or expires.",
    summary: () => <>{product.name} is delivered digitally, only after your payment has been verified by the payment provider. Nothing is shipped, and the files are never offered through a permanent public download link.</>,
    body: ({ L, SellerIdentity, SupportContact }) => (
      <>
        {!deliveryLive ? (
          <p className="rounded-2xl bg-violet-soft/60 px-5 py-4 text-ink"><strong>Current status:</strong> checkout and delivery are not open yet. No orders are being taken. This page describes how delivery will work at launch.</p>
        ) : null}
        <h2>1. Who delivers</h2>
        <p><SellerIdentity /></p>
        <h2>2. What you receive</h2>
        <ul>
          <li>The 142-page ebook (PDF).</li>
          <li>20 editable templates (14 DOCX, 6 XLSX) and the BUSINESS_CALCULATORS.xlsx workbook with 7 sheets.</li>
          <li>The AI prompt library, the printable template collection and the business resource directory (PDF).</li>
        </ul>
        <h2>3. When and how delivery happens</h2>
        <ul>
          <li>Delivery starts only after the payment provider confirms your payment to our server. A browser &ldquo;payment successful&rdquo; screen alone doesn&apos;t trigger delivery.</li>
          <li>You&apos;ll receive an email, at the address you entered at checkout, with secure links to download the files.</li>
          <li>Links are tied to your order, to prevent unauthorised sharing. The access link in your email works for 30 days; each time you use it, a fresh download link valid for 15 minutes is created, up to 10 downloads a day. Please download and save the files to your device when you receive them.</li>
          <li>Lost or expired link? Enter the email you bought with on the <L to="/purchase/success">purchase page</L> and a fresh link is emailed to you.</li>
        </ul>
        <h2>4. If the email doesn&apos;t arrive</h2>
        <ul>
          <li>Check your spam, promotions and updates folders for the delivery email.</li>
          <li>Make sure the email address you entered at checkout was correct.</li>
          <li>If it still hasn&apos;t arrived, contact support with your payment reference and the email used at checkout.</li>
        </ul>
        <h2>5. If a link has expired or a file won&apos;t open</h2>
        <p>Contact support with your order details. Once the purchase is confirmed, fresh links or replacement files will be issued. Corrupted, incomplete or incorrect files are covered by the <L to="/refund">Refund and Cancellation Policy</L>.</p>
        <h2>6. Support</h2>
        <p>Write to <SupportContact />. The response time will be published on the <L to="/contact">contact page</L>.</p>
        <h2>7. Using the files</h2>
        <p>The files are licensed for your own use. See the <L to="/copyright">Copyright and License</L> page for what is and isn&apos;t allowed.</p>
      </>
    ),
  },
  hi: {
    title: "Digital Delivery Policy",
    description: "Verified payment के बाद ZERO TO FIRST CLIENT ebook और उसकी files कैसे दी जाती हैं, और link न आए या expire हो जाए तो क्या करें।",
    summary: () => <>{product.name} digital रूप से दी जाती है, और सिर्फ़ तब जब payment provider आपके payment को verify कर दे। कुछ भी ship नहीं होता, और files कभी किसी स्थायी public download link से नहीं दी जातीं।</>,
    body: ({ L, SellerIdentity, SupportContact }) => (
      <>
        {!deliveryLive ? (
          <p className="rounded-2xl bg-violet-soft/60 px-5 py-4 text-ink"><strong>मौजूदा स्थिति:</strong> checkout और delivery अभी खुले नहीं हैं। अभी कोई order नहीं लिया जा रहा। यह पेज बताता है कि launch पर delivery कैसे काम करेगी।</p>
        ) : null}
        <h2>1. Delivery कौन करता है</h2>
        <p><SellerIdentity /></p>
        <h2>2. आपको क्या मिलता है</h2>
        <ul>
          <li>142 पेज की ebook (PDF)।</li>
          <li>20 editable templates (14 DOCX, 6 XLSX) और 7 sheets वाली BUSINESS_CALCULATORS.xlsx workbook।</li>
          <li>AI prompt library, printable template collection और business resource directory (PDF)।</li>
        </ul>
        <h2>3. Delivery कब और कैसे होती है</h2>
        <ul>
          <li>Delivery तभी शुरू होती है जब payment provider हमारे server को आपके payment की पुष्टि करता है। Browser में सिर्फ़ &ldquo;payment successful&rdquo; screen दिखने से delivery शुरू नहीं होती।</li>
          <li>Checkout में दिए गए email address पर आपको files download करने के सुरक्षित links वाला email मिलेगा।</li>
          <li>बिना अनुमति share होने से रोकने के लिए links आपके order से जुड़े होते हैं। Email वाला access link 30 दिन तक काम करता है; हर बार इस्तेमाल करने पर 15 मिनट के लिए valid नया download link बनता है, दिन में अधिकतम 10 downloads तक। Files मिलते ही download करके अपने device में save कर लें।</li>
          <li>Link खो गया या expire हो गया? <L to="/purchase/success">Purchase page</L> पर वह email लिखें जिससे ख़रीदा था, और नया link आपको email कर दिया जाएगा।</li>
        </ul>
        <h2>4. अगर email न आए</h2>
        <ul>
          <li>Delivery email के लिए अपने spam, promotions और updates folders देखें।</li>
          <li>पक्का करें कि checkout में भरा email address सही था।</li>
          <li>फिर भी न आए तो अपने payment reference और checkout वाले email के साथ support से संपर्क कीजिए।</li>
        </ul>
        <h2>5. अगर link expire हो गया या file न खुले</h2>
        <p>अपने order की जानकारी के साथ support से संपर्क कीजिए। ख़रीदारी की पुष्टि होने पर नए links या बदली हुई files दी जाएँगी। खराब, अधूरी या गलत files <L to="/refund">Refund और Cancellation Policy</L> के तहत आती हैं।</p>
        <h2>6. Support</h2>
        <p>लिखें: <SupportContact />। Response time <L to="/contact">contact page</L> पर publish किया जाएगा।</p>
        <h2>7. Files का इस्तेमाल</h2>
        <p>Files आपके अपने इस्तेमाल के लिए license दी जाती हैं। क्या अनुमति है और क्या नहीं, यह <L to="/copyright">Copyright और License</L> पेज पर देखें।</p>
      </>
    ),
  },
};

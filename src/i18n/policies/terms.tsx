import { brand, product } from "@/data/product";
import type { PolicyContent } from "./types";

export const terms: PolicyContent = {
  en: {
    title: "Terms and Conditions",
    description: "Terms for using the ZERO TO FIRST CLIENT website and buying the digital ebook: pricing, payment, delivery, license, liability and governing law.",
    summary: () => <>These terms apply when you use this website or buy {product.name}. By placing an order you agree to them, together with the policies linked below.</>,
    body: ({ L, Pending, SellerIdentity, SupportContact }) => (
      <>
        <h2>1. About us</h2>
        <p><SellerIdentity /> Contact: <SupportContact />.</p>
        <h2>2. Using the website</h2>
        <p>You may browse the site for personal, lawful purposes. Don&apos;t attempt to disrupt it, access parts of it you aren&apos;t meant to, or scrape or copy its content and previews for redistribution.</p>
        <h2>3. Product description</h2>
        <p>{product.name} ({product.edition}, {product.editionNumber}) is a digital educational product: a 142-page ebook with companion templates, calculators and PDFs. Explanations are written in Hindi, with English business terms. The contents, previews and file list on the product page describe what you receive. Reasonable care is taken to describe it accurately; if something is materially different, the <L to="/refund">Refund and Cancellation Policy</L> applies.</p>
        <h2>4. Prices and taxes</h2>
        <p>Prices are shown in Indian rupees (INR) on the product page. Any launch offer is shown against the regular price it applies to. Whether the price includes taxes such as GST will be stated at checkout. The price you pay is the one confirmed by the payment provider at checkout, and is set on the server, not by your browser.</p>
        <h2>5. Payment</h2>
        <p>Payments are processed by a third-party payment service provider (Razorpay, once integrated). An order is accepted only when the provider confirms the payment. We may refuse or cancel an order, with a full refund of anything charged, if the payment can&apos;t be verified, it appears fraudulent, or the order was placed in breach of these terms.</p>
        <h2>6. Delivery</h2>
        <p>Files are delivered digitally after verified payment, as described in the <L to="/delivery">Digital Delivery Policy</L>.</p>
        <h2>7. Refunds and cancellation</h2>
        <p>Digital downloads are generally non-refundable once delivered or accessed, with the exceptions and statutory rights set out in the <L to="/refund">Refund and Cancellation Policy</L>.</p>
        <h2>8. License and intellectual property</h2>
        <p>The ebook and materials are protected by copyright and are licensed, not sold, to you for your own use. You may not copy, resell, share, upload or redistribute them. Full terms are on the <L to="/copyright">Copyright and License</L> page.</p>
        <h2>9. Misuse of orders</h2>
        <p>Sharing download links, reselling access, chargeback abuse or using someone else&apos;s payment method without permission may lead to access being withdrawn and, where appropriate, further action.</p>
        <h2>10. Educational content and no guarantee</h2>
        <p>The product teaches a process. It doesn&apos;t guarantee clients, income, profit or any timeline, and it isn&apos;t legal, tax or investment advice. See the <L to="/disclaimer">Disclaimer</L>.</p>
        <h2>11. Limitation of liability</h2>
        <p>To the extent permitted by applicable law, {brand.seller} and {brand.publisher} are not liable for indirect or consequential losses, such as lost profits or business opportunities, arising from use of the product. Total liability for any claim relating to an order is limited to the amount paid for that order. Nothing in these terms limits liability that can&apos;t legally be limited, or your rights as a consumer under applicable law.</p>
        <h2>12. Governing law and disputes</h2>
        <p>These terms are governed by the laws of India. Please contact support first so a problem can be resolved quickly. Subject to your rights to approach a consumer forum under the Consumer Protection Act, 2019, disputes are subject to the courts at {brand.jurisdiction ?? <Pending>the city of jurisdiction</Pending>}.</p>
        <h2>13. Changes</h2>
        <p>These terms may be updated from time to time. The version in force when you place an order applies to that order.</p>
      </>
    ),
  },
  hi: {
    title: "नियम और शर्तें",
    description: "ZERO TO FIRST CLIENT website इस्तेमाल करने और digital ebook ख़रीदने की शर्तें: pricing, payment, delivery, license, ज़िम्मेदारी और लागू कानून।",
    summary: () => <>ये शर्तें तब लागू होती हैं जब आप यह website इस्तेमाल करते हैं या {product.name} ख़रीदते हैं। Order देकर आप इन शर्तों और नीचे दी गई policies से सहमत होते हैं।</>,
    body: ({ L, Pending, SellerIdentity, SupportContact }) => (
      <>
        <h2>1. हमारे बारे में</h2>
        <p><SellerIdentity /> संपर्क: <SupportContact />।</p>
        <h2>2. Website का इस्तेमाल</h2>
        <p>आप site को निजी और कानूनी उद्देश्यों के लिए देख सकते हैं। इसे बाधित करने, उन हिस्सों तक पहुँचने जो आपके लिए नहीं हैं, या इसके content और previews को आगे बाँटने के लिए scrape या copy करने की कोशिश न करें।</p>
        <h2>3. Product का विवरण</h2>
        <p>{product.name} ({product.edition}, {product.editionNumber}) एक digital educational product है: साथ में templates, calculators और PDFs वाली 142 पेज की ebook। Explanations Hindi में हैं, business terms English में। Product page पर दी गई विषय-सूची, previews और files की list बताती है कि आपको क्या मिलेगा। इसका विवरण सही रखने की पूरी कोशिश की जाती है; अगर कुछ काफ़ी अलग हो, तो <L to="/refund">Refund और Cancellation Policy</L> लागू होती है।</p>
        <h2>4. Prices और taxes</h2>
        <p>Product page पर prices भारतीय रुपये (INR) में दिखाई जाती हैं। कोई भी launch offer उस regular price के साथ दिखाया जाता है जिस पर वह लागू है। Price में GST जैसे taxes शामिल हैं या नहीं, यह checkout पर बताया जाएगा। आप जो price चुकाते हैं वह checkout पर payment provider द्वारा पुष्टि की गई price है, जो server पर तय होती है, आपके browser में नहीं।</p>
        <h2>5. Payment</h2>
        <p>Payments एक third-party payment service provider (integration के बाद Razorpay) से होते हैं। Order तभी स्वीकार होता है जब provider payment की पुष्टि कर दे। अगर payment verify नहीं हो सकता, धोखाधड़ी जैसा लगता है, या order इन शर्तों का उल्लंघन करके दिया गया है, तो हम order मना या cancel कर सकते हैं, और जो भी charge हुआ उसका पूरा refund होगा।</p>
        <h2>6. Delivery</h2>
        <p>Verified payment के बाद files digital रूप से दी जाती हैं, जैसा <L to="/delivery">Digital Delivery Policy</L> में बताया गया है।</p>
        <h2>7. Refunds और cancellation</h2>
        <p>Digital downloads deliver या access होने के बाद आम तौर पर non-refundable होते हैं, उन अपवादों और कानूनी अधिकारों के साथ जो <L to="/refund">Refund और Cancellation Policy</L> में दिए गए हैं।</p>
        <h2>8. License और बौद्धिक संपदा</h2>
        <p>Ebook और सामग्री copyright से सुरक्षित हैं और आपको अपने इस्तेमाल के लिए license दी जाती है, बेची नहीं जाती। आप इन्हें copy, दोबारा बेच, share, upload या आगे बाँट नहीं सकते। पूरी शर्तें <L to="/copyright">Copyright और License</L> पेज पर हैं।</p>
        <h2>9. Orders का ग़लत इस्तेमाल</h2>
        <p>Download links share करना, access दोबारा बेचना, chargeback का दुरुपयोग, या बिना अनुमति किसी और का payment method इस्तेमाल करने पर access वापस लिया जा सकता है और ज़रूरत हो तो आगे कार्रवाई भी हो सकती है।</p>
        <h2>10. Educational content, कोई guarantee नहीं</h2>
        <p>यह product एक process सिखाता है। यह clients, income, profit या किसी समय-सीमा की guarantee नहीं देता, और यह legal, tax या investment सलाह नहीं है। <L to="/disclaimer">Disclaimer</L> देखें।</p>
        <h2>11. ज़िम्मेदारी की सीमा</h2>
        <p>लागू कानून जितनी अनुमति देता है, उस हद तक {brand.seller} और {brand.publisher} product के इस्तेमाल से होने वाले अप्रत्यक्ष या परिणामी नुकसान, जैसे खोया हुआ profit या business के मौके, के लिए ज़िम्मेदार नहीं हैं। किसी order से जुड़े किसी भी दावे की कुल ज़िम्मेदारी उस order के लिए चुकाई गई रकम तक सीमित है। इन शर्तों की कोई बात उस ज़िम्मेदारी को सीमित नहीं करती जिसे कानूनन सीमित नहीं किया जा सकता, न ही लागू कानून के तहत consumer के रूप में आपके अधिकारों को।</p>
        <h2>12. लागू कानून और विवाद</h2>
        <p>ये शर्तें भारत के कानूनों के अधीन हैं। कृपया पहले support से संपर्क करें ताकि समस्या जल्दी सुलझ सके। Consumer Protection Act, 2019 के तहत consumer forum जाने के आपके अधिकारों के अधीन, विवाद {brand.jurisdiction ?? <Pending>क्षेत्राधिकार वाला शहर</Pending>} की अदालतों के अधीन होंगे।</p>
        <h2>13. बदलाव</h2>
        <p>ये शर्तें समय-समय पर अपडेट की जा सकती हैं। Order देते समय लागू संस्करण उस order पर लागू होता है।</p>
      </>
    ),
  },
};

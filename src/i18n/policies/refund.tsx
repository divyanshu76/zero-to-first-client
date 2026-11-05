import { product } from "@/data/product";
import type { PolicyContent } from "./types";

export const refund: PolicyContent = {
  en: {
    title: "Refund and Cancellation Policy",
    description: "When refunds and cancellations apply to the ZERO TO FIRST CLIENT digital ebook, and how to report delivery, file or payment problems.",
    summary: () => <>{product.name} is a digital product. Purchases are generally non-refundable and non-cancellable once the files have been successfully delivered or accessed. Delivery failures, faulty files, duplicate charges and unauthorised payments are handled differently, as set out below.</>,
    body: ({ L, SellerIdentity, SupportContact }) => (
      <>
        <h2>1. Who this applies to</h2>
        <p><SellerIdentity /> This policy covers purchases of the {product.name} ebook and its companion files made through this website.</p>
        <h2>2. Please review before you buy</h2>
        <p>Because a digital download can&apos;t be returned once delivered, please check the product details first: the table of contents, the page previews, the list of included files, the language (Hindi explanations with English business terms) and the FAQ. If something is unclear, contact support before purchasing.</p>
        <h2>3. The general position</h2>
        <p>Once your files have been <strong>successfully delivered or accessed</strong>, the purchase is generally non-refundable and can&apos;t be cancelled. Change of mind, not having time to read it, or not getting the results you hoped for are not, on their own, grounds for a refund. The ebook is an educational toolkit and doesn&apos;t promise clients or income.</p>
        <h2>4. When we will put things right</h2>
        <p>The general position never applies where the product wasn&apos;t properly supplied. Contact support if:</p>
        <ul>
          <li><strong>You paid but didn&apos;t receive the files</strong>, or the download link didn&apos;t work.</li>
          <li><strong>A file is corrupted, won&apos;t open, or is incomplete.</strong></li>
          <li><strong>You received the wrong files</strong>, or the product is materially different from its description.</li>
          <li><strong>You were charged more than once</strong> for the same order.</li>
          <li><strong>You don&apos;t recognise a payment</strong> (an unauthorised transaction).</li>
        </ul>
        <p>We&apos;ll first try to fix the problem: by re-sending or replacing the files, or by correcting the order. If it can&apos;t be fixed, or a charge was duplicated or unauthorised, the affected amount will be refunded to the original payment method. Each report is reviewed on its own facts; a refund isn&apos;t automatic for every complaint.</p>
        <h2>5. Unauthorised transactions</h2>
        <p>If you don&apos;t recognise a payment, contact your bank or card issuer straight away as well as us. Your bank&apos;s dispute and chargeback rights are unaffected by this policy.</p>
        <h2>6. How to report a problem</h2>
        <p>Contact support at <SupportContact />. Include:</p>
        <ul>
          <li>the email address used at checkout;</li>
          <li>the payment or order reference;</li>
          <li>what went wrong, with a screenshot if relevant.</li>
        </ul>
        <p>Please report delivery or file problems as soon as you notice them. The support response time will be published on the <L to="/contact">contact page</L>.</p>
        <h2>7. How refunds are paid</h2>
        <p>Approved refunds are returned to the original payment method through the payment provider. How long the money takes to appear depends on your bank and payment method.</p>
        <h2>8. Your rights under the law</h2>
        <p>Nothing in this policy excludes or limits any remedy you have under applicable law, including the Consumer Protection Act, 2019 and the rules made under it. Where the law gives you a right to a refund, repair or replacement, that right applies.</p>
      </>
    ),
  },
  hi: {
    title: "Refund और Cancellation Policy",
    description: "ZERO TO FIRST CLIENT digital ebook पर refund और cancellation कब लागू होते हैं, और delivery, file या payment की समस्या कैसे बताएँ।",
    summary: () => <>{product.name} एक digital product है। Files सफलतापूर्वक deliver या access हो जाने के बाद ख़रीदारी आम तौर पर non-refundable और non-cancellable होती है। Delivery न होना, खराब files, दो बार charge होना और बिना अनुमति वाले payments को अलग तरह से संभाला जाता है, जैसा नीचे बताया गया है।</>,
    body: ({ L, SellerIdentity, SupportContact }) => (
      <>
        <h2>1. यह किस पर लागू होती है</h2>
        <p><SellerIdentity /> यह policy इस website से ख़रीदी गई {product.name} ebook और उसकी साथ वाली files पर लागू होती है।</p>
        <h2>2. ख़रीदने से पहले ज़रूर देखें</h2>
        <p>Digital download deliver होने के बाद लौटाया नहीं जा सकता, इसलिए पहले product की जानकारी देख लें: विषय-सूची, पेजों की झलक, शामिल files की list, भाषा (Hindi explanations, English business terms) और सवाल-जवाब। कुछ साफ़ न हो तो ख़रीदने से पहले support से संपर्क कीजिए।</p>
        <h2>3. सामान्य नियम</h2>
        <p>आपकी files <strong>सफलतापूर्वक deliver या access</strong> हो जाने के बाद ख़रीदारी आम तौर पर non-refundable होती है और cancel नहीं की जा सकती। मन बदल जाना, पढ़ने का समय न मिलना, या मनचाहे नतीजे न मिलना, अपने-आप में refund का आधार नहीं है। यह ebook एक educational toolkit है और clients या income का वादा नहीं करती।</p>
        <h2>4. जब हम चीज़ें ठीक करेंगे</h2>
        <p>जहाँ product सही तरह से दिया ही नहीं गया, वहाँ सामान्य नियम लागू नहीं होता। Support से संपर्क कीजिए अगर:</p>
        <ul>
          <li><strong>आपने payment किया पर files नहीं मिलीं</strong>, या download link काम नहीं किया।</li>
          <li><strong>कोई file खराब है, खुल नहीं रही, या अधूरी है।</strong></li>
          <li><strong>आपको गलत files मिलीं</strong>, या product अपने विवरण से काफ़ी अलग है।</li>
          <li><strong>एक ही order के लिए आपसे एक से ज़्यादा बार charge हुआ।</strong></li>
          <li><strong>आप किसी payment को नहीं पहचानते</strong> (बिना अनुमति का transaction)।</li>
        </ul>
        <p>हम पहले समस्या ठीक करने की कोशिश करेंगे: files दोबारा भेजकर या बदलकर, या order सुधारकर। अगर समस्या ठीक नहीं हो सकती, या charge दोहराया गया या बिना अनुमति था, तो प्रभावित रकम मूल payment method में refund की जाएगी। हर शिकायत को उसके तथ्यों के आधार पर देखा जाता है; हर शिकायत पर refund अपने-आप नहीं होता।</p>
        <h2>5. बिना अनुमति वाले transactions</h2>
        <p>अगर आप किसी payment को नहीं पहचानते, तो हमसे संपर्क करने के साथ-साथ तुरंत अपने bank या card issuer से भी बात कीजिए। आपके bank के dispute और chargeback अधिकारों पर इस policy का कोई असर नहीं पड़ता।</p>
        <h2>6. समस्या कैसे बताएँ</h2>
        <p>Support से संपर्क करें: <SupportContact />। साथ में बताएँ:</p>
        <ul>
          <li>checkout में इस्तेमाल किया गया email address;</li>
          <li>payment या order reference;</li>
          <li>क्या गड़बड़ हुई, ज़रूरत हो तो screenshot के साथ।</li>
        </ul>
        <p>Delivery या file की समस्या दिखते ही बताएँ। Support का response time <L to="/contact">contact page</L> पर publish किया जाएगा।</p>
        <h2>7. Refund कैसे मिलता है</h2>
        <p>मंज़ूर हुए refunds payment provider के ज़रिए मूल payment method में लौटाए जाते हैं। पैसा दिखने में कितना समय लगेगा, यह आपके bank और payment method पर निर्भर करता है।</p>
        <h2>8. कानून के तहत आपके अधिकार</h2>
        <p>इस policy की कोई भी बात लागू कानून, जिसमें Consumer Protection Act, 2019 और उसके तहत बने नियम शामिल हैं, के तहत आपको मिलने वाले किसी उपाय को ख़त्म या सीमित नहीं करती। जहाँ कानून आपको refund, मरम्मत या बदलने का अधिकार देता है, वहाँ वह अधिकार लागू होता है।</p>
      </>
    ),
  },
};

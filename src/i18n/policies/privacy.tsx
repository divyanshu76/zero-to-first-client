import { brand, support } from "@/data/product";
import type { PolicyContent } from "./types";

export const privacy: PolicyContent = {
  en: {
    title: "Privacy Policy",
    description: "What information the ZERO TO FIRST CLIENT website and checkout collect, why, who processes it and how to exercise your rights.",
    summary: () => "This website collects very little. It sets no cookies and runs no analytics or advertising trackers. When checkout opens, the personal information needed to process and deliver your order is collected through the payment provider. This page explains what is collected, why, and your choices.",
    body: ({ Pending, SellerIdentity, SupportContact }) => (
      <>
        <h2>1. Who is responsible</h2>
        <p><SellerIdentity /> Contact: <SupportContact />.</p>
        <h2>2. What this website collects today</h2>
        <ul>
          <li><strong>No cookies, analytics or advertising trackers.</strong> The site doesn&apos;t set cookies or load third-party analytics. Fonts are served from this website, not from a third-party font service. Your language choice is stored only in your own browser (local storage) so the site can remember it.</li>
          <li><strong>Server logs.</strong> Like any website, the hosting provider (Vercel) automatically processes technical request data such as IP address, browser type, the page requested and the time. This is used to deliver the site, keep it secure and diagnose errors.</li>
          <li><strong>No marketing forms.</strong> The site has no newsletter, account or contact form. The only form is checkout (below), and the &ldquo;email me a new link&rdquo; form on the purchase page, which uses your email only to find your order.</li>
          <li><strong>Purchase link in your browser.</strong> After a purchase, your private access link is kept in your browser&apos;s session storage for that tab, so the purchase page keeps working if you reload it. It is cleared when you close the tab.</li>
        </ul>
        <h2>3. What is collected when you buy</h2>
        <p>Purchases are processed by Razorpay, a payment service provider. To complete and deliver your order, the following are collected:</p>
        <ul>
          <li>your name, email address and mobile number, as entered at checkout on this website (the mobile number is passed to Razorpay, which needs it to process the payment);</li>
          <li>the order and transaction references, amount, date and payment status;</li>
          <li>delivery records, such as when the download email was sent and how many times the download was used;</li>
          <li>the network (IP) address of requests, used briefly in memory to limit abuse such as repeated failed attempts.</li>
        </ul>
        <p>Your card, UPI or bank details are entered on the payment provider&apos;s secure page and are handled by the provider under its own privacy policy. They are not stored by this website.</p>
        <h2>4. Why it is used</h2>
        <ul>
          <li>to process your payment and deliver the files you bought;</li>
          <li>to answer support requests and resolve delivery or payment problems;</li>
          <li>to prevent fraud and misuse, such as unauthorised redistribution;</li>
          <li>to keep the records that tax and accounting law requires.</li>
        </ul>
        <p>Your information is not sold. You won&apos;t receive marketing emails unless you separately choose to.</p>
        <h2>5. Who it is shared with</h2>
        <p>Only with service providers that help run the business: Vercel (website hosting), Razorpay (payments), Supabase (the order database and private file storage) and Resend (sending the download email). Each receives only what it needs. Information is also disclosed where the law requires it.</p>
        <h2>6. How long it is kept</h2>
        <p>Order and transaction records are kept for as long as tax, accounting and other legal obligations require. Support correspondence is kept for as long as needed to resolve the request. Server logs are kept according to the hosting provider&apos;s standard retention.</p>
        <h2>7. Security</h2>
        <p>The site is served over HTTPS, and payment details are handled by the payment provider. Paid files are released only after the payment is verified on the server, through download links that expire after 15 minutes, never through a public URL. Access links are stored only in hashed form. No system is perfectly secure, but reasonable measures are taken to protect your information.</p>
        <h2>8. Your rights</h2>
        <p>Subject to applicable law, including India&apos;s Digital Personal Data Protection Act, 2023 as its provisions come into force, you can ask to access, correct or erase your personal information, withdraw consent where processing relies on it, and raise a grievance. Write to <SupportContact />.</p>
        <p>
          Grievance officer: {support.grievanceOfficer ? <strong>{support.grievanceOfficer}</strong> : <Pending>Name of the grievance officer</Pending>}
          {support.grievanceEmail ? <> (<a href={`mailto:${support.grievanceEmail}`}>{support.grievanceEmail}</a>)</> : null}.
        </p>
        <h2>9. Children</h2>
        <p>The product is intended for adults and older students. If you are under 18, please purchase with the involvement of a parent or guardian. Information about children isn&apos;t knowingly collected.</p>
        <h2>10. Changes</h2>
        <p>This policy will be updated when the site&apos;s practices change, for example when checkout or analytics are added. The date at the top shows the latest version. {brand.seller} will not start using cookies or analytics without updating this page first.</p>
      </>
    ),
  },
  hi: {
    title: "Privacy Policy",
    description: "ZERO TO FIRST CLIENT की website और checkout कौन सी जानकारी लेते हैं, क्यों, उसे कौन process करता है और आप अपने अधिकार कैसे इस्तेमाल करें।",
    summary: () => "यह website बहुत कम जानकारी लेती है। यह कोई cookie सेट नहीं करती और कोई analytics या advertising tracker नहीं चलाती। Checkout खुलने पर, आपका order process और deliver करने के लिए ज़रूरी personal जानकारी payment provider के ज़रिए ली जाएगी। यह पेज बताता है कि क्या लिया जाता है, क्यों, और आपके पास क्या विकल्प हैं।",
    body: ({ Pending, SellerIdentity, SupportContact }) => (
      <>
        <h2>1. ज़िम्मेदार कौन है</h2>
        <p><SellerIdentity /> संपर्क: <SupportContact />।</p>
        <h2>2. यह website आज क्या जानकारी लेती है</h2>
        <ul>
          <li><strong>कोई cookies, analytics या advertising trackers नहीं।</strong> Site cookies सेट नहीं करती और third-party analytics load नहीं करती। Fonts इसी website से आते हैं, किसी third-party font service से नहीं। आपकी चुनी हुई भाषा सिर्फ़ आपके अपने browser (local storage) में रखी जाती है, ताकि site उसे याद रख सके।</li>
          <li><strong>Server logs.</strong> हर website की तरह, hosting provider (Vercel) अपने-आप तकनीकी request data process करता है, जैसे IP address, browser का प्रकार, माँगा गया पेज और समय। इसका इस्तेमाल site चलाने, उसे सुरक्षित रखने और errors समझने के लिए होता है।</li>
          <li><strong>कोई marketing forms नहीं।</strong> Site पर कोई newsletter, account या contact form नहीं है। सिर्फ़ checkout form (नीचे देखें) और purchase page का &ldquo;नया link भेजें&rdquo; form है, जो आपके email का इस्तेमाल सिर्फ़ आपका order ढूँढने के लिए करता है।</li>
          <li><strong>आपके browser में purchase link.</strong> ख़रीद के बाद आपका निजी access link उसी tab के लिए आपके browser के session storage में रखा जाता है, ताकि page reload करने पर भी purchase page काम करे। Tab बंद करने पर यह मिट जाता है।</li>
        </ul>
        <h2>3. ख़रीदारी के समय क्या लिया जाता है</h2>
        <p>ख़रीदारी Razorpay नाम के payment service provider से होती है। आपका order पूरा और deliver करने के लिए ये जानकारियाँ ली जाती हैं:</p>
        <ul>
          <li>आपका नाम, email address और mobile number, जैसा आपने इस website के checkout में भरा (mobile number Razorpay को भेजा जाता है, जिसे payment process करने के लिए इसकी ज़रूरत होती है);</li>
          <li>order और transaction references, रकम, तारीख़ और payment की स्थिति;</li>
          <li>delivery records, जैसे download email कब भेजा गया और download कितनी बार इस्तेमाल हुआ;</li>
          <li>requests का network (IP) address, जो बार-बार की ग़लत कोशिशों जैसे दुरुपयोग को रोकने के लिए थोड़े समय तक memory में इस्तेमाल होता है।</li>
        </ul>
        <p>आपके card, UPI या bank details payment provider के सुरक्षित पेज पर भरे जाते हैं और provider अपनी privacy policy के तहत उन्हें संभालता है। यह website उन्हें store नहीं करती।</p>
        <h2>4. इसका इस्तेमाल क्यों होता है</h2>
        <ul>
          <li>आपका payment process करने और ख़रीदी गई files deliver करने के लिए;</li>
          <li>support requests का जवाब देने और delivery या payment की समस्याएँ सुलझाने के लिए;</li>
          <li>धोखाधड़ी और ग़लत इस्तेमाल, जैसे बिना अनुमति files बाँटना, रोकने के लिए;</li>
          <li>tax और accounting कानून के अनुसार ज़रूरी records रखने के लिए।</li>
        </ul>
        <p>आपकी जानकारी बेची नहीं जाती। जब तक आप अलग से न चुनें, आपको marketing emails नहीं भेजे जाएँगे।</p>
        <h2>5. जानकारी किसके साथ साझा होती है</h2>
        <p>सिर्फ़ उन service providers के साथ जो business चलाने में मदद करते हैं, Vercel (website hosting), Razorpay (payments), Supabase (order database और private file storage) और Resend (download email भेजना)। हर एक को सिर्फ़ उतनी जानकारी मिलती है जितनी ज़रूरी है। जहाँ कानून माँगे, वहाँ भी जानकारी दी जाती है।</p>
        <h2>6. जानकारी कितने समय तक रखी जाती है</h2>
        <p>Order और transaction records उतने समय तक रखे जाते हैं जितना tax, accounting और दूसरे कानूनी दायित्वों के लिए ज़रूरी है। Support से हुई बातचीत तब तक रखी जाती है जब तक request सुलझ न जाए। Server logs hosting provider की सामान्य retention के अनुसार रखे जाते हैं।</p>
        <h2>7. सुरक्षा</h2>
        <p>Site HTTPS पर चलती है, और payment details payment provider संभालता है। Paid files सिर्फ़ server पर payment verify होने के बाद मिलती हैं, ऐसे download links से जो 15 मिनट में expire हो जाते हैं, किसी public URL से कभी नहीं। Access links सिर्फ़ hashed रूप में रखे जाते हैं। कोई भी system पूरी तरह सुरक्षित नहीं होता, पर आपकी जानकारी की सुरक्षा के लिए उचित कदम उठाए जाते हैं।</p>
        <h2>8. आपके अधिकार</h2>
        <p>लागू कानून के अधीन, जिसमें भारत का Digital Personal Data Protection Act, 2023 (जैसे-जैसे उसके प्रावधान लागू होते हैं) शामिल है, आप अपनी personal जानकारी देखने, सुधारने या मिटाने को कह सकते हैं, जहाँ processing आपकी सहमति पर आधारित है वहाँ सहमति वापस ले सकते हैं, और शिकायत दर्ज कर सकते हैं। लिखें: <SupportContact />।</p>
        <p>
          Grievance officer: {support.grievanceOfficer ? <strong>{support.grievanceOfficer}</strong> : <Pending>Grievance officer का नाम</Pending>}
          {support.grievanceEmail ? <> (<a href={`mailto:${support.grievanceEmail}`}>{support.grievanceEmail}</a>)</> : null}।
        </p>
        <h2>9. बच्चे</h2>
        <p>यह product वयस्कों और बड़े students के लिए है। अगर आपकी उम्र 18 साल से कम है, तो कृपया माता-पिता या अभिभावक की भागीदारी के साथ ख़रीदें। बच्चों की जानकारी जानबूझकर नहीं ली जाती।</p>
        <h2>10. बदलाव</h2>
        <p>Site के तौर-तरीके बदलने पर, जैसे checkout या analytics जुड़ने पर, यह policy अपडेट की जाएगी। ऊपर दी गई तारीख़ नया संस्करण बताती है। {brand.seller} इस पेज को पहले अपडेट किए बिना cookies या analytics का इस्तेमाल शुरू नहीं करेगा।</p>
      </>
    ),
  },
};

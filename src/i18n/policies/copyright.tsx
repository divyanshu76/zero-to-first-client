import { brand, product } from "@/data/product";
import type { PolicyContent } from "./types";

export const copyright: PolicyContent = {
  en: {
    title: "Copyright and License",
    description: "Who owns ZERO TO FIRST CLIENT, what your license lets you do with the ebook, templates and calculators, and what isn't allowed.",
    summary: () => <>{product.name}, its text, diagrams, templates, calculators and companion files are © 2026 {brand.publisher}. All rights reserved. Buying the product gives you a license to use it; it doesn&apos;t transfer ownership.</>,
    body: ({ L, SupportContact }) => (
      <>
        <h2>Your license</h2>
        <p>When you buy {product.name}, you receive a personal, non-exclusive, non-transferable license to:</p>
        <ul>
          <li>read the ebook and keep copies on your own devices;</li>
          <li>use and edit the templates and calculators in your own business, including for your own client work;</li>
          <li>print pages for your own use.</li>
        </ul>
        <p>No other license is granted unless one is offered to you in writing.</p>
        <h2>What isn&apos;t allowed</h2>
        <ul>
          <li>Copying, reselling or redistributing the ebook or any file, in whole or in part.</li>
          <li>Sharing download links or files with others, or uploading them to any website, drive, group or marketplace.</li>
          <li>Selling the templates or calculators as a separate product, or repackaging the material into another course, ebook or product.</li>
          <li>Removing copyright notices.</li>
        </ul>
        <h2>Quotes and reviews</h2>
        <p>Short quotes may be used for review or education with credit to the source, as the book&apos;s copyright page allows.</p>
        <h2>Third-party material</h2>
        <p>The book&apos;s fonts are used under the SIL Open Font License. Product names mentioned belong to their owners (see the <L to="/disclaimer">Disclaimer</L>). The animated 3D book on this website uses the open-source ThreeUI &ldquo;Bestseller Books&rdquo; component under the MIT License; its notice is published with the site.</p>
        <h2>Reporting misuse</h2>
        <p>If you find the product being shared or sold without permission, please report it to <SupportContact />.</p>
      </>
    ),
  },
  hi: {
    title: "Copyright और License",
    description: "ZERO TO FIRST CLIENT का मालिक कौन है, आपकी license से आप ebook, templates और calculators के साथ क्या कर सकते हैं, और क्या अनुमति नहीं है।",
    summary: () => <>{product.name}, उसका text, diagrams, templates, calculators और साथ वाली files © 2026 {brand.publisher} की हैं। सर्वाधिकार सुरक्षित। Product ख़रीदने से आपको उसे इस्तेमाल करने की license मिलती है; मालिकाना हक़ नहीं।</>,
    body: ({ L, SupportContact }) => (
      <>
        <h2>आपकी license</h2>
        <p>{product.name} ख़रीदने पर आपको एक निजी, non-exclusive और non-transferable license मिलती है, जिससे आप:</p>
        <ul>
          <li>ebook पढ़ सकते हैं और उसकी copies अपने devices पर रख सकते हैं;</li>
          <li>templates और calculators को अपने business में, अपने client काम सहित, इस्तेमाल और edit कर सकते हैं;</li>
          <li>अपने इस्तेमाल के लिए पेज print कर सकते हैं।</li>
        </ul>
        <p>जब तक लिखित में अलग license न दी जाए, कोई और license नहीं दी जाती।</p>
        <h2>क्या अनुमति नहीं है</h2>
        <ul>
          <li>Ebook या किसी भी file को, पूरा या आंशिक रूप से, copy करना, दोबारा बेचना या बाँटना।</li>
          <li>Download links या files दूसरों के साथ share करना, या उन्हें किसी website, drive, group या marketplace पर upload करना।</li>
          <li>Templates या calculators को अलग product के रूप में बेचना, या सामग्री को किसी दूसरे course, ebook या product में दोबारा पैक करना।</li>
          <li>Copyright notices हटाना।</li>
        </ul>
        <h2>Quotes और reviews</h2>
        <p>Review या शिक्षा के लिए छोटे quotes source का credit देकर इस्तेमाल किए जा सकते हैं, जैसा किताब का copyright पेज अनुमति देता है।</p>
        <h2>Third-party सामग्री</h2>
        <p>किताब के fonts SIL Open Font License के तहत इस्तेमाल किए गए हैं। ज़िक्र किए गए product names उनके मालिकों के हैं (<L to="/disclaimer">Disclaimer</L> देखें)। इस website की animated 3D किताब open-source ThreeUI &ldquo;Bestseller Books&rdquo; component का इस्तेमाल MIT License के तहत करती है; उसका notice site के साथ publish किया गया है।</p>
        <h2>ग़लत इस्तेमाल की शिकायत</h2>
        <p>अगर आपको product बिना अनुमति share या बेचा जाता दिखे, तो कृपया बताएँ: <SupportContact />।</p>
      </>
    ),
  },
};

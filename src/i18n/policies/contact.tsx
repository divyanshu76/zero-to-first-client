import { brand, support } from "@/data/product";
import type { PolicyContent } from "./types";

export const contact: PolicyContent = {
  en: {
    title: "Contact and Support",
    description: "How to contact CRAFT & CODE about ZERO TO FIRST CLIENT orders, delivery, files, payments and policy questions.",
    summary: () => "Questions before buying, a missing delivery email, a file that won't open, or a payment you don't recognise: this is where to reach us.",
    body: ({ L, Pending, SellerIdentity }) => (
      <>
        <h2>Support</h2>
        <ul>
          <li>Email: {support.email ? <a href={`mailto:${support.email}`}>{support.email}</a> : <Pending>Support email</Pending>}</li>
          <li>Response time: {support.responseTime ?? <Pending>Committed response time</Pending>}</li>
          <li>Publisher website: <a href={brand.publisherUrl} target="_blank" rel="noopener noreferrer">deadcode.space</a></li>
        </ul>
        <h2>When you write, include</h2>
        <ul>
          <li>the email address used at checkout;</li>
          <li>the payment or order reference, if you have one;</li>
          <li>what you need help with, with a screenshot if relevant.</li>
        </ul>
        <h2>Grievance officer</h2>
        <p>
          {support.grievanceOfficer ? <strong>{support.grievanceOfficer}</strong> : <Pending>Grievance officer&apos;s name</Pending>}
          {" — "}
          {support.grievanceEmail ? <a href={`mailto:${support.grievanceEmail}`}>{support.grievanceEmail}</a> : <Pending>Grievance email</Pending>}
        </p>
        <h2>Business details</h2>
        <p><SellerIdentity /></p>
        <h2>Common questions</h2>
        <ul>
          <li>Delivery and download links: see the <L to="/delivery">Digital Delivery Policy</L>.</li>
          <li>Refunds, faulty files and duplicate charges: see the <L to="/refund">Refund and Cancellation Policy</L>.</li>
          <li>What you can do with the files: see <L to="/copyright">Copyright and License</L>.</li>
        </ul>
      </>
    ),
  },
  hi: {
    title: "संपर्क और Support",
    description: "ZERO TO FIRST CLIENT के orders, delivery, files, payments और policies के बारे में CRAFT & CODE से कैसे संपर्क करें।",
    summary: () => "ख़रीदने से पहले कोई सवाल, delivery email न आना, कोई file न खुलना, या कोई payment जिसे आप नहीं पहचानते: हमसे यहाँ संपर्क कीजिए।",
    body: ({ L, Pending, SellerIdentity }) => (
      <>
        <h2>Support</h2>
        <ul>
          <li>Email: {support.email ? <a href={`mailto:${support.email}`}>{support.email}</a> : <Pending>Support email</Pending>}</li>
          <li>Response time: {support.responseTime ?? <Pending>तय response time</Pending>}</li>
          <li>Publisher की website: <a href={brand.publisherUrl} target="_blank" rel="noopener noreferrer">deadcode.space</a></li>
        </ul>
        <h2>लिखते समय ये बातें शामिल करें</h2>
        <ul>
          <li>checkout में इस्तेमाल किया गया email address;</li>
          <li>payment या order reference, अगर आपके पास है;</li>
          <li>आपको किस चीज़ में मदद चाहिए, ज़रूरत हो तो screenshot के साथ।</li>
        </ul>
        <h2>Grievance officer</h2>
        <p>
          {support.grievanceOfficer ? <strong>{support.grievanceOfficer}</strong> : <Pending>Grievance officer का नाम</Pending>}
          {" — "}
          {support.grievanceEmail ? <a href={`mailto:${support.grievanceEmail}`}>{support.grievanceEmail}</a> : <Pending>Grievance email</Pending>}
        </p>
        <h2>Business की जानकारी</h2>
        <p><SellerIdentity /></p>
        <h2>आम सवाल</h2>
        <ul>
          <li>Delivery और download links: <L to="/delivery">Digital Delivery Policy</L> देखें।</li>
          <li>Refunds, खराब files और दो बार charge होना: <L to="/refund">Refund और Cancellation Policy</L> देखें।</li>
          <li>Files के साथ आप क्या कर सकते हैं: <L to="/copyright">Copyright और License</L> देखें।</li>
        </ul>
      </>
    ),
  },
};
